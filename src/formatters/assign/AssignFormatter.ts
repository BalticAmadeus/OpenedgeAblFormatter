import { Node } from "web-tree-sitter";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { AssignSettings } from "./AssignSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";

@RegisterFormatter
export class AssignFormatter extends AFormatter implements IFormatter {
    private startColumn = 0;
    private assignBodyValue = "";

    public static readonly formatterLabel = "assignFormatting";
    private readonly settings: AssignSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new AssignSettings(configurationManager);
    }

    match(node: Readonly<Node>): boolean {
        return node.type === SyntaxNodeType.AssignStatement;
    }

    parse(
        node: Readonly<Node>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.collectAssignStructure(node, fullText);
        return this.getCodeEdit(
            node,
            FormatterHelper.getCurrentText(node, fullText),
            this.assignBodyValue,
            fullText
        );
    }

    private collectAssignStructure(
        node: Node,
        fullText: Readonly<FullText>
    ) {
        this.startColumn = this.getStartColumn(node);
        this.assignBodyValue = this.getAssignBlock(node, fullText);
    }

    private getAssignBlock(
        node: Node,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        let longestLeft = this.getLongestLeft(node.children, fullText);

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getAssigStatementString(child, fullText, longestLeft)
            );
        });

        resultString += this.getFormattedEndDot(fullText);

        return resultString;
    }

    private getFormattedEndDot(fullText: Readonly<FullText>): string {
        if (this.settings.endDotAlignment()) {
            return (
                fullText.eolDelimiter +
                " ".repeat(this.startColumn + this.settings.tabSize()) +
                "."
            );
        } else if (this.settings.endDotLocationNew()) {
            return fullText.eolDelimiter + ".";
        } else {
            return ".";
        }
    }

    private getAssigStatementString(
        node: Node,
        fullText: Readonly<FullText>,
        longestLeft: number
    ): string {
        let assignString = "";

        switch (node.type) {
            case SyntaxNodeType.AssignKeyword:
                assignString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
            case SyntaxNodeType.Assignment:
                assignString += this.getAssignmentString(
                    node,
                    fullText,
                    longestLeft
                );
                break;
            case SyntaxNodeType.Error:
                assignString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                assignString = text.length === 0 ? "" : " " + text;
                break;
        }
        return assignString;
    }

    private getAssignmentString(
        node: Node,
        fullText: Readonly<FullText>,
        longestLeft: number
    ): string {
        let newString = "";

        const [leftNode, middleNode, rightNode, whenExpressionNode] =
            node.children;
        if (leftNode && middleNode && rightNode) {
            const leftText = FormatterHelper.getCurrentText(
                leftNode,
                fullText
            ).trim();
            const middleText = FormatterHelper.getCurrentText(
                middleNode,
                fullText
            ).trim();
            const rightText = FormatterHelper.getCurrentText(
                rightNode,
                fullText
            ).trim();

            let paddedLeftText = this.settings.alignRightExpression()
                ? leftText.padEnd(longestLeft)
                : leftText;

            newString = this.settings.newLineAfterAssign()
                ? fullText.eolDelimiter +
                  " ".repeat(this.startColumn + this.settings.tabSize()) +
                  paddedLeftText +
                  " " +
                  middleText +
                  " " +
                  rightText
                : " " + paddedLeftText + " " + middleText + " " + rightText;
        }
        if (whenExpressionNode) {
            newString += this.formatWhenExpression(
                whenExpressionNode,
                fullText
            );
        }
        return newString;
    }

    private formatWhenExpression(
        whenExpressionNode: Node,
        fullText: Readonly<FullText>
    ): string {
        let formattedString = "";

        if (this.settings.newLineAfterAssign()) {
            formattedString +=
                fullText.eolDelimiter +
                " ".repeat(this.startColumn + this.settings.tabSize() - 1);
        }

        whenExpressionNode.children.forEach((child) => {
            formattedString +=
                " " + FormatterHelper.getCurrentText(child, fullText).trim();
        });

        return formattedString;
    }

    private getLongestLeft(
        assignments: Node[],
        fullText: FullText
    ): number {
        let longestLeft = 0;

        assignments.forEach((assignment) => {
            const leftChild = assignment.child(0);

            const leftLength = leftChild
                ? FormatterHelper.getCurrentText(leftChild, fullText).trim()
                      .length
                : 0;

            if (leftLength > longestLeft) {
                longestLeft = leftLength;
            }
        });
        return longestLeft;
    }

    private getStartColumn(node: Node): number {
        if (node.type === SyntaxNodeType.AssignStatement) {
            return node.startPosition.column;
        } else {
            return this.findParentAssignStatementStartColumn(node);
        }
    }

    private findParentAssignStatementStartColumn(node: Node): number {
        if (node.parent === null) {
            return 0;
        }

        const result =
            node.type === SyntaxNodeType.CaseStatement
                ? node.startPosition.column
                : this.findParentAssignStatementStartColumn(node.parent);

        return result;
    }
}
