import { SyntaxNode } from "web-tree-sitter";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { IfSettings } from "./IfSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import {
    afterThenStatements,
    SyntaxNodeType,
} from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class IfFormatter extends AFormatter implements IFormatter {
    private startColumn = 0;
    private ifBodyValue = "";

    public static readonly formatterLabel = "ifFormatting";
    private readonly settings: IfSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new IfSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (
            node.type === SyntaxNodeType.IfStatement ||
            node.type === SyntaxNodeType.ElseIfStatement
        ) {
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
        this.collectIfStructure(node, fullText);

        return this.getCodeEdit(
            node,
            FormatterHelper.getCurrentText(node, fullText),
            this.ifBodyValue,
            fullText
        );
    }

    private collectIfStructure(node: SyntaxNode, fullText: Readonly<FullText>) {
        this.startColumn = this.getStartColumn(node);
        this.ifBodyValue = this.getCaseBodyBranchBlock(node, fullText);
    }

    private getCaseBodyBranchBlock(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";

        node.children.forEach((child, index) => {
            if (child.type === "comment") {
                const commentText = FormatterHelper.getCurrentText(child, fullText);

                // Check if this comment is inline with the previous node
                let isInline = false;
                if (index > 0) {
                    const prev = node.children[index - 1];
                    if (prev) {
                        const between = fullText.text.substring(prev.endIndex, child.startIndex);
                        if (!between.includes("\n")) {
                            isInline = true;
                        }
                    }
                }

                if (isInline) {
                    resultString += " " + commentText.trim();
                    if (process.send) {
                        process.send({ type: "log", message: `[IfFormatter] Adding inline comment at index ${index}: ${JSON.stringify(commentText)}` });
                    }
                } else {
                    // Get the original indentation from the first line of the comment in the source
                    const commentStart = child.startIndex;
                    const lineStart = fullText.text.lastIndexOf('\n', commentStart - 1) + 1;
                    const indentMatch = fullText.text.substring(lineStart, commentStart).match(/^\s*/);
                    const baseIndent = indentMatch ? indentMatch[0] : "";

                    const lines = commentText.split(/\r?\n/);
                    lines.forEach((line, idx) => {
                        // Only add baseIndent if the line does not already start with it (or is empty)
                        let outLine = line;
                        if (line.trim().length > 0 && !line.startsWith(baseIndent)) {
                            outLine = baseIndent + line.trimStart();
                        }
                        resultString += fullText.eolDelimiter + outLine.trimEnd();
                    });

                    if (process.send) {
                        process.send({ type: "log", message: `[IfFormatter] Adding block comment node at index ${index} with indent "${baseIndent.replace(/ /g, ".")}": ${JSON.stringify(commentText)}` });
                    }
                }
            } else {
                if (process.send) {
                    process.send({ type: "log", message: `[IfFormatter] Non-comment node, calling getIfExpressionString.` });
                }
                resultString = resultString.concat(
                    this.getIfExpressionString(child, fullText)
                );
            }
        });

        if (process.send) {
            process.send({ type: "log", message: `[IfFormatter] getCaseBodyBranchBlock result (first 300): ${JSON.stringify(resultString.substring(0, 300))}` });
        }
        return resultString.trim();
    }

    private getIfExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.ThenKeyword:
                newString = this.settings.newLineBeforeThen()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      FormatterHelper.getCurrentText(node, fullText).trim()
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case SyntaxNodeType.DoBlock:
                newString = this.settings.newLineBeforeDo()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      FormatterHelper.getCurrentText(node, fullText).trim()
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case afterThenStatements.hasFancy(node.type, ""):
                newString = this.settings.newLineBeforeStatement()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      " ".repeat(this.settings.tabSize()) +
                      FormatterHelper.getCurrentTextMultilineAdjust(
                          node,
                          fullText,
                          this.startColumn +
                              this.settings.tabSize() -
                              node.startPosition.column
                      ).trim()
                    : " " +
                      FormatterHelper.getCurrentTextMultilineAdjust(
                          node,
                          fullText,
                          this.startColumn +
                              this.settings.tabSize() -
                              node.startPosition.column
                      ).trim();
                break;
            case SyntaxNodeType.ElseIfStatement:
                newString = node.children
                    .map((child) =>
                        this.getElseIfStatementPart(child, fullText)
                    )
                    .join("");

                break;
            case SyntaxNodeType.ElseStatement:
                newString = node.children
                    .map((child) => this.getElseStatementPart(child, fullText))
                    .join("");
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

    private getElseStatementPart(node: SyntaxNode, fullText: FullText): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.ThenKeyword:
                newString = this.settings.newLineBeforeThen()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      FormatterHelper.getCurrentText(node, fullText).trim()
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case SyntaxNodeType.ElseKeyword:
                newString =
                    fullText.eolDelimiter +
                    " ".repeat(this.startColumn) +
                    FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case SyntaxNodeType.DoBlock:
                newString = this.settings.newLineBeforeDo()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      FormatterHelper.getCurrentText(node, fullText).trim()
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
                newString = newString.trimEnd();
                break;
            case afterThenStatements.hasFancy(node.type, ""):
                newString = this.settings.newLineBeforeStatement()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      " ".repeat(this.settings.tabSize()) +
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

    private getElseIfStatementPart(
        node: SyntaxNode,
        fullText: FullText
    ): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.ElseKeyword:
                newString =
                    fullText.eolDelimiter +
                    " ".repeat(this.startColumn) +
                    FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case SyntaxNodeType.DoBlock:
                newString = this.settings.newLineBeforeDo()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      FormatterHelper.getCurrentText(node, fullText).trim()
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
                newString = newString.trimEnd();
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

    private getStartColumn(node: SyntaxNode): number {
        if (node.type === SyntaxNodeType.IfStatement) {
            return node.startPosition.column;
        } else {
            return this.findParentIfStatementStartColumn(node);
        }
    }

    private findParentIfStatementStartColumn(node: SyntaxNode): number {
        if (node.parent === null) {
            return 0;
        }

        return node.type === SyntaxNodeType.IfStatement
            ? node.startPosition.column
            : this.findParentIfStatementStartColumn(node.parent);
    }
}
