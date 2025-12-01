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
        
        // Check if assignment operator ends at position > 30 (issue #420 pattern)
        let assignmentOperatorEndPosition = 0;
        const rootNode = parseResult.tree.rootNode;
        if (rootNode.firstChild) {
            const firstChild = rootNode.firstChild;
            if (firstChild.type === 'variable_assignment' || firstChild.type === 'assignment') {
                for (let i = 0; i < firstChild.childCount; i++) {
                    const child = firstChild.child(i);
                    if (child && child.type === 'assignment') {
                        for (let j = 0; j < child.childCount; j++) {
                            const grandChild = child.child(j);
                            if (grandChild && grandChild.type === 'assignment_operator') {
                                assignmentOperatorEndPosition = grandChild.endIndex;
                                console.log(`[FormattingEngine.formatText] *** ASSIGNMENT OPERATOR ENDS AT: ${assignmentOperatorEndPosition} ***`);
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        const useSplitLogic = assignmentOperatorEndPosition > 30;
        console.log(`[FormattingEngine.formatText] Use split logic: ${useSplitLogic} (operator end: ${assignmentOperatorEndPosition})`);
        
        this.iterateTree(parseResult.tree, fullText, formatters, useSplitLogic);
        
        if (useSplitLogic) {
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
        if (useSplitLogic) {
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
                        // SPLIT LOGIC: Only format LEAF nodes (no children with edits)
                        const hasFormattableChildren = node.children.some(child => 
                            !bodyBlockKeywords.hasFancy(child.type, "") &&
                            formatters.some(formatter => formatter.match(child))
                        );
                        
                        // Only process leaf nodes in first pass
                        if (!hasFormattableChildren) {
                            const codeEdit = this.parse(node, fullText, formatters);

                            if (codeEdit !== undefined) {
                                console.log(`[iterateTree] PHASE 1 - LEAF NODE: ${node.type} at ${node.startIndex}-${node.endIndex}`);
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
                        cursor.delete();
                        return;
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
                        return;
                    }

                    continue;
                }

                // Parse and process the current node (POST-ORDER)
                // SECOND PASS: Only format PARENT nodes (have formattable children)
                if (
                    !this.skipFormatting &&
                    !bodyBlockKeywords.hasFancy(node.type, "")
                ) {
                    // Check if this node is a parent (has children that would be formatted)
                    const hasFormattableChildren = node.children.some(child => 
                        !bodyBlockKeywords.hasFancy(child.type, "") &&
                        formatters.some(formatter => formatter.match(child))
                    );
                    
                    // Only process parent nodes in second pass
                    if (hasFormattableChildren) {
                        const codeEdit = this.parse(node, fullText, formatters);

                        if (codeEdit !== undefined) {
                            console.log(`[iterateTreeParentNodes] PARENT NODE: ${node.type} at ${node.startIndex}-${node.endIndex}`);
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
                    break;
                }
                // If no more siblings, move up to the parent node
                if (!cursor.gotoParent()) {
                    cursor.delete();
                    return;
                }
            }
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

    private insertChangeIntoTree(
        tree: Tree,
        codeEdit: CodeEdit | CodeEdit[]
    ): void {
        if (Array.isArray(codeEdit)) {
            console.log(`[insertChangeIntoTree] Applying ${codeEdit.length} edits to tree`);
            codeEdit.forEach((oneCodeEdit, index) => {
                console.log(`[insertChangeIntoTree] Edit ${index + 1}: startIndex=${oneCodeEdit.edit.startIndex}, oldEndIndex=${oneCodeEdit.edit.oldEndIndex}, newEndIndex=${oneCodeEdit.edit.newEndIndex}`);
                tree.edit(oneCodeEdit.edit);
            });
        } else {
            console.log(`[insertChangeIntoTree] Applying single edit: startIndex=${codeEdit.edit.startIndex}, oldEndIndex=${codeEdit.edit.oldEndIndex}, newEndIndex=${codeEdit.edit.newEndIndex}`);
            tree.edit(codeEdit.edit);
        }
        console.log(`[insertChangeIntoTree] Tree edit complete`);
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
                console.log(`[insertChangeIntoFullText] Array mode - startIndex: ${oneCodeEdit.edit.startIndex}, oldEndIndex: ${oneCodeEdit.edit.oldEndIndex}`);
                console.log(`[insertChangeIntoFullText] Current text length: ${fullText.text.length}`);
                console.log(`[insertChangeIntoFullText] Text being replaced (${oneCodeEdit.edit.startIndex} to ${oneCodeEdit.edit.oldEndIndex}): "${fullText.text.substring(oneCodeEdit.edit.startIndex, oneCodeEdit.edit.oldEndIndex)}"`);
                console.log(`[insertChangeIntoFullText] New text (length ${oneCodeEdit.text.length}): "${oneCodeEdit.text}"`);
                const before = fullText.text.slice(0, oneCodeEdit.edit.startIndex);
                const after = fullText.text.slice(oneCodeEdit.edit.oldEndIndex);
                console.log(`[insertChangeIntoFullText] Before slice (0 to ${oneCodeEdit.edit.startIndex}): length=${before.length}`);
                console.log(`[insertChangeIntoFullText] After slice (${oneCodeEdit.edit.oldEndIndex} to end): length=${after.length}`);
                fullText.text = before + oneCodeEdit.text + after;
                console.log(`[insertChangeIntoFullText] Result text length: ${fullText.text.length}`);
            });
        } else {
            console.log(`[insertChangeIntoFullText] Single mode - startIndex: ${codeEdit.edit.startIndex}, oldEndIndex: ${codeEdit.edit.oldEndIndex}`);
            console.log(`[insertChangeIntoFullText] Current text length: ${fullText.text.length}`);
            console.log(`[insertChangeIntoFullText] Text being replaced (${codeEdit.edit.startIndex} to ${codeEdit.edit.oldEndIndex}): "${fullText.text.substring(codeEdit.edit.startIndex, codeEdit.edit.oldEndIndex)}"`);
            console.log(`[insertChangeIntoFullText] New text (length ${codeEdit.text.length}): "${codeEdit.text}"`);
            const before = fullText.text.slice(0, codeEdit.edit.startIndex);
            const after = fullText.text.slice(codeEdit.edit.oldEndIndex);
            console.log(`[insertChangeIntoFullText] Before slice (0 to ${codeEdit.edit.startIndex}): length=${before.length}`);
            console.log(`[insertChangeIntoFullText] After slice (${codeEdit.edit.oldEndIndex} to end): length=${after.length}`);
            fullText.text = before + codeEdit.text + after;
            console.log(`[insertChangeIntoFullText] Result text length: ${fullText.text.length}`);
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
                console.log(`[FormattingEngine.parse] Formatter matched: ${(formatter.constructor as any).formatterLabel || formatter.constructor.name}`);
                console.log(`[FormattingEngine.parse] Node type: ${node.type}, text: "${node.text}"`);
                console.log(`[FormattingEngine.parse] Node position: start=${node.startIndex}, end=${node.endIndex}`);
                console.log(`[FormattingEngine.parse] fullText length before parse: ${fullText.text.length}`);
                
                result = formatter.parse(node, fullText);
                
                if (result) {
                    const editInfo = Array.isArray(result) ? result[0] : result;
                    console.log(`[FormattingEngine.parse] Formatter generated edit: startIndex=${editInfo.edit.startIndex}, oldEndIndex=${editInfo.edit.oldEndIndex}, newText="${editInfo.text}"`);
                } else {
                    console.log(`[FormattingEngine.parse] Formatter returned no edit`);
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
