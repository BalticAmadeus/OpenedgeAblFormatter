import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import {
    definitionKeywords,
    parameterTypes,
    parentheses,
    SyntaxNodeType,
} from "../../../model/SyntaxNodeType";
import { FunctionParameterSettings } from "./FunctionParameterSettings";
import { IConfigurationManager } from "../../../utils/IConfigurationManager";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class FunctionParameterFormatter
    extends AFormatter
    implements IFormatter
{
    public static readonly formatterLabel = "functionParamaterFormatting";
    private readonly settings: FunctionParameterSettings;
    private alignType = 0;
    private alignParameterType = 0;
    private alignParameters = 0;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new FunctionParameterSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.Parameters) {
            return true;
        }
        return false;
    }
    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        const numberOfFunctionParameters = node.children.filter(
            (child) => child.type === SyntaxNodeType.FunctionParameter
        ).length;

        console.log("Parameters: " + numberOfFunctionParameters);
        console.log("nodeParent: " + node.type);
        node.children.forEach((child) => {
            console.log("childType: " + child.type);
        });

        this.collectStructure(node, fullText);
        console.log("alignType: " + this.alignType);
        console.log("alignParameterType: " + this.alignParameterType);
        const newText = this.collectString(node, fullText);
        return this.getCodeEdit(node, oldText, newText, fullText);
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

    private collectStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): void {
        node.children.forEach((child) => {
            this.getStructure(child, fullText);
        });
    }

    private getStructure(node: SyntaxNode, fullText: Readonly<FullText>): void {
        switch (node.type) {
            case SyntaxNodeType.LeftParenthesis:
                this.alignParameters = node.startPosition.column + 1;
                break;
            case SyntaxNodeType.FunctionParameter:
                node.children.forEach((child) => {
                    this.getParameterStructure(child, fullText);
                });
                break;
        }
    }

    private getParameterStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): void {
        switch (node.type) {
            case SyntaxNodeType.Identifier:
                this.alignType = Math.max(
                    this.alignType,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
            case parameterTypes.hasFancy(node.type, ""):
                this.alignParameterType = Math.max(
                    this.alignParameterType,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
        }
    }
    private getString(node: SyntaxNode, fullText: Readonly<FullText>): string {
        let newString = "";
        switch (node.type) {
            case parentheses.hasFancy(node.type, ""):
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                break;
            case SyntaxNodeType.FunctionParameter:
                newString = this.collectParameterString(node, fullText);
                break;
            case SyntaxNodeType.CommaKeyword:
                newString =
                    FormatterHelper.getCurrentText(node, fullText).trim() +
                    fullText.eolDelimiter +
                    " ".repeat(this.alignParameters);
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default: {
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString = text.length === 0 ? "" : " " + text;
                break;
            }
        }
        return newString;
    }

    private collectParameterString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getParameterString(child, fullText)
            );
        });
        return resultString;
    }

    private getParameterString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        switch (node.type) {
            case SyntaxNodeType.DotKeyword:
                break;
            case definitionKeywords.hasFancy(node.type, ""):
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trimEnd();
                break;
            case SyntaxNodeType.Identifier:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString = text + " ".repeat(this.alignType - text.length);
                break;
            case parameterTypes.hasFancy(node.type, ""): {
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString =
                    " " +
                    text +
                    " ".repeat(this.alignParameterType - text.length);
                break;
            }
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default: {
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString = text.length === 0 ? "" : " " + text;
                break;
            }
        }
        return newString;
    }
}
