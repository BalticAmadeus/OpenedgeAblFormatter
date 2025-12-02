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
        console.log(`[FormattingEngine.formatText] START - Input length: ${fulfullTextString.length}`);
        const fullText: FullText = {
            text: fulfullTextString,
            eolDelimiter: eol.eolDel,
        };

        const parseResult = this.parserHelper.parse(
            this.fileIdentifier,
            fulfullTextString
        );

        this.settingsOverride(parseResult);
        const formatters = FormatterFactory.getFormatterInstances(
            this.configurationManager
        );

        console.log(`[FormattingEngine.formatText] Before iterateTree, text length: ${fullText.text.length}`);
        
        // CRITICAL FIX: Detection phase must run AFTER phase 1 formatting
        // The column position check only makes sense on formatted code with proper indentation
        // Original code may have column < 30, but after indentation it becomes > 30
        // TODO: Move detection phase to run between phase 1 and phase 2
        const assignmentsNeedingSplitLogic = new Set<number>();
        const normalAssignments = new Set<number>();
        
        const rootNode = parseResult.tree.rootNode;
        console.log(`[FormattingEngine.formatText] Root has ${rootNode.childCount} children`);
        
        // Helper function to check for parenthesized_expression in tree
        const checkForParenthesized = (node: any): boolean => {
            if (node.type === 'parenthesized_expression') return true;
            for (let k = 0; k < node.childCount; k++) {
                const child = node.child(k);
                if (child && checkForParenthesized(child)) {
                    return true;
                }
            }
            return false;
        };
        
        // Helper function to recursively find all assignments in a subtree
        const findAssignmentsInNode = (node: any, rootChildIndex: number, depth: number = 0) => {
            // Check if this node is an assignment
            if (node.type === 'variable_assignment' || node.type === 'assign_statement') {
                let assignmentOperatorColumn = 0;
                let hasParenthesizedExpression = false;
                
                // Only evaluate split-logic criteria for TOP-LEVEL assignments (direct children of root children)
                // Nested assignments within functions/blocks shouldn't trigger split-logic for the entire root child
                const isTopLevelAssignment = (depth === 0 || depth === 1);
                
                if (isTopLevelAssignment) {
                    for (let i = 0; i < node.childCount; i++) {
                        const child = node.child(i);
                        if (child && child.type === 'assignment') {
                            console.log(`${"  ".repeat(depth)}[findAssignments] Found assignment node`);
                            
                            // Check for parenthesized_expression
                            if (checkForParenthesized(child)) {
                                hasParenthesizedExpression = true;
                                console.log(`${"  ".repeat(depth)}[findAssignments] *** HAS PARENTHESIZED ***`);
                            }
                            
                            for (let j = 0; j < child.childCount; j++) {
                                const grandChild = child.child(j);
                                if (grandChild && grandChild.type === 'assignment_operator') {
                                    assignmentOperatorColumn = grandChild.endPosition.column;
                                    console.log(`${"  ".repeat(depth)}[findAssignments] *** OPERATOR at column ${assignmentOperatorColumn} ***`);
                                    break;
                                }
                            }
                        }
                    }
                    
                    const threshold = 30;
                    const needsSplitLogic = assignmentOperatorColumn > threshold && hasParenthesizedExpression;
                    
                    if (needsSplitLogic) {
                        assignmentsNeedingSplitLogic.add(rootChildIndex);
                        if (rootChildIndex === 21 || rootChildIndex === 25) {
                            console.log(`[FormattingEngine.formatText] *** MARKING ROOT CHILD ${rootChildIndex} for split logic: operator column ${assignmentOperatorColumn} > ${threshold} AND has parenthesized_expression`);
                        }
                    } else if (node.type === 'variable_assignment' || node.type === 'assign_statement') {
                        normalAssignments.add(rootChildIndex);
                    }
                }
            }
            
            // Recursively check all children
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    findAssignmentsInNode(child, rootChildIndex, depth + 1);
                }
            }
        };
        
        // Scan each root child and all its descendants
        for (let rootChildIndex = 0; rootChildIndex < rootNode.childCount; rootChildIndex++) {
            const rootChild = rootNode.child(rootChildIndex);
            if (!rootChild) continue;
            
            // Recursively find all assignments in this root child
            findAssignmentsInNode(rootChild, rootChildIndex);
        }
        
        console.log(`[FormattingEngine.formatText] Split-logic assignments: ${Array.from(assignmentsNeedingSplitLogic).join(', ') || 'none'}`);
        
        // Phase 1: Format leaf nodes and top-level assignments for split-logic assignments
        if (assignmentsNeedingSplitLogic.size > 0) {
            console.log(`[FormattingEngine.formatText] PHASE 1 (split-logic): Formatting leaf nodes for ${assignmentsNeedingSplitLogic.size} assignments`);
            this.iterateTreeSelective(parseResult.tree, fullText, formatters, assignmentsNeedingSplitLogic, 'split-phase1');
        }
        
        // Phase 1: Format all normal assignments (full formatting)
        if (normalAssignments.size > 0) {
            console.log(`[FormattingEngine.formatText] PHASE 1 (normal): Formatting ${normalAssignments.size} normal assignments`);
            this.iterateTreeSelective(parseResult.tree, fullText, formatters, normalAssignments, 'normal');
        }

        // Re-parse after phase 1 to get fresh tree with updated positions
        let newTree = this.parserHelper.parse(
            this.fileIdentifier,
            fullText.text,
            parseResult.tree
        ).tree;

        // Phase 2: Format parent nodes for split-logic assignments only
        if (assignmentsNeedingSplitLogic.size > 0) {
            console.log(`[FormattingEngine.formatText] PHASE 2 (split-logic): Formatting parent nodes for ${assignmentsNeedingSplitLogic.size} assignments`);
            this.iterateTreeParentNodesSelective(newTree, fullText, formatters, assignmentsNeedingSplitLogic);
        }

        // Re-parse for block formatting
        newTree = this.parserHelper.parse(
            this.fileIdentifier,
            fullText.text,
            newTree
        ).tree;

        this.iterateTreeFormatBlocks(newTree, fullText, formatters);

        this.debugManager.fileFormattedSuccessfully(this.numOfCodeEdits);
        console.log(`[FormattingEngine.formatText] COMPLETE - Final length: ${fullText.text.length}, edits: ${this.numOfCodeEdits}`);

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

    private collectEdits(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[]
    ): Array<{ codeEdit: CodeEdit | CodeEdit[]; startIndex: number }> {
        const edits: Array<{ codeEdit: CodeEdit | CodeEdit[]; startIndex: number }> = [];
        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;

        while (true) {
            if (cursor.gotoFirstChild()) {
                continue;
            }
            
            while (true) {
                const node = cursor.currentNode();

                if (node === lastVisitedNode) {
                    if (!cursor.gotoParent()) {
                        cursor.delete();
                        return edits;
                    }
                    continue;
                }

                if (node.type === SyntaxNodeType.Annotation) {
                    const children = node.children;
                    const keywordNode = children[1];
                    const annotationName = keywordNode?.toString();

                    if (annotationName?.toLowerCase() === "noformat") {
                        this.skipFormatting = true;
                    } else if (annotationName?.toLowerCase() === "formatoff") {
                        this.skipFormatting = true;
                    } else if (annotationName?.toLowerCase() === "formaton") {
                        this.skipFormatting = false;
                    }

                    continue;
                }

                if (
                    !this.skipFormatting &&
                    !bodyBlockKeywords.hasFancy(node.type, "")
                ) {
                    const codeEdit = this.parse(node, fullText, formatters);

                    if (codeEdit !== undefined) {
                        const editInfo = Array.isArray(codeEdit) ? codeEdit[0] : codeEdit;
                        edits.push({
                            codeEdit,
                            startIndex: editInfo.edit.startIndex
                        });
                    }
                }

                lastVisitedNode = node;

                if (cursor.gotoNextSibling()) {
                    break;
                }

                if (!cursor.gotoParent()) {
                    cursor.delete();
                    return edits;
                }
            }
        }
    }

    // Helper: Find which root child index a node belongs to
    // Note: We compare nodes by type + position since tree-sitter may create multiple objects for same node
    private findRootParentIndex(node: SyntaxNode, rootNode: SyntaxNode): number {
        const nodesEqual = (a: SyntaxNode, b: SyntaxNode): boolean => {
            return a.type === b.type && a.startIndex === b.startIndex && a.endIndex === b.endIndex;
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
                // console.log(`[findRootParentIndex] WEIRD: ${node.type} - current.parent matches rootNode but current not in children`);
                return -1;
            }
            
            current = current.parent;
        }
        
        if (iterations >= maxIterations) {
            // console.log(`[findRootParentIndex] ERROR: ${node.type} exceeded max iterations!`);
        }
        
        return -1; // Not found (reached top without finding root as parent)
    }

    // Selective formatting: format only nodes belonging to target assignments
    private iterateTreeSelective(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[],
        targetAssignments: Set<number>,
        mode: 'normal' | 'split-phase1'
    ) {
        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;

        const rootNode = tree.rootNode;
        // console.log(`[iterateTreeSelective] mode=${mode}, targeting ${targetAssignments.size} assignments: [${Array.from(targetAssignments).join(', ')}]`);
        
        let nodeCount = 0;

        while (true) {
            if (cursor.gotoFirstChild()) {
                continue;
            }

            while (true) {
                const node = cursor.currentNode();
                nodeCount++;
                
                if (nodeCount <= 10) {
                    // console.log(`[iterateTreeSelective] Processing node #${nodeCount}: ${node.type}`);
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
                    // console.log(`[iterateTreeSelective] Node #${nodeCount} ${node.type}: rootIndex=${rootIndex}, belongsToTarget=${belongsToTarget}, skipFormatting=${this.skipFormatting}`);
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
                if (belongsToTarget && !this.skipFormatting && !bodyBlockKeywords.hasFancy(node.type, "")) {
                    if (mode === 'normal') {
                        // Normal mode: format all nodes
                        const codeEdit = this.parse(node, fullText, formatters);
                        if (codeEdit !== undefined) {
                            // console.log(`[iterateTreeSelective-normal] Formatting: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                            this.insertChangeIntoTree(tree, codeEdit);
                            this.insertChangeIntoFullText(codeEdit, fullText);
                            this.numOfCodeEdits++;
                        }
                    } else if (mode === 'split-phase1') {
                        // Split phase 1: format leaf nodes and top-level assignments only
                        const hasFormattableChildren = node.children.some(child => 
                            !bodyBlockKeywords.hasFancy(child.type, "") &&
                            formatters.some(formatter => formatter.match(child))
                        );
                        
                        const isTopLevelAssignment = (node.type === 'assignment' || node.type === 'variable_assignment' || node.type === 'assign_statement') && 
                                                     (node.parent?.type === 'variable_assignment' || node.parent?.type === 'assign_statement' || node.parent?.type === 'source_code');
                        
                        if (!hasFormattableChildren || isTopLevelAssignment) {
                            const codeEdit = this.parse(node, fullText, formatters);
                            if (codeEdit !== undefined) {
                                if (isTopLevelAssignment) {
                                    // console.log(`[iterateTreeSelective-split] TOP-LEVEL ASSIGNMENT: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                                } else {
                                    // console.log(`[iterateTreeSelective-split] LEAF NODE: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                                }
                                this.insertChangeIntoTree(tree, codeEdit);
                                this.insertChangeIntoFullText(codeEdit, fullText);
                                this.numOfCodeEdits++;
                            }
                        } else {
                            // console.log(`[iterateTreeSelective-split] SKIPPING PARENT: ${node.type} at ${node.startIndex}-${node.endIndex}`);
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
        assignmentsNeedingSplitLogic: Set<number> = new Set()
    ) {
        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;

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
                    if (leafNodesOnly) {
                        // SPLIT LOGIC: Format in two groups
                        const hasFormattableChildren = node.children.some(child => 
                            !bodyBlockKeywords.hasFancy(child.type, "") &&
                            formatters.some(formatter => formatter.match(child))
                        );
                        
                        // Group 1: Leaf nodes (no formattable children)
                        // Group 2: Top-level assignment/variable_assignment nodes (to remove whitespace)
                        const isTopLevelAssignment = (node.type === 'assignment' || node.type === 'variable_assignment' || node.type === 'assign_statement') && 
                                                     (node.parent?.type === 'variable_assignment' || node.parent?.type === 'assign_statement' || node.parent?.type === 'source_code');
                        
                        if (!hasFormattableChildren || isTopLevelAssignment) {
                            const codeEdit = this.parse(node, fullText, formatters);

                            if (codeEdit !== undefined) {
                                if (isTopLevelAssignment) {
                                    // console.log(`[iterateTree] PHASE 1 - TOP-LEVEL ASSIGNMENT: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                                } else {
                                    // console.log(`[iterateTree] PHASE 1 - LEAF NODE: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                                }
                                this.insertChangeIntoTree(tree, codeEdit);
                                this.insertChangeIntoFullText(codeEdit, fullText);
                                this.numOfCodeEdits++;
                            }
                        } else {
                            // console.log(`[iterateTree] PHASE 1 - SKIPPING PARENT NODE: ${node.type} at ${node.startIndex}-${node.endIndex}`);
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
        const collectedEdits: Array<{node: SyntaxNode, edit: CodeEdit | CodeEdit[]}> = [];
        
        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;
        let done = false;

        // console.log(`[iterateTreeParentNodes] PHASE 2 - Collecting edits...`);
        
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
                    if (node.type === 'assignment' || node.type === 'variable_assignment') {
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
                    const hasFormattableChildren = node.children.some(child => 
                        !bodyBlockKeywords.hasFancy(child.type, "") &&
                        formatters.some(formatter => formatter.match(child))
                    );
                    
                    // Only process parent nodes in second pass
                    if (hasFormattableChildren) {
                        const codeEdit = this.parse(node, fullText, formatters);

                        if (codeEdit !== undefined) {
                            // console.log(`[iterateTreeParentNodes] COLLECTING edit for: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                            // DON'T apply yet - just collect!
                            collectedEdits.push({node, edit: codeEdit});
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
        // console.log(`[iterateTreeParentNodes] Collected ${collectedEdits.length} edits, deduplicating overlaps...`);
        
        // Deduplicate: remove edits that are contained within other edits
        // Keep only the outermost edit for any overlapping region
        const deduplicatedEdits: typeof collectedEdits = [];
        for (let i = 0; i < collectedEdits.length; i++) {
            const currentEdit = collectedEdits[i];
            const currentStart = Array.isArray(currentEdit.edit) ? currentEdit.edit[0].edit.startIndex : currentEdit.edit.edit.startIndex;
            const currentEnd = Array.isArray(currentEdit.edit) ? currentEdit.edit[currentEdit.edit.length - 1].edit.oldEndIndex : currentEdit.edit.edit.oldEndIndex;
            
            let isContainedByAnother = false;
            for (let j = 0; j < collectedEdits.length; j++) {
                if (i === j) continue;
                
                const otherEdit = collectedEdits[j];
                const otherStart = Array.isArray(otherEdit.edit) ? otherEdit.edit[0].edit.startIndex : otherEdit.edit.edit.startIndex;
                const otherEnd = Array.isArray(otherEdit.edit) ? otherEdit.edit[otherEdit.edit.length - 1].edit.oldEndIndex : otherEdit.edit.edit.oldEndIndex;
                
                // Check if current edit is fully contained within other edit
                if (otherStart <= currentStart && otherEnd >= currentEnd && (otherStart < currentStart || otherEnd > currentEnd)) {
                    isContainedByAnother = true;
                    // console.log(`[iterateTreeParentNodes] Skipping ${currentEdit.node.type} at ${currentStart}-${currentEnd} (contained by ${otherEdit.node.type} at ${otherStart}-${otherEnd})`);
                    break;
                }
            }
            
            if (!isContainedByAnother) {
                deduplicatedEdits.push(currentEdit);
            }
        }
        
        // console.log(`[iterateTreeParentNodes] After deduplication: ${deduplicatedEdits.length} edits remaining (removed ${collectedEdits.length - deduplicatedEdits.length} overlaps)`);
        
        // Sort by startIndex descending (end of file first)
        deduplicatedEdits.sort((a, b) => {
            const aStart = Array.isArray(a.edit) ? a.edit[0].edit.startIndex : a.edit.edit.startIndex;
            const bStart = Array.isArray(b.edit) ? b.edit[0].edit.startIndex : b.edit.edit.startIndex;
            return bStart - aStart; // Descending order
        });
        
        // console.log(`[iterateTreeParentNodes] Applying ${deduplicatedEdits.length} edits in reverse order...`);
        for (const {node, edit} of deduplicatedEdits) {
            const startPos = Array.isArray(edit) ? edit[0].edit.startIndex : edit.edit.startIndex;
            // console.log(`[iterateTreeParentNodes] APPLYING edit for: ${node.type} at position ${startPos}`);
            this.insertChangeIntoTree(tree, edit);
            this.insertChangeIntoFullText(edit, fullText);
            this.numOfCodeEdits++;
        }
                // console.log(`[iterateTreeParentNodes] PHASE 2 complete`);
    }

    private iterateTreeParentNodesSelective(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[],
        targetAssignments: Set<number>
    ) {
        // CRITICAL: Collect all edits first, then apply them
        // Applying tree.edit() during iteration corrupts node positions
        const collectedEdits: Array<{node: SyntaxNode, edit: CodeEdit | CodeEdit[]}> = [];
        const rootNode = tree.rootNode;
        
        let cursor = tree.walk();
        let lastVisitedNode: SyntaxNode | null = null;
        let done = false;

        // console.log(`[iterateTreeParentNodesSelective] PHASE 2 - Collecting edits for target assignments...`);
        
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
                    if (node.type === 'assignment' || node.type === 'variable_assignment') {
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
                    const hasFormattableChildren = node.children.some(child => 
                        !bodyBlockKeywords.hasFancy(child.type, "") &&
                        formatters.some(formatter => formatter.match(child))
                    );
                    
                    // Only process parent nodes in second pass
                    if (hasFormattableChildren) {
                        const codeEdit = this.parse(node, fullText, formatters);

                        if (codeEdit !== undefined) {
                            // console.log(`[iterateTreeParentNodesSelective] COLLECTING edit for: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                            // DON'T apply yet - just collect!
                            collectedEdits.push({node, edit: codeEdit});
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
        // console.log(`[iterateTreeParentNodesSelective] Collected ${collectedEdits.length} edits, deduplicating overlaps...`);
        
        // Deduplicate: remove edits that are contained within other edits
        // Keep only the outermost edit for any overlapping region
        const deduplicatedEdits: typeof collectedEdits = [];
        for (let i = 0; i < collectedEdits.length; i++) {
            const currentEdit = collectedEdits[i];
            const currentStart = Array.isArray(currentEdit.edit) ? currentEdit.edit[0].edit.startIndex : currentEdit.edit.edit.startIndex;
            const currentEnd = Array.isArray(currentEdit.edit) ? currentEdit.edit[currentEdit.edit.length - 1].edit.oldEndIndex : currentEdit.edit.edit.oldEndIndex;
            
            let isContainedByAnother = false;
            for (let j = 0; j < collectedEdits.length; j++) {
                if (i === j) continue;
                
                const otherEdit = collectedEdits[j];
                const otherStart = Array.isArray(otherEdit.edit) ? otherEdit.edit[0].edit.startIndex : otherEdit.edit.edit.startIndex;
                const otherEnd = Array.isArray(otherEdit.edit) ? otherEdit.edit[otherEdit.edit.length - 1].edit.oldEndIndex : otherEdit.edit.edit.oldEndIndex;
                
                // Check if current edit is fully contained within other edit
                if (otherStart <= currentStart && otherEnd >= currentEnd && (otherStart < currentStart || otherEnd > currentEnd)) {
                    isContainedByAnother = true;
                    // console.log(`[iterateTreeParentNodesSelective] Skipping ${currentEdit.node.type} at ${currentStart}-${currentEnd} (contained by ${otherEdit.node.type} at ${otherStart}-${otherEnd})`);
                    break;
                }
            }
            
            if (!isContainedByAnother) {
                deduplicatedEdits.push(currentEdit);
            }
        }
        
        // console.log(`[iterateTreeParentNodesSelective] After deduplication: ${deduplicatedEdits.length} edits remaining (removed ${collectedEdits.length - deduplicatedEdits.length} overlaps)`);
        
        // Sort by startIndex descending (end of file first)
        deduplicatedEdits.sort((a, b) => {
            const aStart = Array.isArray(a.edit) ? a.edit[0].edit.startIndex : a.edit.edit.startIndex;
            const bStart = Array.isArray(b.edit) ? b.edit[0].edit.startIndex : b.edit.edit.startIndex;
            return bStart - aStart; // Descending order
        });
        
        // console.log(`[iterateTreeParentNodesSelective] Applying ${deduplicatedEdits.length} edits in reverse order...`);
        for (const {node, edit} of deduplicatedEdits) {
            const startPos = Array.isArray(edit) ? edit[0].edit.startIndex : edit.edit.startIndex;
            // console.log(`[iterateTreeParentNodesSelective] APPLYING edit for: ${node.type} at position ${startPos}`);
            this.insertChangeIntoTree(tree, edit);
            this.insertChangeIntoFullText(edit, fullText);
            this.numOfCodeEdits++;
        }
        // console.log(`[iterateTreeParentNodesSelective] PHASE 2 complete`);
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

    private insertChangeIntoTree(
        tree: Tree,
        codeEdit: CodeEdit | CodeEdit[]
    ): void {
        if (Array.isArray(codeEdit)) {
            // console.log(`[insertChangeIntoTree] Applying ${codeEdit.length} edits to tree`);
            codeEdit.forEach((oneCodeEdit, index) => {
                // console.log(`[insertChangeIntoTree] Edit ${index + 1}: startIndex=${oneCodeEdit.edit.startIndex}, oldEndIndex=${oneCodeEdit.edit.oldEndIndex}, newEndIndex=${oneCodeEdit.edit.newEndIndex}`);
                tree.edit(oneCodeEdit.edit);
            });
        } else {
            // console.log(`[insertChangeIntoTree] Applying single edit: startIndex=${codeEdit.edit.startIndex}, oldEndIndex=${codeEdit.edit.oldEndIndex}, newEndIndex=${codeEdit.edit.newEndIndex}`);
            tree.edit(codeEdit.edit);
        }
        // console.log(`[insertChangeIntoTree] Tree edit complete`);
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
            const sortedEdits = [...codeEdit].sort((a, b) => b.edit.startIndex - a.edit.startIndex);
            
            for (const oneCodeEdit of sortedEdits) {
                const before = fullText.text.slice(0, oneCodeEdit.edit.startIndex);
                const after = fullText.text.slice(oneCodeEdit.edit.oldEndIndex);
                fullText.text = before + oneCodeEdit.text + after;
            }
        } else {
            // Log edits that affect the problematic ASSIGN region (around 10850)
            if (codeEdit.edit.startIndex < 11000 && codeEdit.edit.oldEndIndex > 10800) {
                console.log(`[insertChangeIntoFullText] !!! EDIT NEAR PROBLEM AREA !!!`);
                console.log(`[insertChangeIntoFullText] startIndex=${codeEdit.edit.startIndex}, oldEndIndex=${codeEdit.edit.oldEndIndex}`);
                console.log(`[insertChangeIntoFullText] OLD TEXT: "${fullText.text.substring(codeEdit.edit.startIndex, codeEdit.edit.oldEndIndex)}"`);
                console.log(`[insertChangeIntoFullText] NEW TEXT: "${codeEdit.text}"`);
                console.log(`[insertChangeIntoFullText] Text length BEFORE: ${fullText.text.length}`);
            }
            const before = fullText.text.slice(0, codeEdit.edit.startIndex);
            const after = fullText.text.slice(codeEdit.edit.oldEndIndex);
            fullText.text = before + codeEdit.text + after;
            if (codeEdit.edit.startIndex < 11000 && codeEdit.edit.oldEndIndex > 10800) {
                console.log(`[insertChangeIntoFullText] Text length AFTER: ${fullText.text.length}`);
            }
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
                if (node.startIndex < 11000 && node.endIndex > 10800) {
                    console.log(`[FormattingEngine.parse] !!! FORMATTER IN PROBLEM AREA !!!`);
                    console.log(`[FormattingEngine.parse] Formatter: ${(formatter.constructor as any).formatterLabel || formatter.constructor.name}`);
                    console.log(`[FormattingEngine.parse] Node type: ${node.type}`);
                    console.log(`[FormattingEngine.parse] Node position: start=${node.startIndex}, end=${node.endIndex}`);
                    console.log(`[FormattingEngine.parse] Node text: "${node.text.substring(0, 100)}${node.text.length > 100 ? '...' : ''}"`);
                }
                
                result = formatter.parse(node, fullText);
                
                if (result && node.startIndex < 11000 && node.endIndex > 10800) {
                    const editInfo = Array.isArray(result) ? result[0] : result;
                    console.log(`[FormattingEngine.parse] Generated edit: startIndex=${editInfo.edit.startIndex}, oldEndIndex=${editInfo.edit.oldEndIndex}`);
                    console.log(`[FormattingEngine.parse] New text length: ${editInfo.text.length}, Old text length: ${editInfo.edit.oldEndIndex - editInfo.edit.startIndex}`);
                }

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
