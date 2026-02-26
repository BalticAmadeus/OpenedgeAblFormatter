import { SyntaxNode } from "web-tree-sitter";
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

    match(node: Readonly<SyntaxNode>): boolean {
        return node.type === SyntaxNodeType.AssignStatement;
    }

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    parse(
        node: Readonly<SyntaxNode>,
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
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ) {
        this.startColumn = this.getStartColumn(node);
        this.assignBodyValue = this.getAssignBlock(node, fullText);
    }

    private getAssignBlock(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        const longestLeft = this.getLongestLeft(node.children, fullText);

        const children: SyntaxNode[] = [];
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) {
                children.push(child);
            }
        }

        for (const child of children) {
            if (child.type === SyntaxNodeType.Comment) {
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
                    resultString += commentText;
                }
            } else {
                const assignString = this.getAssignStatementString(child, fullText, longestLeft);

                resultString += assignString;
            }
        }

        resultString += this.getFormattedEndDot(fullText);

        return resultString;
    }

    private getFormattedEndDot(fullText: Readonly<FullText>): string {
        if (this.settings.endDotAlignment()) {
            return (
                fullText.eolDelimiter +
                " ".repeat(
                    this.startColumn +
                        (this.settings.newLineAfterAssign()
                            ? this.settings.tabSize()
                            : SyntaxNodeType.AssignKeyword.length + 1)
                ) +
                "."
            );
        } else if (this.settings.endDotLocationNew()) {
            return fullText.eolDelimiter + ".";
        } else {
            return ".";
        }
    }

    private getAssignStatementString(
        node: SyntaxNode,
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
                break;
            case SyntaxNodeType.Assignment:
                // assignString = FormatterHelper.getCurrentText(node, fullText).trim();
                assignString = this.getAssignmentString(
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
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        longestLeft: number
    ): string {
        const { leftText, middleText, rightText, whenNode } =
            this.getAssignmentDetails(node, fullText);

        if (
            leftText.length === 0 &&
            middleText.length === 0 &&
            rightText.length === 0
        ) {
            return "";
        }

        let paddedLeftText = this.settings.alignRightExpression()
            ? leftText.padEnd(longestLeft)
            : leftText;

        let assignText = this.settings.newLineAfterAssign()
            ? fullText.eolDelimiter +
              " ".repeat(this.startColumn + this.settings.tabSize()) +
              paddedLeftText +
              (middleText ? " " + middleText : "") +
              (rightText ? " " + rightText : "")
            : (node.previousSibling?.type === SyntaxNodeType.AssignKeyword // is it first assignment?
                  ? " "
                  : fullText.eolDelimiter +
                    " ".repeat(
                        this.startColumn +
                            SyntaxNodeType.AssignKeyword.length +
                            1
                    )) +
              paddedLeftText +
              (middleText ? " " + middleText : "") +
              (rightText ? " " + rightText : "");

        if (whenNode) {
            assignText += this.formatWhenExpression(whenNode, fullText);
        }
        return assignText;
    }

    private formatWhenExpression(
        whenExpressionNode: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let formattedString = "";

        whenExpressionNode.children.forEach((child) => {
            formattedString +=
                " " + FormatterHelper.getCurrentText(child, fullText).trim();
        });

        return formattedString;
    }

    private getLongestLeft(
        assignments: SyntaxNode[],
        fullText: FullText
    ): number {
        let longestLeft = 0;

        assignments.forEach((assignment) => {
            if (assignment.type === SyntaxNodeType.Assignment) {
                const { leftText } = this.getAssignmentDetails(
                    assignment,
                    fullText
                );
                if (leftText.length > longestLeft) {
                    longestLeft = leftText.length;
                }
            }
        });
        return longestLeft;
    }

    private getAssignmentDetails(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ) {
        const leftNodes: SyntaxNode[] = [];
        let operatorNode: SyntaxNode | undefined;
        const rightNodes: SyntaxNode[] = [];
        let whenNode: SyntaxNode | undefined;

        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i)!;
            if (child.type === SyntaxNodeType.WhenExpression) {
                whenNode = child;
                break;
            }
            if (
                child.type === SyntaxNodeType.AssignmentOperator ||
                child.text.trim() === "="
            ) {
                operatorNode = child;
                continue;
            }

            if (!operatorNode) {
                leftNodes.push(child);
            } else {
                rightNodes.push(child);
            }
        }

        const leftText = leftNodes
            .map((n) => FormatterHelper.getCurrentText(n, fullText).trim())
            .filter((t) => t.length > 0)
            .join(" ");
        const middleText = operatorNode
            ? FormatterHelper.getCurrentText(operatorNode, fullText).trim()
            : "";
        const rightText = rightNodes
            .map((n) => FormatterHelper.getCurrentText(n, fullText).trim())
            .filter((t) => t.length > 0)
            .join(" ");

        return { leftText, middleText, rightText, whenNode };
    }

    private getStartColumn(node: SyntaxNode): number {
        if (node.type === SyntaxNodeType.AssignStatement) {
            return node.startPosition.column;
        } else {
            return this.findParentAssignStatementStartColumn(node);
        }
    }

    private findParentAssignStatementStartColumn(node: SyntaxNode): number {
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