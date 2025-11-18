import { SyntaxNode } from "web-tree-sitter";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { AFormatter } from "../AFormatter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { ForSettings } from "./ForSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";

@RegisterFormatter
export class ForFormatter extends AFormatter implements IFormatter {
    private startColumn = 0;
    private forBodyValue = "";
    private alignEach = 0;
    private eachStatementsFound = 0;

    public static readonly formatterLabel = "forFormatting";
    private readonly settings: ForSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new ForSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.ForStatement) {
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
        this.eachStatementsFound = 0;
        this.collectForStructure(node, fullText);

        return this.getCodeEdit(
            node,
            FormatterHelper.getCurrentText(node, fullText),
            this.forBodyValue,
            fullText
        );
    }

    private collectForStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ) {
        this.startColumn = FormatterHelper.getActualStatementIndentation(
            node,
            fullText
        );
        this.forBodyValue = this.getForStatementBlock(node, fullText);
    }

    private getForStatementBlock(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        let alignColumn = 0;

        node.children.forEach((child) => {
            if (
                this.eachStatementsFound < 2 &&
                child.type === SyntaxNodeType.Identifier
            ) {
                alignColumn = this.startColumn + resultString.length;
            } else if (child.type === SyntaxNodeType.EachKeyword) {
                this.alignEach = this.startColumn + resultString.length;
                console.log("AlignEach: " + this.alignEach);
            }
            resultString = resultString.concat(
                this.getForExpressionString(child, fullText, alignColumn)
            );
        });

        return resultString;
    }

    private getForExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        alignColumn: number
    ): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.Label:
                newString =
                    FormatterHelper.getCurrentText(node, fullText).trimStart() +
                    fullText.eolDelimiter;
                break;
            case SyntaxNodeType.ForKeyword:
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trimEnd();
                break;
            case SyntaxNodeType.EachKeyword:
                this.eachStatementsFound++;
                if (this.eachStatementsFound > 1) {
                    newString = newString.concat(
                        fullText.eolDelimiter,
                        " ".repeat(this.startColumn + this.settings.tabSize()),
                        FormatterHelper.getCurrentText(node, fullText).trim()
                    );
                } else {
                    newString =
                        " " +
                        FormatterHelper.getCurrentText(node, fullText).trim();
                }
                break;
            case SyntaxNodeType.DotKeyword:
            case SyntaxNodeType.ColonKeyword:
            case SyntaxNodeType.CommaKeyword:
            case SyntaxNodeType.Body:
            case SyntaxNodeType.Label:
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                break;
            case SyntaxNodeType.WhereClause:
                newString = this.getWhereClauseBlock(
                    node,
                    fullText,
                    alignColumn
                );
                if (!this.settings.whereClauseLocation()) {
                    newString = FormatterHelper.alignIndentation(
                        newString,
                        alignColumn + 1,
                        fullText.eolDelimiter
                    );
                } else {
                    newString = FormatterHelper.alignIndentation(
                        newString,
                        this.alignEach,
                        fullText.eolDelimiter
                    );
                }
                break;
            case SyntaxNodeType.EndKeyword:
                newString =
                    fullText.eolDelimiter +
                    " ".repeat(this.startColumn) +
                    FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case SyntaxNodeType.SortClause:
                newString =
                    fullText.eolDelimiter +
                    " ".repeat(alignColumn) +
                    this.getSortClauseText(node, fullText, alignColumn);
                break;
            case SyntaxNodeType.ForPhrase:
                newString = this.getSortClauseBlock(
                    node,
                    fullText,
                    alignColumn
                );
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString = text.length === 0 ? "" : " " + text;
                break;
        }

        return newString;
    }

    private getWhereClauseBlock(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        alignColumn: number
    ): string {
        let resultString = "";

        node.children.forEach((child) => {
            switch (child.type) {
                case SyntaxNodeType.WhereKeyword:
                    if (true || this.settings.whereClauseLocation()) {
                        resultString = resultString.concat(
                            fullText.eolDelimiter,
                            " ".repeat(this.alignEach),
                            FormatterHelper.getCurrentText(
                                child,
                                fullText
                            ).trim()
                        );
                        break;
                    } else {
                        resultString = resultString.concat(
                            " ",
                            FormatterHelper.getCurrentText(
                                child,
                                fullText
                            ).trim(),
                            fullText.eolDelimiter,
                            " ".repeat(alignColumn)
                        );
                    }
                    break;
                default:
                    const text = FormatterHelper.getCurrentText(
                        child,
                        fullText
                    ).trim();
                    resultString = resultString.concat(
                        text.length === 0 ? "" : " " + text
                    );
                    break;
            }
            console.log("ResultString in Where: " + resultString);
        });

        return resultString;
    }

    private getSortClauseText(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        alignColumn: number
    ): string {
        let resultString = "";

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getSortClauseChildText(child, fullText, alignColumn)
            );
        });

        return resultString;
    }

    private getSortClauseChildText(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        alignColumn: number
    ): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.SortColumn:
                newString = "";
                node.children.forEach((child) => {
                    newString = newString.concat(
                        this.getSortColumnChildText(
                            child,
                            fullText,
                            alignColumn
                        )
                    );
                });
                break;
            default:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString = text.length === 0 ? "" : " " + text;
                break;
        }

        return newString;
    }

    private getSortColumnChildText(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        alignColumn: number
    ): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.TernaryExpression:
                newString =
                    " " +
                    FormatterHelper.addIndentation(
                        FormatterHelper.getCurrentText(node, fullText).trim(),
                        -node.startPosition.column + alignColumn + 3, // this assumes that if the sort column contains a ternary expression, then it does not contain anything else
                        fullText.eolDelimiter
                    ).trim();
                break;
            default:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString = text.length === 0 ? "" : " " + text;
                break;
        }

        return newString;
    }

    private getSortClauseBlock(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        alignColumn: number
    ): string {
        let resultString = "";

        node.children.forEach((child) => {
            switch (child.type) {
                case SyntaxNodeType.EachKeyword:
                    resultString = resultString.concat(
                        fullText.eolDelimiter,
                        " ".repeat(this.startColumn + this.settings.tabSize()),
                        FormatterHelper.getCurrentText(child, fullText).trim()
                    );
                    break;
                case SyntaxNodeType.SortClause:
                    resultString = resultString.concat(
                        fullText.eolDelimiter,
                        " ".repeat(alignColumn),
                        this.getSortClauseText(child, fullText, alignColumn)
                    );
                    break;
                default:
                    const text = FormatterHelper.getCurrentText(
                        child,
                        fullText
                    ).trim();
                    resultString = resultString.concat(
                        text.length === 0 ? "" : " " + text
                    );
                    break;
            }
        });

        return resultString;
    }
}
