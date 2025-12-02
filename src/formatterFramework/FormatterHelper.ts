import { SyntaxNode } from "web-tree-sitter";
import { Position } from "vscode";
import { FullText } from "../model/FullText";
import { SyntaxNodeType } from "../model/SyntaxNodeType";
import { ExcludeAnnotationType } from "../model/ExcludeAnnotationType";

export class FormatterHelper {
    public static getActualTextIndentation(
        input: string,
        fullText: FullText
    ): number {
        // Use a regular expression to match leading whitespace and new lines
        const regex = new RegExp(`^\\s*${fullText.eolDelimiter}\\s*`);
        const match = input.match(regex);

        if (match) {
            // Get the last part of the match after the last new line
            const lastNewLineIndex = match[0].lastIndexOf(
                fullText.eolDelimiter
            );
            const leadingSpaces = match[0].slice(lastNewLineIndex + 1);
            // Return the number of spaces after the last new line
            return leadingSpaces.length;
        }
        // Return 0 if there are no leading spaces and new lines before text starts
        return input.length - input.trimStart().length;
    }

    public static getActualTextRow(input: string, fullText: FullText): number {
        let newLineCount = 0;
        let encounteredNonWhitespace = false;
        const eolDelimiter = fullText.eolDelimiter;

        for (let i = 0; i < input.length; i++) {
            if (input.substr(i, eolDelimiter.length) === eolDelimiter) {
                newLineCount++;
                i += eolDelimiter.length - 1;
            } else if (!/\s/.test(input[i])) {
                encounteredNonWhitespace = true;
                break;
            }
        }

        return encounteredNonWhitespace ? newLineCount : 0;
    }

    public static getActualStatementIndentation(
        node: SyntaxNode,
        fullText: FullText
    ): number {
        const nodeText = FormatterHelper.getCurrentText(node, fullText);

        if (nodeText.match(/^[^\s]/)) {
            return node.startPosition.column;
        }

        // Use a regular expression to match leading whitespace and new lines
        const regex = new RegExp(`^\\s*${fullText.eolDelimiter}\\s*`);
        const match = nodeText.match(regex);
        if (match) {
            // Get the last part of the match after the last new line
            const lastNewLineIndex = match[0].lastIndexOf(
                fullText.eolDelimiter
            );
            const leadingSpaces = match[0].slice(
                lastNewLineIndex + fullText.eolDelimiter.length
            );
            // Return the number of spaces after the last new line
            return leadingSpaces.length;
        }
        // Return 0 if there are no leading spaces and new lines before text starts
        return nodeText.length - nodeText.trimStart().length;
    }

    public static getCurrentText(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): string {
        if (node !== undefined && fullText !== undefined) {
            const text = fullText.text.substring(node.startIndex, node.endIndex);
            // Debug log for all assignments to find the problematic one
            // if (node.type === 'assignment' || node.type === 'variable_assignment' || node.type === 'assign_statement') {
            //     console.log(`[FormatterHelper.getCurrentText] ${node.type}: startIndex=${node.startIndex}, endIndex=${node.endIndex}, fullText.length=${fullText.text.length}, extracted.length=${text.length}`);
            //     if (text.includes('Instance.ID')) {
            //         console.log(`[FormatterHelper.getCurrentText] >>> FOUND Instance.ID ASSIGNMENT <<<`);
            //         console.log(`[FormatterHelper.getCurrentText] Full text: "${text}"`);
            //     }
            // }
            return text;
        }
        return "";
    }

    public static getBodyText(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): string {
        let text = this.getCurrentText(node, fullText);
        let firstColonIndex = text.indexOf(":");
        return text.substring(firstColonIndex + 1);
    }

    public static getCurrentTextMultilineAdjust(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>,
        moveDelta: number
    ): string {
        const text = FormatterHelper.getCurrentText(node, fullText);
        return FormatterHelper.addIndentation(
            text,
            moveDelta,
            fullText.eolDelimiter
        );
    }

    public static addIndentation(
        text: string,
        moveDelta: number,
        eolDelimiter: string
    ): string {
        // Split the text into lines
        const lines = text.split(eolDelimiter);

        // Add indentation to each line except the first one
        const indentedLines = lines.map((line, index) => {
            return index === 0
                ? line
                : " ".repeat(
                      Math.max(
                          0,
                          FormatterHelper.countLeadingSpaces(line) + moveDelta
                      )
                  ) + line.trim();
        });

        // Join the lines back into a single string
        return indentedLines.join(eolDelimiter);
    }

    public static alignIndentation(
        text: string,
        leadingSpaces: number,
        eolDelimiter: string
    ): string {
        // Split the text into lines
        const lines = text.split(eolDelimiter);

        // Change indentation to each line except the first one
        const indentedLines = lines.map((line, index) => {
            return index === 0 ? line : " ".repeat(leadingSpaces) + line.trim();
        });

        // Join the lines back into a single string
        return indentedLines.join(eolDelimiter);
    }

    private static countLeadingSpaces(text: string): number {
        // Use a regular expression to match leading spaces
        const match = text.match(/^(\s*)/);
        // If there's a match, return the length of the matched string; otherwise, return 0
        return match ? match[1].length : 0;
    }

    public static collectExpression(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";

        if (node.type === SyntaxNodeType.ParenthesizedExpression) {
            node.children.forEach((child) => {
                resultString = resultString.concat(
                    this.getParenthesizedExpressionString(child, fullText)
                );
            });
            return resultString;
        } else {
            let currentlyInsideParentheses = new Boolean(false);
            node.children.forEach((child) => {
                resultString = resultString.concat(
                    this.getExpressionString(
                        child,
                        fullText,
                        currentlyInsideParentheses
                    )
                );
            });
            if (node.type === SyntaxNodeType.Assignment) {
                // In this case, we need to trim the spaces at the start of the string as well
                resultString = resultString.trimStart();
            } else if (node.type === SyntaxNodeType.VariableAssignment) {
                resultString = resultString.trimStart() + ".";
            }
            const parent = node.parent;
            if (
                parent !== null &&
                (parent.type === SyntaxNodeType.ArrayAccess ||
                    parent.type === SyntaxNodeType.Argument ||
                    parent.type === SyntaxNodeType.Arguments ||
                    parent.type === SyntaxNodeType.AblStatement)
            ) {
                return resultString.trim();
            } else {
                return resultString.trimEnd();
            }
        }
    }

    private static getExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        currentlyInsideParentheses: Boolean
    ): string {
        if (currentlyInsideParentheses === true) {
            return this.getParenthesizedExpressionString(node, fullText);
        }
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.ParenthesizedExpression:
                node.children.forEach((child) => {
                    newString = newString.concat(
                        this.getParenthesizedExpressionString(child, fullText)
                    );
                });
                break;
            case SyntaxNodeType.LeftParenthesis:
                currentlyInsideParentheses = true;
                newString = this.getParenthesizedExpressionString(
                    node,
                    fullText
                );
                break;
            case SyntaxNodeType.RightParenthesis:
                currentlyInsideParentheses = false;
                newString = this.getParenthesizedExpressionString(
                    node,
                    fullText
                );
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

    public static getParenthesizedExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ) {
        let newString = "";
        if (node.type === SyntaxNodeType.LeftParenthesis) {
            const skipBefore = FormatterHelper.hasSkipKeyword(node);
            newString =
                (skipBefore ? "" : " ") +
                FormatterHelper.getCurrentText(node, fullText).trim();
        } else if (
            node.type === SyntaxNodeType.RightParenthesis ||
            (node.previousSibling !== null &&
                node.previousSibling.type === SyntaxNodeType.LeftParenthesis)
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

    public static hasSkipKeyword(node: SyntaxNode): boolean | null {
        return (
            !!node.parent &&
            !!node.parent.previousSibling &&
            node.parent.previousSibling.type === SyntaxNodeType.SkipKeyword
        );
    }

    public static getExcludedRanges(
        node: SyntaxNode
    ): { start: number; end: number }[] {
        const ranges: { start: number; end: number }[] = [];
        let excludeStart: number | null = null;

        const visit = (n: SyntaxNode) => {
            if (n.type === SyntaxNodeType.Annotation) {
                const text = n.text.replace(/[\s.@"]/g, "").toUpperCase();

                if (text === ExcludeAnnotationType.excludeStartAnnotation) {
                    excludeStart = n.startPosition.row;
                } else if (
                    text === ExcludeAnnotationType.excludeEndAnnotation
                ) {
                    if (excludeStart !== null) {
                        ranges.push({
                            start: excludeStart,
                            end: n.endPosition.row,
                        });
                        excludeStart = null;
                    } else {
                        ranges.push({
                            start: n.startPosition.row,
                            end: n.endPosition.row,
                        });
                    }
                }
            }

            n.children.forEach(visit);
        };

        visit(node);

        const uniqueRanges = ranges.filter(
            (currentRange, currentIndex, allRanges) =>
                currentIndex ===
                allRanges.findIndex(
                    (otherRange) =>
                        otherRange.start === currentRange.start &&
                        otherRange.end === currentRange.end
                )
        );

        return uniqueRanges;
    }
}
