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
import { ExpressionFormatter } from "../expression/ExpressionFormatter";

@RegisterFormatter
export class IfFormatter extends AFormatter implements IFormatter {
    private startColumn = 0;
    private ifBodyValue = "";
    private readonly expressionFormattingEnabled: boolean;

    public static readonly formatterLabel = "ifFormatting";
    private readonly settings: IfSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new IfSettings(configurationManager);
        this.expressionFormattingEnabled = !!configurationManager.get("expressionFormatting");
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
            FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled),
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

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getIfExpressionString(child, fullText)
            );
        });

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
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim()
                    : " " +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
                break;
            case SyntaxNodeType.DoBlock:
                newString = this.settings.newLineBeforeDo()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim()
                    : " " +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
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
                newString = FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled);
                break;
            default: {
                // If this is a LogicalExpression and expression formatting is enabled,
                // use ExpressionFormatter to handle it properly
                if (this.expressionFormattingEnabled && node.type === SyntaxNodeType.LogicalExpression) {
                    const expressionFormatter = new ExpressionFormatter(this.configurationManager);
                    const formattedExpression = expressionFormatter.parse(node, fullText);
                    if (formattedExpression && !Array.isArray(formattedExpression)) {
                        newString = formattedExpression.text.trimEnd();
                    } else {
                        const text = FormatterHelper.getCurrentText(node, fullText).trim();
                        newString = text.length === 0 ? "" : " " + text;
                    }
                } else {
                    const text = FormatterHelper.getCurrentTextFormatted(
                        node, fullText, this.expressionFormattingEnabled).trim();
                    newString = text.length === 0 ? "" : " " + text;
                }
                break;
            }
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
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim()
                    : " " +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
                break;
            case SyntaxNodeType.ElseKeyword:
                newString =
                    fullText.eolDelimiter +
                    " ".repeat(this.startColumn) +
                    FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
                break;
            case SyntaxNodeType.DoBlock:
                newString = this.settings.newLineBeforeDo()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim()
                    : " " +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
                newString = newString.trimEnd();
                break;
            case afterThenStatements.hasFancy(node.type, ""):
                newString = this.settings.newLineBeforeStatement()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      " ".repeat(this.settings.tabSize()) +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim()
                    : " " +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled);
                break;
            default: {
                // If this is a LogicalExpression and expression formatting is enabled,
                // use ExpressionFormatter to handle it properly
                if (this.expressionFormattingEnabled && node.type === SyntaxNodeType.LogicalExpression) {
                    const expressionFormatter = new ExpressionFormatter(this.configurationManager);
                    const formattedExpression = expressionFormatter.parse(node, fullText);
                    if (formattedExpression && !Array.isArray(formattedExpression)) {
                        newString = formattedExpression.text.trimEnd();
                    } else {
                        const text = FormatterHelper.getCurrentText(node, fullText).trim();
                        newString = text.length === 0 ? "" : " " + text;
                    }
                } else {
                    const text = FormatterHelper.getCurrentTextFormatted(
                        node, fullText, this.expressionFormattingEnabled).trim();
                    newString = text.length === 0 ? "" : " " + text;
                }
                break;
            }
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
                    FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
                break;
            case SyntaxNodeType.DoBlock:
                newString = this.settings.newLineBeforeDo()
                    ? fullText.eolDelimiter +
                      " ".repeat(this.startColumn) +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim()
                    : " " +
                      FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled).trim();
                newString = newString.trimEnd();
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentTextFormatted(node, fullText, this.expressionFormattingEnabled);
                break;
            default: {
                // If this is a LogicalExpression and expression formatting is enabled,
                // use ExpressionFormatter to handle it properly
                if (this.expressionFormattingEnabled && node.type === SyntaxNodeType.LogicalExpression) {
                    const expressionFormatter = new ExpressionFormatter(this.configurationManager);
                    const formattedExpression = expressionFormatter.parse(node, fullText);
                    if (formattedExpression && !Array.isArray(formattedExpression)) {
                        newString = formattedExpression.text.trimEnd();
                    } else {
                        const text = FormatterHelper.getCurrentText(node, fullText).trim();
                        newString = text.length === 0 ? "" : " " + text;
                    }
                } else {
                    const text = FormatterHelper.getCurrentTextFormatted(
                        node, fullText, this.expressionFormattingEnabled).trim();
                    newString = text.length === 0 ? "" : " " + text;
                }
                break;
            }
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

