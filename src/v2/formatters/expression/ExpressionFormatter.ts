import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { IConfigurationManager } from "../../../utils/IConfigurationManager";
import { ExpressionSettings } from "./ExpressionSettings";
import { logicalKeywords, SyntaxNodeType } from "../../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class ExpressionFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "expressionFormatting";
    private readonly settings: ExpressionSettings;
    private lastComparisonExpressionColumn = 0;
    private currentlyInsideParentheses = false;

    /**
     * Creates a new instance of ExpressionFormatter, which is a formatter for expressions, i.e.,
     * logical, comparison, additive, multiplicative, assignment, unary, new, and var expressions.
     *
     * @param configurationManager The configuration manager holding the configuration of the formatter.
     */
    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new ExpressionSettings(configurationManager);
    }
    match(node: Readonly<SyntaxNode>): boolean {
        if (
            node.type === SyntaxNodeType.LogicalExpression ||
            node.type === SyntaxNodeType.ComparisonExpression ||
            node.type === SyntaxNodeType.ParenthesizedExpression ||
            node.type === SyntaxNodeType.AdditiveExpression ||
            node.type === SyntaxNodeType.MultiplicativeExpression ||
            node.type === SyntaxNodeType.UnaryExpression
        ) {
            return true;
        }
        return false;
    }
    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const text = FormatterHelper.getCurrentText(node, fullText);

        let newText = "";
        if (
            node.type === SyntaxNodeType.LogicalExpression &&
            this.settings.newLineAfterLogical()
        ) {
            newText = this.collectLogicalStructure(node, fullText);
        } else {
            newText = FormatterHelper.collectExpression(node, fullText);
        }
        return this.getCodeEdit(node, text, newText, fullText);
    }
    private collectLogicalStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getLogicalExpressionString(child, fullText)
            );
        });

        if (
            this.settings.newLineAfterLogical() &&
            !this.hasLogicalExpressionParent(node)
        ) {
            resultString = FormatterHelper.addIndentation(
                resultString,
                node.startPosition.column,
                fullText.eolDelimiter
            );
        }

        return resultString;
    }

    private getLogicalExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        switch (node.type) {
            case SyntaxNodeType.LogicalExpression:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            case logicalKeywords.hasFancy(node.type, ""):
                newString = this.settings.newLineAfterLogical()
                    ? " " +
                      FormatterHelper.getCurrentText(node, fullText).trim() +
                      fullText.eolDelimiter
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
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

    private hasLogicalExpressionParent(node: Readonly<SyntaxNode>): boolean {
        if (node.parent === null) {
            return false;
        }
        if (node.parent.type === SyntaxNodeType.LogicalExpression) {
            return true;
        }
        if (node.parent.type === SyntaxNodeType.ParenthesizedExpression) {
            return this.hasLogicalExpressionParent(node.parent);
        }
        return false;
    }
}
