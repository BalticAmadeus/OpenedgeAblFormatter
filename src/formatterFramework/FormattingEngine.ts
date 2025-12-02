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
        
        // Check if ANY assignment operator ends at position > 30 (issue #420 pattern)
        // AND if there's a parenthesized_expression (only case that breaks)
        // Need to check ALL root-level statements, not just the first one
        let shouldUseSplitLogic = false;
        
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
        
        // Check ALL root-level children for assignments that need split logic
        for (let rootChildIndex = 0; rootChildIndex < rootNode.childCount; rootChildIndex++) {
            const rootChild = rootNode.child(rootChildIndex);
            if (!rootChild) continue;
            
            console.log(`[FormattingEngine.formatText] Checking root child ${rootChildIndex}: type=${rootChild.type}`);
            
            // Handle both variable_assignment and assign_statement
            if (rootChild.type === 'variable_assignment' || rootChild.type === 'assign_statement') {
                let assignmentOperatorColumn = 0;
                let hasParenthesizedExpression = false;
                
                for (let i = 0; i < rootChild.childCount; i++) {
                    const child = rootChild.child(i);
                    if (child && child.type === 'assignment') {
                        console.log(`[FormattingEngine.formatText] Found assignment node with ${child.childCount} children`);
                        
                        // Check for parenthesized_expression
                        if (checkForParenthesized(child)) {
                            hasParenthesizedExpression = true;
                            console.log(`[FormattingEngine.formatText] *** FOUND PARENTHESIZED_EXPRESSION ***`);
                        }
                        
                        for (let j = 0; j < child.childCount; j++) {
                            const grandChild = child.child(j);
                            if (grandChild) {
                                console.log(`[FormattingEngine.formatText]   Child ${j}: type=${grandChild.type}, start=${grandChild.startIndex}, end=${grandChild.endIndex}, position=${grandChild.startPosition.row}:${grandChild.startPosition.column}`);
                                if (grandChild.type === 'assignment_operator') {
                                    // Use column position (position within the line), not absolute file position
                                    assignmentOperatorColumn = grandChild.endPosition.column;
                                    console.log(`[FormattingEngine.formatText] *** ASSIGNMENT OPERATOR at line ${grandChild.startPosition.row + 1}, column ${grandChild.startPosition.column} - ${grandChild.endPosition.column} ***`);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Use split logic if ANY assignment meets criteria:
                // 1. Assignment operator COLUMN position > threshold (indicates excessive whitespace before =)
                //    - Check column position (position in line), not absolute file position
                //    - For variable_assignment: column > 30 (no "assign" keyword)
                //    - For assign_statement: column > 37 (includes "assign " keyword = 7 chars)
                // 2. Has parenthesized_expression (only case that breaks)
                const threshold = rootChild.type === 'assign_statement' ? 37 : 30;
                if (assignmentOperatorColumn > threshold && hasParenthesizedExpression) {
                    shouldUseSplitLogic = true;
                    console.log(`[FormattingEngine.formatText] *** ACTIVATING SPLIT LOGIC for root child ${rootChildIndex}: operator column ${assignmentOperatorColumn} > ${threshold} AND has parenthesized_expression`);
                    break; // Found one that needs split logic, that's enough
                }
            }
        }
        
        console.log(`[FormattingEngine.formatText] Use split logic: ${shouldUseSplitLogic}`);
        
        this.iterateTree(parseResult.tree, fullText, formatters, shouldUseSplitLogic);
        
        if (shouldUseSplitLogic) {
            console.log(`[FormattingEngine.formatText] After iterateTree PHASE 1 (LEAF NODES), text length: ${fullText.text.length}`);
        } else {
            console.log(`[FormattingEngine.formatText] After iterateTree (NORMAL), text length: ${fullText.text.length}`);
        }

        const newTree = this.parserHelper.parse(
            this.fileIdentifier,
            fullText.text,
            parseResult.tree
        ).tree;

        console.log(`[FormattingEngine.formatText] Before iterateTreeFormatBlocks, text length: ${fullText.text.length}`);
        this.iterateTreeFormatBlocks(newTree, fullText, formatters);
        console.log(`[FormattingEngine.formatText] After iterateTreeFormatBlocks, text length: ${fullText.text.length}`);

        // SECOND PASS: Format parent nodes only when split logic is active
        if (shouldUseSplitLogic) {
            console.log(`[FormattingEngine.formatText] ========== STARTING PHASE 2: PARENT NODES ==========`);
            this.iterateTreeParentNodes(newTree, fullText, formatters);
            console.log(`[FormattingEngine.formatText] After iterateTreeParentNodes PHASE 2, text length: ${fullText.text.length}`);
        }
        this.debugManager.fileFormattedSuccessfully(this.numOfCodeEdits);
        console.log(`[FormattingEngine.formatText] COMPLETE - Final text length: ${fullText.text.length}, numOfCodeEdits: ${this.numOfCodeEdits}`);

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

    private iterateTree(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[],
        leafNodesOnly: boolean = false
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
                        // Group 2: Top-level assignment nodes (to remove whitespace)
                        const isTopLevelAssignment = (node.type === 'assignment' || node.type === 'variable_assignment') && 
                                                     (node.parent?.type === 'variable_assignment' || node.parent?.type === 'source_code');
                        
                        if (!hasFormattableChildren || isTopLevelAssignment) {
                            const codeEdit = this.parse(node, fullText, formatters);

                            if (codeEdit !== undefined) {
                                if (isTopLevelAssignment) {
                                    console.log(`[iterateTree] PHASE 1 - TOP-LEVEL ASSIGNMENT: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                                } else {
                                    console.log(`[iterateTree] PHASE 1 - LEAF NODE: ${node.type} at ${node.startIndex}-${node.endIndex}`);
                                }
                                this.insertChangeIntoTree(tree, codeEdit);
                                this.insertChangeIntoFullText(codeEdit, fullText);
                                this.numOfCodeEdits++;
                            }
                        } else {
                            console.log(`[iterateTree] PHASE 1 - SKIPPING PARENT NODE: ${node.type} at ${node.startIndex}-${node.endIndex}`);
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

        console.log(`[iterateTreeParentNodes] PHASE 2 - Collecting edits...`);
        
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
                            console.log(`[iterateTreeParentNodes] COLLECTING edit for: ${node.type} at ${node.startIndex}-${node.endIndex}`);
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
        console.log(`[iterateTreeParentNodes] Collected ${collectedEdits.length} edits, deduplicating overlaps...`);
        
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
                    console.log(`[iterateTreeParentNodes] Skipping ${currentEdit.node.type} at ${currentStart}-${currentEnd} (contained by ${otherEdit.node.type} at ${otherStart}-${otherEnd})`);
                    break;
                }
            }
            
            if (!isContainedByAnother) {
                deduplicatedEdits.push(currentEdit);
            }
        }
        
        console.log(`[iterateTreeParentNodes] After deduplication: ${deduplicatedEdits.length} edits remaining (removed ${collectedEdits.length - deduplicatedEdits.length} overlaps)`);
        
        // Sort by startIndex descending (end of file first)
        deduplicatedEdits.sort((a, b) => {
            const aStart = Array.isArray(a.edit) ? a.edit[0].edit.startIndex : a.edit.edit.startIndex;
            const bStart = Array.isArray(b.edit) ? b.edit[0].edit.startIndex : b.edit.edit.startIndex;
            return bStart - aStart; // Descending order
        });
        
        console.log(`[iterateTreeParentNodes] Applying ${deduplicatedEdits.length} edits in reverse order...`);
        for (const {node, edit} of deduplicatedEdits) {
            const startPos = Array.isArray(edit) ? edit[0].edit.startIndex : edit.edit.startIndex;
            console.log(`[iterateTreeParentNodes] APPLYING edit for: ${node.type} at position ${startPos}`);
            this.insertChangeIntoTree(tree, edit);
            this.insertChangeIntoFullText(edit, fullText);
            this.numOfCodeEdits++;
        }
        console.log(`[iterateTreeParentNodes] PHASE 2 complete`);
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
            codeEdit.forEach((oneCodeEdit) => {
                // console.log(`[insertChangeIntoFullText] Array mode - startIndex: ${oneCodeEdit.edit.startIndex}, oldEndIndex: ${oneCodeEdit.edit.oldEndIndex}`);
                // console.log(`[insertChangeIntoFullText] Current text length: ${fullText.text.length}`);
                // console.log(`[insertChangeIntoFullText] Text being replaced (${oneCodeEdit.edit.startIndex} to ${oneCodeEdit.edit.oldEndIndex}): "${fullText.text.substring(oneCodeEdit.edit.startIndex, oneCodeEdit.edit.oldEndIndex)}"`);
                // console.log(`[insertChangeIntoFullText] New text (length ${oneCodeEdit.text.length}): "${oneCodeEdit.text}"`);
                const before = fullText.text.slice(0, oneCodeEdit.edit.startIndex);
                const after = fullText.text.slice(oneCodeEdit.edit.oldEndIndex);
                // console.log(`[insertChangeIntoFullText] Before slice (0 to ${oneCodeEdit.edit.startIndex}): length=${before.length}`);
                // console.log(`[insertChangeIntoFullText] After slice (${oneCodeEdit.edit.oldEndIndex} to end): length=${after.length}`);
                fullText.text = before + oneCodeEdit.text + after;
                // console.log(`[insertChangeIntoFullText] Result text length: ${fullText.text.length}`);
            });
        } else {
            // console.log(`[insertChangeIntoFullText] Single mode - startIndex: ${codeEdit.edit.startIndex}, oldEndIndex: ${codeEdit.edit.oldEndIndex}`);
            // console.log(`[insertChangeIntoFullText] Current text length: ${fullText.text.length}`);
            // console.log(`[insertChangeIntoFullText] Text being replaced (${codeEdit.edit.startIndex} to ${codeEdit.edit.oldEndIndex}): "${fullText.text.substring(codeEdit.edit.startIndex, codeEdit.edit.oldEndIndex)}"`);
            // console.log(`[insertChangeIntoFullText] New text (length ${codeEdit.text.length}): "${codeEdit.text}"`);
            const before = fullText.text.slice(0, codeEdit.edit.startIndex);
            const after = fullText.text.slice(codeEdit.edit.oldEndIndex);
            // console.log(`[insertChangeIntoFullText] Before slice (0 to ${codeEdit.edit.startIndex}): length=${before.length}`);
            // console.log(`[insertChangeIntoFullText] After slice (${codeEdit.edit.oldEndIndex} to end): length=${after.length}`);
            fullText.text = before + codeEdit.text + after;
            // console.log(`[insertChangeIntoFullText] Result text length: ${fullText.text.length}`);
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
                // console.log(`[FormattingEngine.parse] Formatter matched: ${(formatter.constructor as any).formatterLabel || formatter.constructor.name}`);
                // console.log(`[FormattingEngine.parse] Node type: ${node.type}, text: "${node.text}"`);
                // console.log(`[FormattingEngine.parse] Node position: start=${node.startIndex}, end=${node.endIndex}`);
                // console.log(`[FormattingEngine.parse] fullText length before parse: ${fullText.text.length}`);
                
                result = formatter.parse(node, fullText);
                
                if (result) {
                    const editInfo = Array.isArray(result) ? result[0] : result;
                    // console.log(`[FormattingEngine.parse] Formatter generated edit: startIndex=${editInfo.edit.startIndex}, oldEndIndex=${editInfo.edit.oldEndIndex}, newText="${editInfo.text}"`);
                } else {
                    // console.log(`[FormattingEngine.parse] Formatter returned no edit`);
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
