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
    private eachStatementsFound = 0;
    private readonly expressionFormattingEnabled: boolean;

    public static readonly formatterLabel = "forFormatting";
    private readonly settings: ForSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new ForSettings(configurationManager);
        this.expressionFormattingEnabled = !!configurationManager.get("expressionFormatting");
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
            FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled),
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
                    FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trimStart() +
                    fullText.eolDelimiter;
                break;
            case SyntaxNodeType.ForKeyword:
                newString = FormatterHelper.getCurrentTextFormatted(
                    node, fullText, this.expressionFormattingEnabled).trimEnd();
                break;
            case SyntaxNodeType.EachKeyword:
                this.eachStatementsFound++;
                if (this.eachStatementsFound > 1) {
                    newString = newString.concat(
                        fullText.eolDelimiter,
                        " ".repeat(this.startColumn + this.settings.tabSize()),
                        FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim()
                    );
                } else {
                    newString =
                        " " +
                        FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
                }
                break;
            case SyntaxNodeType.DotKeyword:
            case SyntaxNodeType.ColonKeyword:
            case SyntaxNodeType.CommaKeyword:
            case SyntaxNodeType.Body:
            case SyntaxNodeType.Label:
                newString = FormatterHelper.getCurrentTextFormatted(
                    node, fullText, this.expressionFormattingEnabled).trim();
                break;
            case SyntaxNodeType.WhereClause:
                newString = this.getWhereClauseBlock(
                    node,
                    fullText,
                    alignColumn
                );
                newString = FormatterHelper.alignIndentation(
                    newString,
                    alignColumn + 1,
                    fullText.eolDelimiter
                );
                break;
            case SyntaxNodeType.EndKeyword:
                newString =
                    fullText.eolDelimiter +
                    " ".repeat(this.startColumn) +
                    FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
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
                newString = FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled);
                break;
            default:
                const text = FormatterHelper.getCurrentTextFormatted(
                    node, fullText, this.expressionFormattingEnabled).trim();
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
                    resultString = resultString.concat(
                        " ",
                        FormatterHelper.getCurrentTextFormatted(child, fullText, this.expressionFormattingEnabled).trim(),
                        fullText.eolDelimiter,
                        " ".repeat(alignColumn)
                    );
                    break;
                default:
                    const text = FormatterHelper.getCurrentTextFormatted(
                        child, fullText, this.expressionFormattingEnabled).trim();
                    resultString = resultString.concat(
                        text.length === 0 ? "" : " " + text
                    );
                    break;
            }
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
                const text = FormatterHelper.getCurrentTextFormatted(
                    node, fullText, this.expressionFormattingEnabled).trim();
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
                        FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim(),
                        -node.startPosition.column + alignColumn + 3, // this assumes that if the sort column contains a ternary expression, then it does not contain anything else
                        fullText.eolDelimiter
                    ).trim();
                break;
            default:
                const text = FormatterHelper.getCurrentTextFormatted(
                    node, fullText, this.expressionFormattingEnabled).trim();
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
                        FormatterHelper.getCurrentTextFormatted(child, fullText, this.expressionFormattingEnabled).trim()
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
                    const text = FormatterHelper.getCurrentTextFormatted(
                        child, fullText, this.expressionFormattingEnabled).trim();
                    resultString = resultString.concat(
                        text.length === 0 ? "" : " " + text
                    );
                    break;
            }
        });

        return resultString;
    }
}

