import { SyntaxNode } from "web-tree-sitter";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { CaseSettings } from "./CaseSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import {
    afterThenStatements,
    SyntaxNodeType,
} from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class CaseFormatter extends AFormatter implements IFormatter {
    private startColumn = 0;
    private caseBodyValue = "";

    public static readonly formatterLabel = "caseFormatting";
    private readonly settings: CaseSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new CaseSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        return (
            node.type === SyntaxNodeType.CaseWhenBranch ||
            node.type === SyntaxNodeType.CaseOtherwiseBranch
        );
    }

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.collectCaseStructure(node, fullText);
        return this.getCodeEdit(
            node,
            FormatterHelper.getCurrentText(node, fullText),
            this.caseBodyValue,
            fullText
        );
    }

    private collectCaseStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ) {
        this.startColumn = FormatterHelper.getActualStatementIndentation(
            node,
            fullText
        );
        this.caseBodyValue = this.getCaseBodyBranchBlock(node, fullText);
    }

    private getCaseBodyBranchBlock(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getCaseExpressionString(child, fullText)
            );
        });

        return resultString;
    }

    private getCaseExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.Comment:
                newString = this.formatComment(node, fullText);
                break;
            case SyntaxNodeType.WhenKeyword:
            case SyntaxNodeType.OtherwiseKeyword:
                newString =
                    fullText.eolDelimiter +
                    " ".repeat(this.startColumn) +
                    FormatterHelper.getCurrentText(node, fullText).trim();
                break;
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
                      " ".repeat(this.startColumn + this.settings.tabSize()) +
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
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                if (text.length === 0) {
                    newString = "";
                } else if (this.isAfterStandaloneComment(node, fullText)) {
                    // Preserve the whitespace between comment and this node,
                    // plus the original node text, to maintain positions for nested formatters
                    const prevSibling = node.previousSibling;
                    const startPos = prevSibling
                        ? prevSibling.endIndex
                        : node.startIndex;
                    newString = fullText.text.substring(startPos, node.endIndex);
                } else {
                    newString = " " + text;
                }
                break;
        }

        return newString;
    }

    private formatComment(node: SyntaxNode, fullText: FullText): string {
        const commentText = FormatterHelper.getCurrentText(node, fullText);

        let isInline = false;
        const prevSibling = node.previousSibling;
        if (prevSibling) {
            const between = fullText.text.substring(
                prevSibling.endIndex,
                node.startIndex
            );
            if (!between.includes("\n")) {
                isInline = true;
            }
        }

        if (isInline) {
            return " " + commentText.trim();
        } else {
            const commentStart = node.startIndex;
            const lineStart =
                fullText.text.lastIndexOf("\n", commentStart - 1) + 1;
            const indentMatch = fullText.text
                .substring(lineStart, commentStart)
                .match(/^\s*/);
            const baseIndent = indentMatch ? indentMatch[0] : "";

            const lines = commentText.split(fullText.eolDelimiter);
            let result = "";
            lines.forEach((line) => {
                let outLine = line;
                if (line.trim().length > 0 && !line.startsWith(baseIndent)) {
                    outLine = baseIndent + line.trimStart();
                }
                result += fullText.eolDelimiter + outLine.trimEnd();
            });
            return result;
        }
    }

    private isAfterStandaloneComment(
        node: SyntaxNode,
        fullText: FullText
    ): boolean {
        const prevSibling = node.previousSibling;
        if (prevSibling && prevSibling.type === SyntaxNodeType.Comment) {
            const between = fullText.text.substring(
                prevSibling.endIndex,
                node.startIndex
            );
            return between.includes("\n");
        }
        return false;
    }
}
