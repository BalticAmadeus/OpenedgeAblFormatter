import { SyntaxNode } from "web-tree-sitter";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { AFormatter } from "../AFormatter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { FindSettings } from "./FindSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";

@RegisterFormatter
export class FindFormatter extends AFormatter implements IFormatter {
    private startColumn = 0;
    private findBodyValue = "";

    public static readonly formatterLabel = "findFormatting";
    private readonly settings: FindSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new FindSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        return node.type === SyntaxNodeType.FindStatement;
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.collectCaseStructure(node, fullText);
        return this.getCodeEdit(
            node,
            FormatterHelper.getCurrentText(node, fullText),
            this.findBodyValue,
            fullText
        );
    }

    private collectCaseStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ) {
        this.startColumn = node.startPosition.column;
        this.findBodyValue = this.getFindStatementBlock(node, fullText);
    }

    private getFindStatementBlock(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        let alignColumn = 0;

        node.children.forEach((child) => {
            if (child.type === SyntaxNodeType.Identifier) {
                alignColumn = this.startColumn + resultString.length;
            }
            resultString = resultString.concat(
                this.getFindExpressionString(child, fullText, alignColumn)
            );
        });

        return resultString + ".";
    }

    private getFindExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        alignColumn: number
    ): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.FindKeyword:
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
                newString = FormatterHelper.alignIndentation(
                    newString,
                    alignColumn + 1,
                    fullText.eolDelimiter
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
                    resultString = resultString.concat(
                        " ",
                        FormatterHelper.getCurrentText(child, fullText).trim(),
                        fullText.eolDelimiter,
                        " ".repeat(alignColumn)
                    );
                    break;
                case SyntaxNodeType.Error:
                    resultString = resultString.concat(
                        FormatterHelper.getCurrentText(node, fullText)
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
