import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { EnumSettings } from "./EnumSettings";
import { IConfigurationManager } from "../../../utils/IConfigurationManager";
import { SyntaxNodeType } from "../../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class EnumFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "enumFormatting";
    private readonly settings: EnumSettings;
    private startColumn = 0;
    private alignColumn = 0;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new EnumSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        return node.type === SyntaxNodeType.EnumDefinition;
    }
    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const oldText = FormatterHelper.getCurrentText(node, fullText);

        const newText = this.collectEnumStructure(node, fullText);
        console.log("Enum:\n" + newText);
        return this.getCodeEdit(node, oldText, newText, fullText);
    }

    private collectEnumStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        this.startColumn = FormatterHelper.getActualStatementIndentation(
            node,
            fullText
        );
        let foundFirstMember = false;
        let resultString = "";
        node.children.forEach((child) => {
            const childString = this.getEnumExpressionString(
                child,
                fullText,
                foundFirstMember
            );
            if (!foundFirstMember && child.type === SyntaxNodeType.EnumMember) {
                foundFirstMember = true;
                this.alignColumn = this.startColumn + resultString.length;
            }
            resultString = resultString.concat(childString);
        });
        return resultString;
    }

    private getEnumExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        foundFirstMember: boolean
    ): string {
        let newString = "";
        console.log("childType: " + node.type);

        switch (node.type) {
            case SyntaxNodeType.EnumMember:
                newString = foundFirstMember
                    ? fullText.eolDelimiter +
                      " ".repeat(this.alignColumn) +
                      FormatterHelper.getCurrentText(node, fullText).trim()
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case SyntaxNodeType.DotKeyword:
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
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
}
