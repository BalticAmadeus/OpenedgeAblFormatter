import { SyntaxNode, Tree } from "web-tree-sitter";
import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { IFormatter } from "./IFormatter";
import { CodeEdit } from "../model/CodeEdit";
import { FullText } from "../model/FullText";
import { IConfigurationManager } from "../utils/IConfigurationManager";
import { ParseResult } from "../model/ParseResult";
import { FormatterFactory } from "./FormatterFactory";
import { EOL } from "../model/EOL";
import { IDebugManager } from "../providers/IDebugManager";
import { MetamorphicEngine } from "../mtest/MetamorphicEngine";
import { BaseEngineOutput } from "../mtest/EngineParams";
import { bodyBlockKeywords, SyntaxNodeType } from "../model/SyntaxNodeType";
import { ExcludeAnnotationType } from "../model/ExcludeAnnotationType";
import { FormattingEngineMock } from "./FormattingEngineMock";

export class FormattingEngine {
    private numOfCodeEdits: number = 0;
    private skipFormatting = false;

    constructor(
        private parserHelper: IParserHelper,
        private fileIdentifier: FileIdentifier,
        private configurationManager: IConfigurationManager,
        private debugManager: IDebugManager,
        private metamorphicTestingEngine?: MetamorphicEngine<BaseEngineOutput>
    ) {}

    public formatText(
        fulfullTextString: string,
        eol: EOL,
        metemorphicEngineIsEnabled: boolean = false
    ): string {
        const fullText: FullText = {
            text: fulfullTextString,
            eolDelimiter: eol.eolDel,
        };

        const parseResult = this.parserHelper.parse(
            this.fileIdentifier,
            fullText.text
        );

        this.settingsOverride(parseResult);
        const formatters = FormatterFactory.getFormatterInstances(
            this.configurationManager
        );

        // CORRECT APPROACH:
        // 1. Detect special cases on UNFORMATTED code using AST complexity (not column position)
        // 2. Format special cases with two-phase logic
        // 3. RE-SCAN to find updated positions of special cases (line numbers changed!)
        // 4. Format everything else with normal formatting (excluding special cases)

        const assignmentsNeedingTwoPhase = new Set<number>();
        const rootNode = parseResult.tree.rootNode;

        // Helper to recursively find ALL assignments in the tree, not just root children
        const findComplexAssignments = (
            node: SyntaxNode,
            rootChildIndex: number
        ) => {
            if (this.needsTwoPhaseFormatting(node, fullText)) {
                assignmentsNeedingTwoPhase.add(rootChildIndex);
                console.log(
                    `[FormattingEngine.formatText] *** DETECTED complex assignment at root child ${rootChildIndex}, node at ${node.startIndex}`
                );
            }

            // Recursively check all children
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    findComplexAssignments(child, rootChildIndex);
                }
            }
        };

        for (
            let rootChildIndex = 0;
            rootChildIndex < rootNode.childCount;
            rootChildIndex++
        ) {
            const rootChild = rootNode.child(rootChildIndex);
            if (!rootChild) continue;

            // Search this root child and all its descendants
            findComplexAssignments(rootChild, rootChildIndex);
        }

        let newTree = parseResult.tree;

        // STEP 2: If we found complex assignments, format ONLY those using two-phase
        if (assignmentsNeedingTwoPhase.size > 0) {
            console.log(
                `[FormattingEngine.formatText] STEP 2: Formatting ${assignmentsNeedingTwoPhase.size} root children containing complex assignments with two-phase logic`
            );

            // Phase 1: Format leaf nodes only for complex assignments
            this.iterateTreeSelective(
                newTree,
                fullText,
                formatters,
                assignmentsNeedingTwoPhase,
                "split-phase1"
            );

            // Re-parse after phase 1
            newTree = this.parserHelper.parse(
                this.fileIdentifier,
                fullText.text,
                newTree
            ).tree;

            // Phase 2: Format parent nodes for complex assignments
            this.iterateTreeParentNodesSelective(
                newTree,
                fullText,
                formatters,
                assignmentsNeedingTwoPhase
            );

            // Re-parse again
            newTree = this.parserHelper.parse(
                this.fileIdentifier,
                fullText.text,
                newTree
            ).tree;
        }

        // STEP 3: Do normal formatting for everything (excluding already-formatted complex assignments)
        // Reuse assignmentsNeedingTwoPhase as skipRootIndexes - no need to re-scan
        console.log(
            `[FormattingEngine.formatText] STEP 3: Applying normal formatting (excluding ${assignmentsNeedingTwoPhase.size} root children with complex assignments)`
        );
        this.iterateTree(
            newTree,
            fullText,
            formatters,
            false,
            assignmentsNeedingTwoPhase
        );

        // Re-parse for block formatting
        newTree = this.parserHelper.parse(
            this.fileIdentifier,
            fullText.text,
            newTree
        ).tree;

        this.iterateTreeFormatBlocks(newTree, fullText, formatters);

        this.debugManager.fileFormattedSuccessfully(this.numOfCodeEdits);

        if (
            metemorphicEngineIsEnabled &&
            this.metamorphicTestingEngine !== undefined
        ) {
            this.metamorphicTestingEngine.setFormattingEngine(
                new FormattingEngineMock(this.parserHelper)
            );

            const parseResult2 = this.parserHelper.parse(
                this.fileIdentifier,
                fullText.text
            );

            this.metamorphicTestingEngine.addNameInputAndOutputPair(
                this.fileIdentifier.name,
                eol,
                { text: fulfullTextString, tree: parseResult.tree },
                { text: fullText.text, tree: parseResult2.tree }
            );
        }

        return fullText.text;
    }

    // Helper: Find which root child index a node belongs to
    // Note: We compare nodes by type + position since tree-sitter may create multiple objects for same node
    private findRootParentIndex(
        node: SyntaxNode,
        rootNode: SyntaxNode
    ): number {
        const nodesEqual = (a: SyntaxNode, b: SyntaxNode): boolean => {
            return (
                a.type === b.type &&
                a.startIndex === b.startIndex &&
                a.endIndex === b.endIndex
            );
        };

        let current: SyntaxNode | null = node;
        let iterations = 0;
        const maxIterations = 20;

        while (current && iterations < maxIterations) {
            iterations++;

            // Check if current node IS the root (shouldn't happen, but handle it)
            if (nodesEqual(current, rootNode)) {
                // The node itself is root, return -1
                return -1;
            }

            // Check if current node's parent is root (by structural equality)
            if (current.parent && nodesEqual(current.parent, rootNode)) {
                // Find index of current in root's children
                for (let i = 0; i < rootNode.childCount; i++) {
                    const child = rootNode.child(i);
                    if (child && nodesEqual(child, current)) {
                        return i;
                    }
                }
                // If we're here, current.parent matches rootNode but current not found in children
                // This shouldn't happen
                return -1;
            }

            current = current.parent;
        }

        if (iterations >= maxIterations) {
        }

        return -1; // Not found (reached top without finding root as parent)
    }

    // Selective formatting: format only nodes belonging to target assignments
    private iterateTreeSelective(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[],
        targetAssignments: Set<number>,
        mode: "normal" | "split-phase1"
    ) {
        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;

        const rootNode = tree.rootNode;

        let nodeCount = 0;

        while (true) {
            if (cursor.gotoFirstChild()) {
                continue;
            }

            while (true) {
                const node = cursor.currentNode();
                nodeCount++;

                if (nodeCount <= 10) {
                }

                if (node === lastVisitedNode) {
                    if (!cursor.gotoParent()) {
                        cursor.delete();
                        return;
                    }
                    continue;
                }

                // Check if this node belongs to a target assignment
                const rootIndex = this.findRootParentIndex(node, rootNode);
                const belongsToTarget = targetAssignments.has(rootIndex);

                if (nodeCount <= 20) {
                }

                if (node.type === SyntaxNodeType.Annotation) {
                    lastVisitedNode = node;
                    if (cursor.gotoNextSibling()) {
                        break;
                    }
                    if (!cursor.gotoParent()) {
                        cursor.delete();
                        return;
                    }
                    continue;
                }

                // Format only if belongs to target and passes mode filter
                if (
                    belongsToTarget &&
                    !this.skipFormatting &&
                    !bodyBlockKeywords.hasFancy(node.type, "")
                ) {
                    if (mode === "normal") {
                        // Normal mode: format all nodes
                        const codeEdit = this.parse(node, fullText, formatters);
                        if (codeEdit !== undefined) {
                            this.insertChangeIntoTree(tree, codeEdit);
                            this.insertChangeIntoFullText(codeEdit, fullText);
                            this.numOfCodeEdits++;
                        }
                    } else if (mode === "split-phase1") {
                        // Split phase 1: format leaf nodes and top-level assignments only
                        const hasFormattableChildren = node.children.some(
                            (child) =>
                                !bodyBlockKeywords.hasFancy(child.type, "") &&
                                formatters.some((formatter) =>
                                    formatter.match(child)
                                )
                        );

                        const isTopLevelAssignment =
                            (node.type === "assignment" ||
                                node.type === "variable_assignment" ||
                                node.type === "assign_statement") &&
                            (node.parent?.type === "variable_assignment" ||
                                node.parent?.type === "assign_statement" ||
                                node.parent?.type === "source_code");

                        if (!hasFormattableChildren || isTopLevelAssignment) {
                            const codeEdit = this.parse(
                                node,
                                fullText,
                                formatters
                            );
                            if (codeEdit !== undefined) {
                                if (isTopLevelAssignment) {
                                } else {
                                }
                                this.insertChangeIntoTree(tree, codeEdit);
                                this.insertChangeIntoFullText(
                                    codeEdit,
                                    fullText
                                );
                                this.numOfCodeEdits++;
                            }
                        } else {
                        }
                    }
                }

                lastVisitedNode = node;

                if (cursor.gotoNextSibling()) {
                    break;
                }
                if (!cursor.gotoParent()) {
                    cursor.delete();
                    return;
                }
            }
        }
    }

    private iterateTree(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[],
        leafNodesOnly: boolean = false,
        excludeRootIndexes: Set<number> = new Set()
    ) {
        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;
        const rootNode = tree.rootNode;

        while (true) {
            const currentNode = cursor.currentNode();

            if (cursor.gotoFirstChild()) {
                continue;
            }
            // Process the current node (this is a leaf node or a node with no unvisited children)
            while (true) {
                const node = cursor.currentNode();

                // Skip the node if it was the last one visited
                if (node === lastVisitedNode) {
                    if (!cursor.gotoParent()) {
                        cursor.delete(); // Clean up the cursor
                        return; // Exit if there are no more nodes to visit
                    }
                    continue; // Continue with the parent node
                }

                if (node.type === SyntaxNodeType.Annotation) {
                    const children = node.children;
                    const keywordNode = children[1];
                    const annotationName = keywordNode?.toString();

                    if (
                        annotationName ===
                        '("' +
                            ExcludeAnnotationType.excludeStartAnnotation +
                            '")'
                    ) {
                        this.skipFormatting = true;
                    } else if (
                        annotationName ===
                        '("' + ExcludeAnnotationType.excludeEndAnnotation + '")'
                    ) {
                        this.skipFormatting = false;

                        const parent = cursor.currentNode().parent;
                        if (parent && cursor.gotoParent()) {
                            cursor.gotoNextSibling();
                        }
                    }

                    lastVisitedNode = node;

                    if (cursor.gotoNextSibling()) {
                        break;
                    }

                    if (!cursor.gotoParent()) {
                        cursor.delete();
                        return;
                    }

                    continue;
                }

                // Parse and process the current node (POST-ORDER)
                if (
                    !this.skipFormatting &&
                    !bodyBlockKeywords.hasFancy(node.type, "")
                ) {
                    // Check if this node belongs to an excluded root index
                    const rootIndex = this.findRootParentIndex(node, rootNode);
                    const shouldSkip = excludeRootIndexes.has(rootIndex);

                    if (shouldSkip) {
                        // Skip formatting for nodes that belong to special case assignments
                        // These were already formatted with two-phase logic
                    } else if (leafNodesOnly) {
                        // SPLIT LOGIC: Format in two groups
                        const hasFormattableChildren = node.children.some(
                            (child) =>
                                !bodyBlockKeywords.hasFancy(child.type, "") &&
                                formatters.some((formatter) =>
                                    formatter.match(child)
                                )
                        );

                        // Group 1: Leaf nodes (no formattable children)
                        // Group 2: Top-level assignment/variable_assignment nodes (to remove whitespace)
                        const isTopLevelAssignment =
                            (node.type === "assignment" ||
                                node.type === "variable_assignment" ||
                                node.type === "assign_statement") &&
                            (node.parent?.type === "variable_assignment" ||
                                node.parent?.type === "assign_statement" ||
                                node.parent?.type === "source_code");

                        if (!hasFormattableChildren || isTopLevelAssignment) {
                            const codeEdit = this.parse(
                                node,
                                fullText,
                                formatters
                            );

                            if (codeEdit !== undefined) {
                                if (isTopLevelAssignment) {
                                } else {
                                }
                                this.insertChangeIntoTree(tree, codeEdit);
                                this.insertChangeIntoFullText(
                                    codeEdit,
                                    fullText
                                );
                                this.numOfCodeEdits++;
                            }
                        } else {
                        }
                    } else {
                        // NORMAL LOGIC: Format all nodes
                        const codeEdit = this.parse(node, fullText, formatters);

                        if (codeEdit !== undefined) {
                            this.insertChangeIntoTree(tree, codeEdit);
                            this.insertChangeIntoFullText(codeEdit, fullText);
                            this.numOfCodeEdits++;
                        }
                    }
                }

                // Mark the current node as the last visited node
                lastVisitedNode = node;

                // Try to move to the next sibling
                if (cursor.gotoNextSibling()) {
                    break; // Move to the next sibling if it exists
                }
                // If no more siblings, move up to the parent node
                if (!cursor.gotoParent()) {
                    cursor.delete(); // Clean up the cursor
                    return; // Exit if there are no more nodes to visit
                }
            }
        }
    }

    // SECOND PASS: Format parent nodes after leaf nodes are stable
    private iterateTreeParentNodes(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[]
    ) {
        // CRITICAL: Collect all edits first, then apply them
        // Applying tree.edit() during iteration corrupts node positions
        const collectedEdits: Array<{
            node: SyntaxNode;
            edit: CodeEdit | CodeEdit[];
        }> = [];

        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;
        let done = false;

        while (!done) {
            const currentNode = cursor.currentNode();

            if (cursor.gotoFirstChild()) {
                continue;
            }
            // Process the current node (this is a leaf node or a node with no unvisited children)
            while (true) {
                const node = cursor.currentNode();

                // Skip the node if it was the last one visited
                if (node === lastVisitedNode) {
                    if (!cursor.gotoParent()) {
                        cursor.delete();
                        done = true;
                        break;
                    }
                    continue;
                }

                // Skip annotation handling in second pass
                if (node.type === SyntaxNodeType.Annotation) {
                    lastVisitedNode = node;

                    if (cursor.gotoNextSibling()) {
                        break;
                    }

                    if (!cursor.gotoParent()) {
                        cursor.delete();
                        done = true;
                        break;
                    }

                    continue;
                }

                // Parse and process the current node (POST-ORDER)
                // SECOND PASS: Only format PARENT nodes (have formattable children)
                if (
                    !this.skipFormatting &&
                    !bodyBlockKeywords.hasFancy(node.type, "")
                ) {
                    // Skip assignment and variable_assignment nodes in parent phase
                    // These are top-level containers that shouldn't be reformatted after their children
                    if (
                        node.type === "assignment" ||
                        node.type === "variable_assignment"
                    ) {
                        lastVisitedNode = node;
                        if (cursor.gotoNextSibling()) {
                            break;
                        }
                        if (!cursor.gotoParent()) {
                            cursor.delete();
                            done = true;
                            break;
                        }
                        continue;
                    }

                    // Check if this node is a parent (has children that would be formatted)
                    const hasFormattableChildren = node.children.some(
                        (child) =>
                            !bodyBlockKeywords.hasFancy(child.type, "") &&
                            formatters.some((formatter) =>
                                formatter.match(child)
                            )
                    );

                    // Only process parent nodes in second pass
                    if (hasFormattableChildren) {
                        const codeEdit = this.parse(node, fullText, formatters);

                        if (codeEdit !== undefined) {
                            // DON'T apply yet - just collect!
                            collectedEdits.push({ node, edit: codeEdit });
                        }
                    }
                }

                // Mark the current node as the last visited node
                lastVisitedNode = node;

                // Try to move to the next sibling
                if (cursor.gotoNextSibling()) {
                    break;
                }
                // If no more siblings, move up to the parent node
                if (!cursor.gotoParent()) {
                    cursor.delete();
                    done = true;
                    break;
                }
            }
        }

        // Now apply all collected edits IN REVERSE ORDER
        // This is critical: edits must be applied from end to start of file
        // so that earlier positions remain valid as we apply later edits

        // Deduplicate: remove edits that are contained within other edits
        // Keep only the outermost edit for any overlapping region
        const deduplicatedEdits: typeof collectedEdits = [];
        for (let i = 0; i < collectedEdits.length; i++) {
            const currentEdit = collectedEdits[i];
            const currentStart = Array.isArray(currentEdit.edit)
                ? currentEdit.edit[0].edit.startIndex
                : currentEdit.edit.edit.startIndex;
            const currentEnd = Array.isArray(currentEdit.edit)
                ? currentEdit.edit[currentEdit.edit.length - 1].edit.oldEndIndex
                : currentEdit.edit.edit.oldEndIndex;

            let isContainedByAnother = false;
            for (let j = 0; j < collectedEdits.length; j++) {
                if (i === j) continue;

                const otherEdit = collectedEdits[j];
                const otherStart = Array.isArray(otherEdit.edit)
                    ? otherEdit.edit[0].edit.startIndex
                    : otherEdit.edit.edit.startIndex;
                const otherEnd = Array.isArray(otherEdit.edit)
                    ? otherEdit.edit[otherEdit.edit.length - 1].edit.oldEndIndex
                    : otherEdit.edit.edit.oldEndIndex;

                // Check if current edit is fully contained within other edit
                if (
                    otherStart <= currentStart &&
                    otherEnd >= currentEnd &&
                    (otherStart < currentStart || otherEnd > currentEnd)
                ) {
                    isContainedByAnother = true;
                    break;
                }
            }

            if (!isContainedByAnother) {
                deduplicatedEdits.push(currentEdit);
            }
        }

        // Sort by startIndex descending (end of file first)
        deduplicatedEdits.sort((a, b) => {
            const aStart = Array.isArray(a.edit)
                ? a.edit[0].edit.startIndex
                : a.edit.edit.startIndex;
            const bStart = Array.isArray(b.edit)
                ? b.edit[0].edit.startIndex
                : b.edit.edit.startIndex;
            return bStart - aStart; // Descending order
        });

        for (const { node, edit } of deduplicatedEdits) {
            const startPos = Array.isArray(edit)
                ? edit[0].edit.startIndex
                : edit.edit.startIndex;
            this.insertChangeIntoTree(tree, edit);
            this.insertChangeIntoFullText(edit, fullText);
            this.numOfCodeEdits++;
        }
    }

    private iterateTreeParentNodesSelective(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[],
        targetAssignments: Set<number>
    ) {
        // CRITICAL: Collect all edits first, then apply them
        // Applying tree.edit() during iteration corrupts node positions
        const collectedEdits: Array<{
            node: SyntaxNode;
            edit: CodeEdit | CodeEdit[];
        }> = [];
        const rootNode = tree.rootNode;

        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;
        let done = false;

        while (!done) {
            const currentNode = cursor.currentNode();

            if (cursor.gotoFirstChild()) {
                continue;
            }
            // Process the current node (this is a leaf node or a node with no unvisited children)
            while (true) {
                const node = cursor.currentNode();

                // Skip the node if it was the last one visited
                if (node === lastVisitedNode) {
                    if (!cursor.gotoParent()) {
                        cursor.delete();
                        done = true;
                        break;
                    }
                    continue;
                }

                // Skip annotation handling in second pass
                if (node.type === SyntaxNodeType.Annotation) {
                    lastVisitedNode = node;

                    if (cursor.gotoNextSibling()) {
                        break;
                    }

                    if (!cursor.gotoParent()) {
                        cursor.delete();
                        done = true;
                        break;
                    }

                    continue;
                }

                // Check if this node belongs to a target assignment
                const rootIndex = this.findRootParentIndex(node, rootNode);
                const belongsToTarget = targetAssignments.has(rootIndex);

                // Parse and process the current node (POST-ORDER)
                // SECOND PASS: Only format PARENT nodes (have formattable children) that belong to target assignments
                if (
                    belongsToTarget &&
                    !this.skipFormatting &&
                    !bodyBlockKeywords.hasFancy(node.type, "")
                ) {
                    // Skip assignment and variable_assignment nodes in parent phase
                    // These are top-level containers that shouldn't be reformatted after their children
                    if (
                        node.type === "assignment" ||
                        node.type === "variable_assignment"
                    ) {
                        lastVisitedNode = node;
                        if (cursor.gotoNextSibling()) {
                            break;
                        }
                        if (!cursor.gotoParent()) {
                            cursor.delete();
                            done = true;
                            break;
                        }
                        continue;
                    }

                    // Check if this node is a parent (has children that would be formatted)
                    const hasFormattableChildren = node.children.some(
                        (child) =>
                            !bodyBlockKeywords.hasFancy(child.type, "") &&
                            formatters.some((formatter) =>
                                formatter.match(child)
                            )
                    );

                    // Only process parent nodes in second pass
                    if (hasFormattableChildren) {
                        const codeEdit = this.parse(node, fullText, formatters);

                        if (codeEdit !== undefined) {
                            // DON'T apply yet - just collect!
                            collectedEdits.push({ node, edit: codeEdit });
                        }
                    }
                }

                // Mark the current node as the last visited node
                lastVisitedNode = node;

                // Try to move to the next sibling
                if (cursor.gotoNextSibling()) {
                    break;
                }
                // If no more siblings, move up to the parent node
                if (!cursor.gotoParent()) {
                    cursor.delete();
                    done = true;
                    break;
                }
            }
        }

        // Now apply all collected edits IN REVERSE ORDER
        // This is critical: edits must be applied from end to start of file
        // so that earlier positions remain valid as we apply later edits

        // Deduplicate: remove edits that are contained within other edits
        // Keep only the outermost edit for any overlapping region
        const deduplicatedEdits: typeof collectedEdits = [];
        for (let i = 0; i < collectedEdits.length; i++) {
            const currentEdit = collectedEdits[i];
            const currentStart = Array.isArray(currentEdit.edit)
                ? currentEdit.edit[0].edit.startIndex
                : currentEdit.edit.edit.startIndex;
            const currentEnd = Array.isArray(currentEdit.edit)
                ? currentEdit.edit[currentEdit.edit.length - 1].edit.oldEndIndex
                : currentEdit.edit.edit.oldEndIndex;

            let isContainedByAnother = false;
            for (let j = 0; j < collectedEdits.length; j++) {
                if (i === j) continue;

                const otherEdit = collectedEdits[j];
                const otherStart = Array.isArray(otherEdit.edit)
                    ? otherEdit.edit[0].edit.startIndex
                    : otherEdit.edit.edit.startIndex;
                const otherEnd = Array.isArray(otherEdit.edit)
                    ? otherEdit.edit[otherEdit.edit.length - 1].edit.oldEndIndex
                    : otherEdit.edit.edit.oldEndIndex;

                // Check if current edit is fully contained within other edit
                if (
                    otherStart <= currentStart &&
                    otherEnd >= currentEnd &&
                    (otherStart < currentStart || otherEnd > currentEnd)
                ) {
                    isContainedByAnother = true;
                    break;
                }
            }

            if (!isContainedByAnother) {
                deduplicatedEdits.push(currentEdit);
            }
        }

        // Sort by startIndex descending (end of file first)
        deduplicatedEdits.sort((a, b) => {
            const aStart = Array.isArray(a.edit)
                ? a.edit[0].edit.startIndex
                : a.edit.edit.startIndex;
            const bStart = Array.isArray(b.edit)
                ? b.edit[0].edit.startIndex
                : b.edit.edit.startIndex;
            return bStart - aStart; // Descending order
        });

        for (const { node, edit } of deduplicatedEdits) {
            const startPos = Array.isArray(edit)
                ? edit[0].edit.startIndex
                : edit.edit.startIndex;
            this.insertChangeIntoTree(tree, edit);
            this.insertChangeIntoFullText(edit, fullText);
            this.numOfCodeEdits++;
        }
    }

    /*
        This method formats solely the indentation of blocks, therefore, the number of lines remains unchanged.
    */
    private iterateTreeFormatBlocks(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[]
    ) {
        let cursor = tree.walk(); // Initialize the cursor at the root node
        let lastVisitedNode: SyntaxNode | null = null;

        while (true) {
            // Try to go as deep as possible
            if (cursor.gotoFirstChild()) {
                continue; // Move to the first child if possible
            }

            // Process the current node (this is a leaf node or a node with no unvisited children)
            while (true) {
                const node = cursor.currentNode();

                // Skip the node if it was the last one visited
                if (node === lastVisitedNode) {
                    if (!cursor.gotoParent()) {
                        cursor.delete(); // Clean up the cursor
                        return; // Exit if there are no more nodes to visit
                    }
                    continue; // Continue with the parent node
                }

                if (node.type === SyntaxNodeType.Annotation) {
                    const children = node.children;
                    const keywordNode = children[1];
                    const annotationName = keywordNode?.toString();

                    if (
                        annotationName ===
                        '("' +
                            ExcludeAnnotationType.excludeStartAnnotation +
                            '")'
                    ) {
                        this.skipFormatting = true;
                    } else if (
                        annotationName ===
                        '("' + ExcludeAnnotationType.excludeEndAnnotation + '")'
                    ) {
                        this.skipFormatting = false;
                    }

                    lastVisitedNode = node;

                    // Try to move to the next sibling
                    if (cursor.gotoNextSibling()) {
                        break; // Move to the next sibling if it exists
                    }

                    // If no more siblings, move up to the parent node
                    if (!cursor.gotoParent()) {
                        cursor.delete(); // Clean up the cursor
                        return; // Exit if there are no more nodes to visit
                    }

                    continue;
                }

                if (
                    !this.skipFormatting &&
                    bodyBlockKeywords.hasFancy(node.type, "")
                ) {
                    const codeEdit = this.parse(node, fullText, formatters);
                    if (codeEdit !== undefined) {
                        this.insertChangeIntoTree(tree, codeEdit);
                        this.insertChangeIntoFullText(codeEdit, fullText);
                        this.numOfCodeEdits++;
                    }
                }

                // Mark the current node as the last visited node
                lastVisitedNode = node;

                // Try to move to the next sibling
                if (cursor.gotoNextSibling()) {
                    break; // Move to the next sibling if it exists
                }

                // If no more siblings, move up to the parent node
                if (!cursor.gotoParent()) {
                    cursor.delete(); // Clean up the cursor
                    return; // Exit if there are no more nodes to visit
                }
            }
        }
    }

    private needsTwoPhaseFormatting(
        node: SyntaxNode,
        fullText: FullText
    ): boolean {
        // Only check assign_statement and variable_assignment nodes
        if (
            node.type !== "assign_statement" &&
            node.type !== "variable_assignment"
        ) {
            return false;
        }

        // CRITICAL: Skip multi-field ASSIGN statements (they have multiple variable_assignment children)
        // We only want to detect single-line assignments like: iInstance = (IF ... THEN ... ELSE 1) + 1
        if (node.type === "assign_statement") {
            let variableAssignmentCount = 0;
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child && child.type === "variable_assignment") {
                    variableAssignmentCount++;
                    if (variableAssignmentCount > 1) {
                        // This is a multi-field ASSIGN block, skip it
                        return false;
                    }
                }
            }
        }

        // SPECIFIC DETECTION: Four conditions must be met:
        // 1. Assignment operator column position > 30
        // 2. Comparison operator AND ternary_expression INSIDE parenthesized expression
        // 3. The parenthesized expression is part of an additive_expression (e.g., "(...) + 1")
        // 4. The EXPRESSION COMPONENTS must have both start AND end on the SAME LINE
        //    Note: ASSIGN keyword and variable name can be on different lines

        let assignmentOperatorColumn = 0;
        let hasComparisonInParenthesized = false;
        let hasTernaryInParenthesized = false;
        let parenthesizedExpressionStartLine = -1;
        let parenthesizedExpressionEndLine = -1;
        let additiveExpressionStartLine = -1;
        let additiveExpressionEndLine = -1;

        // Find assignment operator column position
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child && child.type === "assignment") {
                for (let j = 0; j < child.childCount; j++) {
                    const grandChild = child.child(j);
                    if (
                        grandChild &&
                        grandChild.type === "assignment_operator"
                    ) {
                        assignmentOperatorColumn =
                            grandChild.endPosition.column;
                        break;
                    }
                }
            }
        }

        // Check for the pattern: parenthesized_expression with comparison AND ternary inside, within additive_expression
        const checkPattern = (
            n: SyntaxNode,
            insideParenthesized: boolean = false
        ): void => {
            // If we're inside a parenthesized expression, check for comparison operators and ternary expressions
            if (insideParenthesized) {
                if (
                    n.type === "comparison_expression" ||
                    n.type === "relational_expression" ||
                    n.type === "equality_expression"
                ) {
                    hasComparisonInParenthesized = true;
                }
                if (n.type === "ternary_expression") {
                    hasTernaryInParenthesized = true;
                }
            }

            // Check if this is a parenthesized_expression that's a child of additive_expression
            if (n.type === "parenthesized_expression" && n.parent) {
                if (n.parent.type === "additive_expression") {
                    parenthesizedExpressionStartLine = n.startPosition.row;
                    parenthesizedExpressionEndLine = n.endPosition.row;
                    additiveExpressionStartLine = n.parent.startPosition.row;
                    additiveExpressionEndLine = n.parent.endPosition.row;
                }
            }

            // Track when we enter/exit parenthesized expressions
            const nowInParenthesized =
                insideParenthesized || n.type === "parenthesized_expression";

            for (let i = 0; i < n.childCount; i++) {
                const child = n.child(i);
                if (child) {
                    checkPattern(child, nowInParenthesized);
                }
            }
        };

        checkPattern(node);

        const threshold = 30;
        // Check that each expression component starts and ends on the same line
        const parenthesizedOnSingleLine =
            parenthesizedExpressionStartLine !== -1 &&
            parenthesizedExpressionStartLine === parenthesizedExpressionEndLine;
        const additiveOnSingleLine =
            additiveExpressionStartLine !== -1 &&
            additiveExpressionStartLine === additiveExpressionEndLine;
        const bothOnSameLine =
            parenthesizedOnSingleLine &&
            additiveOnSingleLine &&
            parenthesizedExpressionStartLine === additiveExpressionStartLine;

        const needsTwoPhase =
            assignmentOperatorColumn > threshold &&
            hasComparisonInParenthesized &&
            hasTernaryInParenthesized &&
            bothOnSameLine;

        if (needsTwoPhase) {
            const lineNumber = node.startPosition.row + 1; // Tree-sitter uses 0-based row numbers
            console.log(
                `[needsTwoPhaseFormatting] DETECTED at line ${lineNumber} (position ${node.startIndex}): operator column ${assignmentOperatorColumn} > ${threshold}, expression on single line (${parenthesizedExpressionStartLine}), comparison + ternary in parenthesized, in additive_expression`
            );
        }

        return needsTwoPhase;
    }

    private insertChangeIntoTree(
        tree: Tree,
        codeEdit: CodeEdit | CodeEdit[]
    ): void {
        if (Array.isArray(codeEdit)) {
            codeEdit.forEach((oneCodeEdit, index) => {
                tree.edit(oneCodeEdit.edit);
            });
        } else {
            tree.edit(codeEdit.edit);
        }
    }

    private logTree(node: SyntaxNode): string[] {
        let arr: string[] = [];
        arr.push(node.toString());
        node.children.forEach((child) => {
            arr = arr.concat(this.logTree(child));
        });

        return arr;
    }

    private insertChangeIntoFullText(
        codeEdit: CodeEdit | CodeEdit[],
        fullText: FullText
    ): void {
        if (Array.isArray(codeEdit)) {
            // CRITICAL: Sort edits in REVERSE order (end to beginning) before applying
            // This ensures that earlier edits don't invalidate the positions of later edits
            const sortedEdits = [...codeEdit].sort(
                (a, b) => b.edit.startIndex - a.edit.startIndex
            );

            for (const oneCodeEdit of sortedEdits) {
                const before = fullText.text.slice(
                    0,
                    oneCodeEdit.edit.startIndex
                );
                const after = fullText.text.slice(oneCodeEdit.edit.oldEndIndex);
                fullText.text = before + oneCodeEdit.text + after;
            }
        } else {
            // Log edits that affect the problematic ASSIGN region (around 10850)
            // if (codeEdit.edit.startIndex < 11000 && codeEdit.edit.oldEndIndex > 10800) {
            // }
            const before = fullText.text.slice(0, codeEdit.edit.startIndex);
            const after = fullText.text.slice(codeEdit.edit.oldEndIndex);
            fullText.text = before + codeEdit.text + after;
            // if (codeEdit.edit.startIndex < 11000 && codeEdit.edit.oldEndIndex > 10800) {
            // }
        }
    }

    private parse(
        node: SyntaxNode,
        fullText: FullText,
        formatters: IFormatter[]
    ): CodeEdit | CodeEdit[] | undefined {
        let result: CodeEdit | CodeEdit[] | undefined;

        formatters.some((formatter) => {
            if (formatter.match(node)) {
                // Log formatters that touch the problem area
                // if (node.startIndex < 11000 && node.endIndex > 10800) {
                // }

                result = formatter.parse(node, fullText);

                // if (result && node.startIndex < 11000 && node.endIndex > 10800) {
                //     const editInfo = Array.isArray(result) ? result[0] : result;
                // }

                return true;
            }
            return false;
        });

        return result;
    }

    private settingsOverride(parseResult: ParseResult) {
        const settingsString = this.getOverrideSettingsComment(
            parseResult.tree.rootNode
        );

        if (settingsString !== undefined) {
            this.configurationManager.setOverridingSettings(
                JSON.parse(settingsString)
            );
        }
    }

    public getOverrideSettingsComment(node: SyntaxNode): string | undefined {
        const firstChildNode = node.child(0);

        if (firstChildNode === null) {
            return undefined;
        }

        if (!firstChildNode.text.includes("formatterSettingsOverride")) {
            return undefined;
        }

        const secondChildNode = node.child(1);
        if (secondChildNode === null) {
            return undefined;
        }

        return secondChildNode.text.substring(
            2,
            secondChildNode.text.length - 2
        );
    }

    private compare(
        node1: SyntaxNode,
        node2: SyntaxNode,
        formatters: IFormatter[]
    ): boolean {
        const matchingFormatter = formatters.find((formatter) =>
            formatter.match(node1)
        );

        let result: boolean;

        if (matchingFormatter) {
            result = matchingFormatter.compare(node1, node2);
        } else {
            // Select the default formatter if no match is found
            const defaultFormatter = formatters.find(
                (f) =>
                    (f.constructor as any).formatterLabel ===
                    "defaultFormatting"
            );
            if (defaultFormatter) {
                result = defaultFormatter.compare(node1, node2);
            } else {
                result = false;
            }
        }

        if (!result) {
            return false;
        }

        if (node1.childCount > 0) {
            for (let i = 0; i < node1.childCount; i++) {
                const child1 = node1.child(i)!;
                const child2 = node2.child(i)!;

                if (!this.compare(child1, child2, formatters)) {
                    return false;
                }
            }
        }

        return true;
    }

    public isAstEqual(tree1: Tree, tree2: Tree): boolean | undefined {
        const formatters = FormatterFactory.getFormatterInstances(
            this.configurationManager
        );

        return this.compare(tree1.rootNode, tree2.rootNode, formatters);
    }
}
