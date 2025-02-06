import { SyntaxNode } from "web-tree-sitter";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { AFormatter } from "../AFormatter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { ArrayAccessSettings } from "./ArrayAccessSettings";

@RegisterFormatter
export class ArrayAccessFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "arrayAccessFormatting";
    private readonly settings: ArrayAccessSettings;
    private formattingArrayLiteral: boolean = false;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new ArrayAccessSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (
            node.type === SyntaxNodeType.ArrayAccess ||
            node.type === SyntaxNodeType.ArrayLiteral
        ) {
            return true;
        }

        return false;
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.formattingArrayLiteral = node.type === SyntaxNodeType.ArrayLiteral;
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        const text = this.collectString(node, fullText);
        return this.getCodeEdit(node, oldText, text, fullText);
    }

    private collectString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        node.children.forEach((child) => {
            resultString = resultString.concat(this.getString(child, fullText));
        });
        return resultString;
    }

    private getString(node: SyntaxNode, fullText: Readonly<FullText>): string {
        let newString = "";
        if (node.type === SyntaxNodeType.LeftBracket) {
            newString = FormatterHelper.getCurrentText(node, fullText).trim();
            if (this.formattingArrayLiteral) {
                newString = " " + newString;
            }
        } else if (
            node.type === SyntaxNodeType.RightBracket ||
            (node.previousSibling !== null &&
                node.previousSibling.type === SyntaxNodeType.LeftBracket)
        ) {
            newString = FormatterHelper.getCurrentText(
                node,
                fullText
            ).trimStart();
        } else {
            if (this.formattingArrayLiteral) {
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                if (
                    node.type === SyntaxNodeType.CommaKeyword &&
                    this.settings.addSpaceAfterComma()
                ) {
                    newString += " ";
                }
            } else {
                newString = FormatterHelper.getCurrentText(node, fullText);
            }
        }
        return newString;
    }
}
