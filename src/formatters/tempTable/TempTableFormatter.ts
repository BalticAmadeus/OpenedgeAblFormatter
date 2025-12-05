import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { TempTableSettings } from "./TempTableSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { definitionKeywords, SyntaxNodeType } from "../../model/SyntaxNodeType";

@RegisterFormatter
export class TempTableFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "temptableFormatting";
    private readonly settings: TempTableSettings;
    private alignType = 0;
    private hasFieldOptions = false;
    private alignFieldOptions = 0;
    private startColumn = 0;
    private temptableValueColumn = 0;
    private temptableBodyValue = "";

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new TempTableSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.TemptableDefinition) {
            return true;
        }
        return false;
    }

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.hasFieldOptions = false;
        this.collectTemptableStructure(node, fullText);
        const text = FormatterHelper.getCurrentText(node, fullText);
        this.collectTemptableString(node, fullText);
        return this.getCodeEdit(node, text, this.temptableBodyValue, fullText);
    }

    private collectTemptableString(node: SyntaxNode, fullText: FullText) {
        this.startColumn = FormatterHelper.getActualStatementIndentation(
            node,
            fullText
        );
        this.temptableValueColumn = this.startColumn + this.settings.tabSize();
        this.temptableBodyValue = this.getTemptableBlock(node, fullText);
    }

    private getTemptableBlock(node: SyntaxNode, fullText: FullText): string {
        let resultString = "";
        const children: SyntaxNode[] = [];

        // Collect all children
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) {
                children.push(child);
            }
        }

        for (const child of children) {
            if (child.type === "comment") {
                const commentText = FormatterHelper.getCurrentText(child, fullText);

                // Check if comment contains newlines (block comment on own line)
                if (commentText.includes("\n") || commentText.includes("\r")) {
                    const lines = commentText.split(fullText.eolDelimiter);
                    let foundFirstCommentLine = false;

                    for (const line of lines) {
                        const trimmedLine = line.trim();

                        // Skip empty lines at the beginning
                        if (trimmedLine.length === 0 && !foundFirstCommentLine) {
                            continue;
                        }

                        // Once we find a non-empty line, add this and all subsequent lines
                        if (trimmedLine.length > 0) {
                            if (!foundFirstCommentLine) {
                                // First line - add with newline prefix
                                foundFirstCommentLine = true;
                                resultString += fullText.eolDelimiter + line;
                            } else {
                                // Continuation lines - add with newline
                                resultString += fullText.eolDelimiter + line;
                            }
                        }
                    }
                } else {
                    // Comment was inline (no newlines) - keep it inline
                    resultString += commentText;
                }
            } else {
                // Format the non-comment child
                resultString += this.getTemptableExpressionString(
                    child,
                    fullText.eolDelimiter.concat(" ".repeat(this.temptableValueColumn)),
                    fullText
                );
            }
        }

        resultString += this.getFormattedEndDot(fullText.eolDelimiter);
        return resultString;
    }

    private getFormattedEndDot(separator: string,): string {
        if (this.settings.endDotLocationNew()) {
            return separator + "."; 
        } else {
            return ".";
        }
    }

    private collectTemptableStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): void {
        node.children.forEach((child) => {
            this.getTemptableStructure(child, fullText);
        });
    }

    private getTemptableStructure(node: SyntaxNode, fullText: FullText): void {
        switch (node.type) {
            case SyntaxNodeType.FieldClause:
                node.children.forEach((child) => {
                    this.getFieldStructure(child, fullText);
                });
                break;
        }
    }

    private getFieldStructure(node: SyntaxNode, fullText: FullText): void {
        switch (node.type) {
            case SyntaxNodeType.Identifier:
                this.alignType = Math.max(
                    this.alignType,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
            case SyntaxNodeType.TypeTuning:
                this.alignFieldOptions = Math.max(
                    this.alignFieldOptions,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
            case SyntaxNodeType.FieldOption:
                this.hasFieldOptions = true;
                break;
        }
    }

    private collectFieldString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        node.children.forEach((child) => {
            newString = newString.concat(this.getFieldString(child, fullText));
        });
        return newString;
    }

    private getFieldString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        const text = FormatterHelper.getCurrentText(node, fullText).trim();
        switch (node.type) {
            case SyntaxNodeType.FieldKeyword:
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                break;
            case SyntaxNodeType.TypeTuning:
                newString = this.collectTypeTuningString(node, fullText);
                if (this.hasFieldOptions) {
                    newString =
                        newString +
                        " ".repeat(this.alignFieldOptions - text.length);
                }
                break;
            case SyntaxNodeType.Identifier:
                newString =
                    " " + text + " ".repeat(this.alignType - text.length);
                break;

            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                newString = text.length === 0 ? "" : " " + text;
                break;
        }
        return newString;
    }

    private collectTypeTuningString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getTypeTuningString(child, fullText)
            );
        });
        return resultString;
    }

    private getTypeTuningString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        const text = FormatterHelper.getCurrentText(node, fullText).trim();
        switch (node.type) {
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                newString = text.length === 0 ? "" : " " + text;
                break;
        }
        return newString;
    }

    private getTemptableExpressionString(
        node: SyntaxNode,
        separator: string,
        fullText: FullText
    ): string {
        let newString = "";

        switch (node.type) {
            case definitionKeywords.hasFancy(node.type, ""):
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            case SyntaxNodeType.FieldClause:
                newString = separator + this.collectFieldString(node, fullText);
                break;
            case SyntaxNodeType.IndexClause:
                node.children.forEach((child) => {
                    newString = newString.concat(
                        this.getTemptableExpressionString(
                            child,
                            fullText.eolDelimiter.concat(
                                " ".repeat(this.temptableValueColumn)
                            ),
                            fullText
                        )
                    );
                });

                newString = separator + newString;
                break;
            case SyntaxNodeType.LikeKeyword:
                if (
                    node.parent!.type.trim() === SyntaxNodeType.FieldClause ||
                    node.parent!.type.trim() === SyntaxNodeType.IndexClause
                ) {
                    newString =
                        " " +
                        FormatterHelper.getCurrentText(node, fullText).trim();
                } else {
                    newString =
                        separator +
                        FormatterHelper.getCurrentText(node, fullText).trim();
                }
                break;
            case SyntaxNodeType.FieldKeyword:
            case SyntaxNodeType.IndexKeyword:
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                newString =
                    " " + FormatterHelper.getCurrentText(node, fullText).trim();
                break;
        }
        return newString;
    }
}
