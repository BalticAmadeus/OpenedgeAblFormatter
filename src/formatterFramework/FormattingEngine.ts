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

export class FormattingEngine {
    private numOfCodeEdits: number = 0;

    constructor(
        private parserHelper: IParserHelper,
        private fileIdentifier: FileIdentifier,
        private configurationManager: IConfigurationManager,
        private debugManager: IDebugManager
    ) {}

    public formatText(fulfullTextString: string, eol: EOL): string {
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

        this.iterateTree(parseResult.tree, fullText, formatters);

        this.debugManager.fileFormattedSuccessfully(this.numOfCodeEdits);

        return fullText.text;
    }

    private iterateTree(
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
                const node = cursor.currentNode;

                // Skip the node if it was the last one visited
                if (node === lastVisitedNode) {
                    if (!cursor.gotoParent()) {
                        cursor.delete(); // Clean up the cursor
                        return; // Exit if there are no more nodes to visit
                    }
                    continue; // Continue with the parent node
                }

                // Parse and process the current node
                const codeEdit = this.parse(node, fullText, formatters);

                if (codeEdit !== undefined) {
                    this.insertChangeIntoTree(tree, codeEdit);
                    this.insertChangeIntoFullText(codeEdit, fullText);
                    this.numOfCodeEdits++;
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
            if (child !== null) {
                arr = arr.concat(this.logTree(child));
            }
        });

        return arr;
    }

    private insertChangeIntoFullText(
        codeEdit: CodeEdit | CodeEdit[],
        fullText: FullText
    ): void {
        if (Array.isArray(codeEdit)) {
            codeEdit.forEach((oneCodeEdit) => {
                fullText.text =
                    fullText.text.slice(0, oneCodeEdit.edit.startIndex) +
                    oneCodeEdit.text +
                    fullText.text.slice(oneCodeEdit.edit.oldEndIndex);
            });
        } else {
            fullText.text =
                fullText.text.slice(0, codeEdit.edit.startIndex) +
                codeEdit.text +
                fullText.text.slice(codeEdit.edit.oldEndIndex);
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
                result = formatter.parse(node, fullText);

                if (result !== undefined) {
                    if (!this.isScopeOK(node, result, formatter)) {
                        result = undefined;
                    }
                }
                return true;
            }
            return false;
        });

        return result;
    }

    private isScopeOK(
        node: SyntaxNode,
        result: CodeEdit | CodeEdit[],
        formatter: IFormatter
    ): boolean {
        if (formatter instanceof BlockFormater) {
            return true;
        }

        // console.log("BAD SCOPE - TODO");
        return true;
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
