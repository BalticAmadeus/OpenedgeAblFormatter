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

        this.settingsOverride(parseResult);

        const formatters = FormatterFactory.getFormatterInstances(
            this.configurationManager
        );

        await this.iterateTree(parseResult.tree, fullText, formatters);

        console.log("[FormattingEngine] Re-parsing after initial formatting");
        const newParseResult = await this.parserHelper.parseAsync(
            this.fileIdentifier,
            fullText.text,
            parseResult.tree
        );

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
        console.log(
            "[FormattingEngine] Starting tree iteration - collecting all edits first"
        );

        // First pass: collect all code edits without applying them
        const allCodeEdits: {
            edit: CodeEdit | CodeEdit[];
            node: SyntaxNode;
        }[] = [];

        const collectEditsFromNode = (node: SyntaxNode): void => {
            // Process the current node
            if (!bodyBlockKeywords.hasFancy(node.type, "")) {
                const codeEdit = this.parse(node, fullText, formatters);

                if (codeEdit !== undefined) {
                    console.log(
                        `[FormattingEngine] Code edit collected for ${node.type}:`,
                        Array.isArray(codeEdit)
                            ? codeEdit.map((e) => `"${e.text}"`).join(", ")
                            : `"${codeEdit.text}"`
                    );

                    // Collect the edit for later application
                    allCodeEdits.push({ edit: codeEdit, node });
                }
            }

            // Recursively process all child nodes
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    collectEditsFromNode(child);
                }
            }
        };

        // Start the recursive collection from the root node
        collectEditsFromNode(tree.rootNode);

        // Second pass: apply all edits in reverse order (from end to beginning)
        // This ensures that position indices remain valid throughout the application
        console.log(
            `[FormattingEngine] Applying ${allCodeEdits.length} collected edits in reverse order`
        );

        // Sort edits by their start position in descending order (last to first)
        allCodeEdits.sort((a, b) => {
            const aStartIndex = Array.isArray(a.edit)
                ? a.edit[0].edit.startIndex
                : a.edit.edit.startIndex;
            const bStartIndex = Array.isArray(b.edit)
                ? b.edit[0].edit.startIndex
                : b.edit.edit.startIndex;
            return bStartIndex - aStartIndex; // Descending order
        });

        for (const { edit, node } of allCodeEdits) {
            console.log(
                `[FormattingEngine] Applying edit for ${node.type}:`,
                Array.isArray(edit)
                    ? edit.map((e) => `"${e.text}"`).join(", ")
                    : `"${edit.text}"`
            );

            this.insertChangeIntoFullText(edit, fullText);
            this.numOfCodeEdits++;
        }

        console.log(
            `[FormattingEngine] Tree iteration completed. Applied ${allCodeEdits.length} edits.`
        );
    }

    /*
        This method formats solely the indentation of blocks, therefore, the number of lines remains unchanged.
    */
    private iterateTreeFormatBlocks(
        tree: Tree,
        fullText: FullText,
        formatters: IFormatter[]
    ) {
        console.log(
            "[FormattingEngine] Starting block formatting phase with recursive traversal"
        );

        // Collect all block formatting edits first, then apply them
        const allBlockEdits: Array<{
            edit: CodeEdit | CodeEdit[];
            node: SyntaxNode;
        }> = [];

        const collectBlockEditsFromNode = (node: SyntaxNode): void => {
            // Check if this node is undefined or null
            if (!node) {
                console.warn(
                    "[FormattingEngine] Encountered undefined node during block formatting"
                );
                return;
            }

            // Check if this is a block node that needs formatting
            if (bodyBlockKeywords.hasFancy(node.type, "")) {
                const codeEdit = this.parse(node, fullText, formatters);

                if (codeEdit !== undefined) {
                    // Collect the edit for later application
                    allBlockEdits.push({ edit: codeEdit, node });
                }
            }

            // Recursively process all child nodes
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    collectBlockEditsFromNode(child);
                }
            }
        };

        // Start the recursive collection from the root node
        collectBlockEditsFromNode(tree.rootNode);

        // Apply all block edits in reverse order (from end to beginning)
        console.log(
            `[FormattingEngine] Applying ${allBlockEdits.length} block formatting edits in reverse order`
        );

        // Sort edits by their start position in descending order (last to first)
        allBlockEdits.sort((a, b) => {
            const aStartIndex = Array.isArray(a.edit)
                ? a.edit[0].edit.startIndex
                : a.edit.edit.startIndex;
            const bStartIndex = Array.isArray(b.edit)
                ? b.edit[0].edit.startIndex
                : b.edit.edit.startIndex;
            return bStartIndex - aStartIndex; // Descending order
        });

        for (const { edit, node } of allBlockEdits) {
            console.log(
                `[FormattingEngine] Applying block edit for ${node.type}:`,
                Array.isArray(edit)
                    ? edit.map((e) => `"${e.text}"`).join(", ")
                    : `"${edit.text}"`
            );

            this.insertChangeIntoTree(tree, edit);
            this.insertChangeIntoFullText(edit, fullText);
            this.numOfCodeEdits++;
        }

        console.log(
            `[FormattingEngine] Block formatting completed. Applied ${allBlockEdits.length} edits.`
        );
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
