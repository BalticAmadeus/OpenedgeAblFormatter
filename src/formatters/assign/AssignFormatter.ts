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
            // Format the child
            if (child.type === "comment") {
                // Direct child comment
                const commentText = FormatterHelper.getCurrentText(child, fullText);
                
                // Check if comment contains newlines (block comment on own line)
                // Note: it might start with spaces/trailing whitespace before the newline
                if (commentText.includes("\n") || commentText.includes("\r")) {
                    // Comment was on its own line (or has newlines in it)
                    // Split by lines and find the actual comment line
                    const lines = commentText.split(/\r?\n/);
                    
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        
                        // Skip empty lines
                        if (trimmedLine.length === 0) {
                            continue;
                        }
                        
                        // Check if this line is actually a comment
                        if (trimmedLine.startsWith("/*") || trimmedLine.startsWith("//")) {
                            // Found the comment line - preserve it with its indentation
                            resultString += fullText.eolDelimiter + line;
                            break; // Only take the first comment line
                        }
                    }
                } else {
                    // Comment was inline (no newlines) - keep it inline
                    resultString += commentText;
                }
            } else {
                // Format the assignment
                resultString += this.getAssignStatementString(child, fullText, longestLeft);
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
                : (node.previousSibling?.type === SyntaxNodeType.AssignKeyword // is it first assignment?
                      ? " "
                      : fullText.eolDelimiter +
                        " ".repeat(
                            this.startColumn +
                                SyntaxNodeType.AssignKeyword.length +
                                1
                        )) +
                  paddedLeftText +
                  " " +
                  middleText +
                  " " +
                  rightText;
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