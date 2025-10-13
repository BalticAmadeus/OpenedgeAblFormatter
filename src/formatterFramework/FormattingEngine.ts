import { SyntaxNode, Tree } from "web-tree-sitter";
import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { IFormatter } from "./IFormatter";
import { BlockFormater } from "../formatters/block/BlockFormatter";
import { CodeEdit } from "../model/CodeEdit";
import { FullText } from "../model/FullText";
import { IConfigurationManager } from "../utils/IConfigurationManager";
import { ParseResult } from "../model/ParseResult";
import { FormatterFactory } from "./FormatterFactory";
import { EOL } from "../model/EOL";
import { IDebugManager } from "../providers/IDebugManager";
import { bodyBlockKeywords, SyntaxNodeType } from "../model/SyntaxNodeType";

export class FormattingEngine {
    private numOfCodeEdits: number = 0;

    constructor(
        private parserHelper: IParserHelper,
        private fileIdentifier: FileIdentifier,
        private configurationManager: IConfigurationManager,
        private debugManager: IDebugManager
    ) {}

    public async formatText(
        fulfullTextString: string,
        eol: EOL
    ): Promise<string> {
        const fullText: FullText = {
            text: fulfullTextString,
            eolDelimiter: eol.eolDel,
        };

        console.log("[FormattingEngine] Starting async parsing for formatting");
        const parseResult = await this.parserHelper.parseAsync(
            this.fileIdentifier,
            fulfullTextString
        );

        // Debug: Print proxy tree before formatting
        if (parseResult.tree && (parseResult.tree as any).rootNode) {
            console.log("[DEBUG] Proxy tree before formatting:");
            printProxyTree((parseResult.tree as any).rootNode);
        }

        this.settingsOverride(parseResult);

        const formatters = FormatterFactory.getFormatterInstances(
            this.configurationManager
        );

        await this.iterateTree(parseResult.tree, fullText, formatters);

        // Debug: Print the text sent to the parser after the first formatting pass
        console.log("[DEBUG] Text sent to parser after first formatting pass:\n" + fullText.text);

        console.log("[FormattingEngine] Re-parsing after initial formatting");
        const newParseResult = await this.parserHelper.parseAsync(
            this.fileIdentifier,
            fullText.text,
            parseResult.tree
        );

        // Debug: Print proxy tree after re-parsing
        if (newParseResult.tree && (newParseResult.tree as any).rootNode) {
            console.log("[DEBUG] Proxy tree after re-parsing:");
            printProxyTree((newParseResult.tree as any).rootNode);
        }

        this.iterateTreeFormatBlocks(newParseResult.tree, fullText, formatters);

        // Report parse results to debug manager for status bar updates
        this.debugManager.handleErrors(newParseResult.tree);
        this.debugManager.fileFormattedSuccessfully(this.numOfCodeEdits);

        console.log(
            "[FormattingEngine] Final formatted text:",
            JSON.stringify(fullText.text)
        );
        console.log(
            "[FormattingEngine] Total code edits applied:",
            this.numOfCodeEdits
        );
        return fullText.text;
    }

    private async iterateTree(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[]
    ) {
        // Collect all code edits first
        const allCodeEdits: { edit: CodeEdit | CodeEdit[]; node: SyntaxNode }[] = [];
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
                        break;
                    }
                    continue;
                }
                if (!bodyBlockKeywords.hasFancy(node.type, "")) {
                    const codeEdit = this.parse(node, fullText, formatters);
                    if (codeEdit !== undefined) {
                        allCodeEdits.push({ edit: codeEdit, node });
                    }
                }
                lastVisitedNode = node;
                if (cursor.gotoNextSibling()) {
                    break;
                }
                if (!cursor.gotoParent()) {
                    cursor.delete();
                    break;
                }
            }
            if (!cursor.currentNode().parent) break;
        }
        // Sort all edits by startIndex descending and apply
        const flatEdits: CodeEdit[] = [];
        allCodeEdits.forEach(({ edit }) => {
            if (Array.isArray(edit)) {
                flatEdits.push(...edit);
            } else {
                flatEdits.push(edit);
            }
        });
        flatEdits.sort((a, b) => b.edit.startIndex - a.edit.startIndex);
        flatEdits.forEach((oneCodeEdit) => {
            this.insertChangeIntoTree(tree, oneCodeEdit);
            this.insertChangeIntoFullText(oneCodeEdit, fullText);
            this.numOfCodeEdits++;
        });
    }

    /*
        This method formats solely the indentation of blocks, therefore, the number of lines remains unchanged.
    */
    private iterateTreeFormatBlocks(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[]
    ) {
        // Collect all block code edits first
        const allBlockEdits: { edit: CodeEdit | CodeEdit[]; node: SyntaxNode }[] = [];
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
                        break; // Exit if there are no more nodes to visit
                    }
                    continue; // Continue with the parent node
                }

                if (bodyBlockKeywords.hasFancy(node.type, "")) {
                    const codeEdit = this.parse(node, fullText, formatters);
                    if (codeEdit !== undefined) {
                        allBlockEdits.push({ edit: codeEdit, node });
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
                    break; // Exit if there are no more nodes to visit
                }
            }
            if (!cursor.currentNode().parent) break;
        }
        // Sort all block edits by startIndex descending and apply
        const flatEdits: CodeEdit[] = [];
        allBlockEdits.forEach(({ edit }) => {
            if (Array.isArray(edit)) {
                flatEdits.push(...edit);
            } else {
                flatEdits.push(edit);
            }
        });
        flatEdits.sort((a, b) => b.edit.startIndex - a.edit.startIndex);
        flatEdits.forEach((oneCodeEdit) => {
            this.insertChangeIntoTree(tree, oneCodeEdit);
            this.insertChangeIntoFullText(oneCodeEdit, fullText);
            this.numOfCodeEdits++;
        });
    }

    private insertChangeIntoTree(
        tree: Tree,
        codeEdit: CodeEdit | CodeEdit[]
    ): void {
        if (Array.isArray(codeEdit)) {
            codeEdit.forEach((oneCodeEdit) => {
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
        const edits = Array.isArray(codeEdit) ? codeEdit : [codeEdit];
        // Sort edits by startIndex descending
        edits.sort((a, b) => b.edit.startIndex - a.edit.startIndex);

        edits.forEach((oneCodeEdit) => {
            // Debug log for each edit
            console.log(
                `[DEBUG] Applying edit: start=${oneCodeEdit.edit.startIndex}, oldEnd=${oneCodeEdit.edit.oldEndIndex}, text="${oneCodeEdit.text}"`
            );
            fullText.text =
                fullText.text.slice(0, oneCodeEdit.edit.startIndex) +
                oneCodeEdit.text +
                fullText.text.slice(oneCodeEdit.edit.oldEndIndex);
        });
    }

    private parse(
        node: SyntaxNode,
        fullText: FullText,
        formatters: IFormatter[]
    ): CodeEdit | CodeEdit[] | undefined {
        let result: CodeEdit | CodeEdit[] | undefined;

        // Debug: log node type and range
        console.log(
            `[DEBUG] Node type: ${node.type}, startIndex: ${node.startIndex}, endIndex: ${node.endIndex}, text: "${fullText.text.slice(node.startIndex, node.endIndex)}"`
        );

        formatters.some((formatter) => {
            if (formatter.match(node)) {
                result = formatter.parse(node, fullText);
                // Debug log for every edit generated
                if (result !== undefined) {
                    if (Array.isArray(result)) {
                        result.forEach((edit) => {
                            console.log(
                                `[DEBUG] Edit for node type "${node.type}": start=${edit.edit.startIndex}, end=${edit.edit.oldEndIndex}, text="${edit.text}"`
                    );
                        });
                    } else {
                        console.log(
                            `[DEBUG] Edit for node type "${node.type}": start=${result.edit.startIndex}, end=${result.edit.oldEndIndex}, text="${result.text}"`
                        );
                    }
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
}

// Place this at the top or bottom of the file for utility
function printProxyTree(node: any, depth: number = 0) {
    const indent = "  ".repeat(depth);
    const parentType = node.parent ? node.parent.type : "null";
    const nextSiblingType = node.nextSibling ? node.nextSibling.type : "null";
    const prevSiblingType = node.previousSibling ? node.previousSibling.type : "null";
    console.log(
        `${indent}${node.type} [${node.startPosition?.row},${node.startPosition?.column}] - Parent: ${parentType}, Next: ${nextSiblingType}, Prev: ${prevSiblingType}`
    );
    if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => printProxyTree(child, depth + 1));
    }
}
