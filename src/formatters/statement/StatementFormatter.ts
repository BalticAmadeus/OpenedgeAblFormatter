import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { StatementSettings } from "./StatementSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";

@RegisterFormatter
export class StatementFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "statementFormatting";
    private readonly settings: StatementSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new StatementSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (
            node.type === SyntaxNodeType.AblStatement ||
            node.type === SyntaxNodeType.ReturnStatement ||
            node.type === SyntaxNodeType.InputOutputStatement ||
            node.type === SyntaxNodeType.ReleaseStatement
        ) {
            return true;
        }
        return false;
    }
    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        const numberOfLines = oldText.split("\n").length;
        // Leave multi line statements unformatted
        if (numberOfLines > 1) {
            return this.getCodeEdit(node, oldText, oldText, fullText);
        }
        const newText = this.collectStatement(node, fullText);

        return this.getCodeEdit(node, oldText, newText, fullText);
    }

    private collectStatement(node: SyntaxNode, fullText: FullText): string {
        let resultString = "";
        let firstChild = true;

        node.children.forEach((child) => {
            if (firstChild) {
                resultString = resultString.concat(
                    FormatterHelper.getCurrentText(child, fullText).trim()
                );
                firstChild = false;
            } else {
                resultString = resultString.concat(
                    this.getStatementString(child, fullText)
                );
            }
        });
        if (FormatterHelper.getCurrentText(node, fullText).endsWith(".")) {
            resultString = resultString.concat(".");
        }
        return resultString;
    }

    private getStatementString(node: SyntaxNode, fullText: FullText): string {
        let resultString = "";
        const text = FormatterHelper.getCurrentText(node, fullText).trim();
        switch (node.type) {
            case SyntaxNodeType.Error:
                if (text.toUpperCase() === "ERROR") {
                    resultString = " " + text;
                } else {
                    resultString = FormatterHelper.getCurrentText(
                        node,
                        fullText
                    );
                }
                break;
            default:
                resultString = text.length === 0 ? "" : " " + text;
                break;
        }
        return resultString;
    }
}
