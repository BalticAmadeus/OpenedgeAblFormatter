import { SyntaxNode } from "web-tree-sitter";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { bodyBlockKeywords, SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { AFormatter } from "../AFormatter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { BlockSettings } from "./BlockSettings";

@RegisterFormatter
export class BlockFormater extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "blockFormatting";
    private readonly settings: BlockSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new BlockSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (!bodyBlockKeywords.hasFancy(node.type, "")) {
            return false;
        }

        let parent = node.parent;
        if (parent === null || parent.type === SyntaxNodeType.ForStatement) {
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
        let sibling = parent.previousNamedSibling;

        if (parent.type === SyntaxNodeType.DoBlock) {
            /* Workaround until tree-sitter fixes this */
            for (let i = 0; i < 5 && sibling !== null; i++) {
                if (sibling.type === SyntaxNodeType.OnStatement) {
                    parent = sibling;
                    formattingOnStatement = true;
                    break;
                }
                sibling = sibling.previousNamedSibling;
            }

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
        let indexOfColon = node.startPosition.column;
        let deltaBetweenStartAndColon = 0;
        let colonDelta = 0;
        let blockStatementsStartRows = node.children
            .filter((child) => {
                if (child.type === SyntaxNodeType.ColonKeyword) {
                    // indexOfColon = child.startPosition.column;
                    colonDelta =
                        child.endPosition.column - child.startPosition.column;
                    deltaBetweenStartAndColon =
                        child.startPosition.row - parent.startPosition.row;
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

        let linesBeforeColumn = FormatterHelper.getCurrentText(parent, fullText)
            .split(fullText.eolDelimiter)
            .slice(0, deltaBetweenStartAndColon);
        const onlyWhiteSpacesBeforeColumnLine = linesBeforeColumn.every(
            (line) => line.trim() === ""
        );

        let codeLines = FormatterHelper.getCurrentText(parent, fullText).split(
            fullText.eolDelimiter
        );

        // Check if body starts on same line as current node (method signature: body content)
        // Only split for method/function/procedure/constructor/destructor, not for class/do/repeat/etc
        // Detect and split inline statements after colon BEFORE slicing
        // Note: node is a 'body' type, parent is the actual statement type (method_statement, etc.)
        const shouldSplitInlineStatements =
            parent &&
            (parent.type === SyntaxNodeType.MethodStatement ||
                parent.type === SyntaxNodeType.FunctionStatement ||
                parent.type === SyntaxNodeType.ProcedureStatement ||
                parent.type === SyntaxNodeType.ConstructorDefinition ||
                parent.type === SyntaxNodeType.DestructorDefinition);

        if (
            shouldSplitInlineStatements &&
            codeLines.length > deltaBetweenStartAndColon
        ) {
            const lineWithPotentialInlineContent =
                codeLines[deltaBetweenStartAndColon];

            if (
                lineWithPotentialInlineContent &&
                lineWithPotentialInlineContent.includes(":")
            ) {
                const colonPos = lineWithPotentialInlineContent.indexOf(":");

                if (colonPos >= 0) {
                    const signaturePart =
                        lineWithPotentialInlineContent
                            .substring(0, colonPos)
                            .trimEnd() + ":";
                    const bodyPart = lineWithPotentialInlineContent
                        .substring(colonPos + 1)
                        .trimStart();

                    // Only split if there's actual statement content (not empty or just whitespace)
                    // and it looks like a statement (starts with a keyword like define, return, etc.)
                    // and it's NOT a true one-liner (doesn't have "end" on the same line)
                    const startsWithStatement =
                        /^(define|def|defi|var|return|if|for|do|assign|create|find|message)/i.test(
                            bodyPart
                        );
                    const hasEndOnSameLine = /\bend\b/i.test(bodyPart);

                    if (
                        bodyPart.length > 0 &&
                        startsWithStatement &&
                        !hasEndOnSameLine
                    ) {
                        // Split the line
                        codeLines[deltaBetweenStartAndColon] = signaturePart;
                        codeLines.splice(
                            deltaBetweenStartAndColon + 1,
                            0,
                            bodyPart
                        );

                        // Update blockStatementsStartRows
                        if (blockStatementsStartRows.length > 0) {
                            const firstBlockStatementRow =
                                blockStatementsStartRows[0];
                            blockStatementsStartRows.unshift(
                                firstBlockStatementRow - 1
                            );
                            blockStatementsStartRows =
                                blockStatementsStartRows.map(
                                    (currentRow, index) =>
                                        index === 0
                                            ? currentRow
                                            : currentRow + 1
                                );
                        }
                    }
                }
            }
        }

        if (!onlyWhiteSpacesBeforeColumnLine) {
            codeLines = codeLines.slice(deltaBetweenStartAndColon);
        }

        // Do not do any changes for one-liner blocks
        if (codeLines.length <= 1) {
            const text = FormatterHelper.getCurrentText(node, fullText);
            return this.getCodeEdit(node, text, text, fullText);
        }

        const firstLine = codeLines[0];

        const lastLine = codeLines[codeLines.length - 1];

        const lastLineMatchesTypicalStructure = this.matchEndPattern(lastLine);
        if (lastLineMatchesTypicalStructure) {
            codeLines.pop();
        }

        if (indexOfColon !== -1) {
            const columnIntervalStart = Math.max(
                0,
                indexOfColon - parent.startPosition.column
            );
            const columnIntervalEnd = Math.min(
                firstLine.length - 1,
                indexOfColon + parent.startPosition.column + colonDelta
            );

            let colonFound = false;

            for (let i = columnIntervalStart; i <= columnIntervalEnd; i++) {
                if (firstLine[i] === ":") {
                    indexOfColon = i;
                    colonFound = true;
                    break;
                }
            }

            if (colonFound) {
                const partAfterColon = firstLine
                    .slice(indexOfColon + 1)
                    .trimStart();
                const statementWithColon =
                    firstLine.slice(0, indexOfColon).trimEnd() + ":";
                // If the part after the colon is not only whitespace, put it on the next line
                if (partAfterColon.trim().length !== 0) {
                    codeLines.shift(); // pop from the start of the list
                    codeLines.unshift(statementWithColon, partAfterColon);
                    const firstBlockStatementRow = blockStatementsStartRows[0];
                    blockStatementsStartRows.shift();
                    blockStatementsStartRows.unshift(
                        firstBlockStatementRow - 1,
                        firstBlockStatementRow
                    );
                    blockStatementsStartRows = blockStatementsStartRows.map(
                        (currentRow) => currentRow + 1
                    );
                }
            }
        }

        // Add back the first lines before column of the block statement
        if (!onlyWhiteSpacesBeforeColumnLine) {
            codeLines = linesBeforeColumn.concat(codeLines);
        }

        let n = 0;
        let lineChangeDelta = 0;
        codeLines.forEach((codeLine, index) => {
            const lineNumber = parent.startPosition.row + index;

            // adjust delta
            if (blockStatementsStartRows[n] === lineNumber) {
                if (index === 0) {
                    lineChangeDelta = 0;
                } else {
                    lineChangeDelta =
                        parentIndentation +
                        indentationStep -
                        FormatterHelper.getActualTextIndentation(
                            codeLine,
                            fullText
                        );
                }

                n++;
            }

            if (lineChangeDelta !== 0) {
                indentationEdits.push({
                    line: index,
                    lineChangeDelta: lineChangeDelta,
                });
            }
        });

        if (lastLineMatchesTypicalStructure) {
            codeLines.push(lastLine);
            const parentOfEndNode = formattingOnStatement
                ? node.parent
                : parent;
            if (parentOfEndNode !== null) {
                const endNode = parentOfEndNode.children.find(
                    (node) => node.type === SyntaxNodeType.EndKeyword
                );

                if (endNode !== undefined) {
                    const endRowDelta =
                        parentIndentation -
                        FormatterHelper.getActualTextIndentation(
                            lastLine,
                            fullText
                        );

                    if (endRowDelta !== 0) {
                        indentationEdits.push({
                            line: codeLines.length - 1,
                            lineChangeDelta: endRowDelta,
                        });
                    }
                }
            }
        } else {
            const parentOfEndNode = formattingOnStatement
                ? node.parent
                : parent;
            if (parentOfEndNode !== null) {
                const endNode = parentOfEndNode.children.find(
                    (node) => node.type === SyntaxNodeType.EndKeyword
                );
                if (endNode !== undefined) {
                    const index = endNode.startPosition.column;
                    const firstPart = lastLine.slice(0, index);
                    const secondPart = lastLine.slice(index).trimEnd();
                    codeLines[codeLines.length - 1] = firstPart;
                    codeLines.push(secondPart);
                    const endRowDelta =
                        parentIndentation -
                        FormatterHelper.getActualTextIndentation(
                            secondPart,
                            fullText
                        );

                    if (endRowDelta !== 0) {
                        indentationEdits.push({
                            line: codeLines.length - 1,
                            lineChangeDelta: endRowDelta,
                        });
                    }
                }
            }
        }

        return this.getCodeEditsFromIndentationEdits(
            parent,
            fullText,
            indentationEdits,
            codeLines
        );
    }

    private getCodeEditsFromIndentationEdits(
        node: SyntaxNode,
        fullText: FullText,
        indentationEdits: IndentationEdits[],
        codeLines: string[]
    ): CodeEdit | CodeEdit[] | undefined {
        const text = FormatterHelper.getCurrentText(node, fullText);
        const newText = this.applyIndentationEdits(
            indentationEdits,
            fullText,
            codeLines
        );

        return this.getCodeEdit(node, text, newText, fullText);
    }

    private applyIndentationEdits(
        edits: IndentationEdits[],
        fullText: FullText,
        lines: string[]
    ): string {
        // Split the code into lines

        // Apply each edit
        edits.forEach((edit) => {
            const { line, lineChangeDelta } = edit;

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

    private matchEndPattern(str: string): boolean {
        /* Returns true if string matches the pattern: (any characters that do not include a dot)end(any characters that do not include a dot).(any characters)
           In essence, it returns true on the case when on a line there is nothing but an end statement.
        */
        const pattern = /^[^.]*end[^.]*\.[^.]*$/i;
        return pattern.test(str);
    }
}

interface IndentationEdits {
    line: number;
    lineChangeDelta: number;
}
