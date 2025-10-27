import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { BodySettings } from "./BodySettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { bodyBlockKeywords, SyntaxNodeType } from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { ExcludeAnnotationType } from "../../model/ExcludeAnnotationType";

@RegisterFormatter
export class BodyFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "bodyFormatting";
    private readonly settings: BodySettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new BodySettings(configurationManager);
    }

    public match(node: Readonly<SyntaxNode>): boolean {
        if (!bodyBlockKeywords.hasFancy(node.type, "")) {
            return false;
        }

        let parent = node.parent;
        if (parent === null || parent.type !== SyntaxNodeType.ForStatement) {
            return false;
        }

        return true;
    }

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    public parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        let indentationEdits: IndentationEdits[] = [];

        let parent = node.parent;

        if (parent === null) {
            return undefined;
        }

        let formattingOnStatement = false;
        if (parent.type === SyntaxNodeType.DoBlock) {
            const grandParent = parent.parent;
            if (
                grandParent !== null &&
                grandParent.type === SyntaxNodeType.OnStatement
            ) {
                parent = grandParent;
                formattingOnStatement = true;
            }
        }

        const parentIndentation = FormatterHelper.getActualStatementIndentation(
            this.getParentIndentationSourceNode(parent),
            fullText
        );

        const indentationStep = this.settings.tabSize();
        const blockStatementsStartRows = node.children
            .filter((child) => {
                if (child.type === ":") {
                    return false;
                }
                return true;
            })
            .map(
                (child) =>
                    child.startPosition.row +
                    FormatterHelper.getActualTextRow(
                        FormatterHelper.getCurrentText(child, fullText),
                        fullText
                    )
            );

        const codeLines = FormatterHelper.getBodyText(node, fullText).split(
            fullText.eolDelimiter
        );

        let n = 0;
        let lineChangeDelta = 0;

        const nonRelatviveExcludedRanges = FormatterHelper.getExcludedRanges(parent);

        const excludedRanges = nonRelatviveExcludedRanges.map((range) => ({
            start: range.start - parent.startPosition.row,
            end: range.end - parent.startPosition.row,
        }));

        codeLines.forEach((codeLine, index) => {
            const lineNumber = node.startPosition.row + index;

            if (
                excludedRanges.some(
                    (r) => lineNumber >= r.start && lineNumber <= r.end
                )
            ) {
                return;
            }

            // adjust delta
            if (blockStatementsStartRows[n] === lineNumber) {
                lineChangeDelta =
                    parentIndentation +
                    indentationStep -
                    FormatterHelper.getActualTextIndentation(
                        codeLine,
                        fullText
                    );

                n++;
            }

            if (lineChangeDelta !== 0) {
                indentationEdits.push({
                    line: index,
                    lineChangeDelta: lineChangeDelta,
                });
            }
        });

        return this.getCodeEditsFromIndentationEdits(
            node,
            fullText,
            indentationEdits,
            excludedRanges
        );
    }

    private getCodeEditsFromIndentationEdits(
        node: SyntaxNode,
        fullText: FullText,
        indentationEdits: IndentationEdits[],
        excludedRanges: { start: number; end: number }[]
    ): CodeEdit | CodeEdit[] | undefined {
        const text = FormatterHelper.getCurrentText(node, fullText);
        const newText = this.applyIndentationEdits(
            text,
            indentationEdits,
            fullText,
            excludedRanges
        );

        return this.getCodeEdit(node, text, newText, fullText);
    }

    private applyIndentationEdits(
        code: string,
        edits: IndentationEdits[],
        fullText: FullText,
        excludedRanges: { start: number; end: number }[]
    ): string {
        // Split the code into lines
        const lines = code.split(fullText.eolDelimiter);

        // Apply each edit
        edits.forEach((edit) => {
            const { line, lineChangeDelta } = edit;

            const isExcluded = excludedRanges.some(
                (r) => line >= r.start && line <= r.end
            );

            if (isExcluded) {
                return;
            }

            // Ensure the line number is within the range
            if (line >= 0 && line < lines.length) {
                const currentLine = lines[line];
                // Count current leading spaces
                const currentLeadingSpaces =
                    RegExp(/^\s*/).exec(currentLine)?.[0].length || 0;
                // Calculate new indentation

                const newLeadingSpaces = Math.max(
                    0,
                    currentLeadingSpaces + lineChangeDelta
                );

                // Update the line with the new indentation

                lines[line] =
                    " ".repeat(newLeadingSpaces) + currentLine.trimStart();
            }
        });

        // Join the lines back into a single string
        return lines.join(fullText.eolDelimiter);
    }

    //refactor
    private getParentIndentationSourceNode(node: SyntaxNode): SyntaxNode {
        if (
            node.type === SyntaxNodeType.DoBlock &&
            node.parent?.type === SyntaxNodeType.IfStatement
        ) {
            return node.parent;
        } else if (
            node.type === SyntaxNodeType.DoBlock &&
            (node.parent?.type === SyntaxNodeType.CaseWhenBranch ||
                node.parent?.type === SyntaxNodeType.CaseOtherwiseBranch)
        ) {
            return node.parent;
        } else if (
            node.type === SyntaxNodeType.DoBlock &&
            (node.parent?.type === SyntaxNodeType.ElseIfStatement ||
                node.parent?.type === SyntaxNodeType.ElseStatement)
        ) {
            if (node.parent.parent === null) {
                return node.parent;
            }

            return node.parent.parent;
        }
        return node;
    }

}

interface IndentationEdits {
    line: number;
    lineChangeDelta: number;
}
