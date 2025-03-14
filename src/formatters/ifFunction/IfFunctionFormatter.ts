import { SyntaxNode } from "tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { IfFunctionSettings } from "./IfFunctionSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class IfFunctionFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "ifFunctionFormatting";
    private startColumn = 0;

    private readonly settings: IfFunctionSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new IfFunctionSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.TernaryExpression) {
            return true;
        }
        return false;
    }
    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const text = FormatterHelper.getCurrentText(node, fullText);
        let newText = this.collectStructure(node, fullText);

        if (this.settings.addParentheses()) {
            const parent = node.parent;
            if (
                parent === null ||
                parent.type !== SyntaxNodeType.ParenthesizedExpression
            ) {
                newText = this.addParenthesesAroundExpression(newText);
                if (!this.hasTernaryExpressionParent(node)) {
                    /*
                        The expression gets pushed by 1 space since the '(' is added at the start
                    */
                    const delta =
                        1 + (this.settings.newLineBeforeElse() ? 1 : 0);
                    newText = FormatterHelper.addIndentation(
                        newText,
                        delta,
                        fullText.eolDelimiter
                    );
                }
            }
        }

        return this.getCodeEdit(node, text, newText, fullText);
    }

    private collectStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getIfExpressionString(child, fullText)
            );
        });

        if (
            this.settings.newLineBeforeElse() &&
            !this.hasTernaryExpressionParent(node)
        ) {
            const delta =
                node.startPosition.column +
                FormatterHelper.getActualTextIndentation(
                    resultString,
                    fullText
                ) -
                (this.settings.addParentheses() ? 1 : 0);

            resultString = FormatterHelper.addIndentation(
                resultString,
                delta,
                fullText.eolDelimiter
            );
        }

        return resultString;
    }

    private getIfExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        switch (node.type) {
            case SyntaxNodeType.TernaryExpression:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            case SyntaxNodeType.ParenthesizedExpression:
                node.children.forEach((child) => {
                    newString = newString.concat(
                        FormatterHelper.getParenthesizedExpressionString(
                            child,
                            fullText
                        )
                    );
                });
                break;
            case SyntaxNodeType.ElseKeyword:
                newString = this.settings.newLineBeforeElse()
                    ? " " +
                      fullText.eolDelimiter +
                      FormatterHelper.getCurrentText(node, fullText).trim()
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
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

    private getParenthesizedExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ) {
        let newString = "";
        if (node.type === SyntaxNodeType.LeftParenthesis) {
            newString =
                " " + FormatterHelper.getCurrentText(node, fullText).trim();
        } else if (
            node.previousSibling !== null &&
            node.previousSibling.type === SyntaxNodeType.LeftParenthesis
        ) {
            newString = FormatterHelper.getCurrentText(
                node,
                fullText
            ).trimStart();
        } else {
            newString = FormatterHelper.getCurrentText(node, fullText);
        }
        return newString;
    }

    private addParenthesesAroundExpression(expression: string): string {
        const trimmedExpression = expression.trim();
        return expression.replace(trimmedExpression, `(${trimmedExpression})`);
    }

    private hasTernaryExpressionChildren(node: Readonly<SyntaxNode>): boolean {
        let foundTernaryExpression = false;
        node.children.forEach((child) => {
            if (child.type === SyntaxNodeType.TernaryExpression) {
                foundTernaryExpression = true;
                return;
            } else if (child.type === SyntaxNodeType.ParenthesizedExpression) {
                if (this.hasTernaryExpressionChildren(child)) {
                    foundTernaryExpression = true;
                    return;
                }
            }
        });
        return foundTernaryExpression;
    }

    private hasTernaryExpressionParent(node: Readonly<SyntaxNode>): boolean {
        if (node.parent === null) {
            return false;
        }
        if (node.parent.type === SyntaxNodeType.TernaryExpression) {
            return true;
        }
        if (node.parent.type === SyntaxNodeType.ParenthesizedExpression) {
            return this.hasTernaryExpressionParent(node.parent);
        }
        return false;
    }
}
