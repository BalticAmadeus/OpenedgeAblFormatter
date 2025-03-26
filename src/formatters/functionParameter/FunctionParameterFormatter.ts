import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import {
    dataStructureKeywords,
    definitionKeywords,
    parameterTypes,
    parentheses,
    SyntaxNodeType,
} from "../../model/SyntaxNodeType";
import { FunctionParameterSettings } from "./FunctionParameterSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class FunctionParameterFormatter
    extends AFormatter
    implements IFormatter
{
    public static readonly formatterLabel = "functionParameterFormatting";
    private readonly settings: FunctionParameterSettings;
    private alignType = 0;
    private alignParameterType = 0;
    private alignParameterMode = 0;
    private alignParameters = 0;
    private typeTuningInCurrentParameter = false;
    private parameterModeInCurrentParameter = false;

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

        if (numberOfFunctionParameters === 0) {
            return undefined;
        }

        if (
            node.parent !== null &&
            node.parent.type === SyntaxNodeType.FunctionStatement &&
            numberOfFunctionParameters === 1
        ) {
            // In this case, if we try to format something, the code gets messed up. I'm not sure why, so for now we just don't format.
            return undefined;
            return this.getCodeEdit(node, oldText, oldText, fullText);
        }

        this.collectStructure(node, fullText);
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
            case SyntaxNodeType.FunctionParameterMode:
                this.alignParameterMode = Math.max(
                    this.alignParameterMode,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
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
        this.typeTuningInCurrentParameter = node.children.some(
            (child) => child.type === SyntaxNodeType.TypeTuning
        );
        this.parameterModeInCurrentParameter = node.children.some(
            (child) => child.type === SyntaxNodeType.FunctionParameterMode
        );

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
            case dataStructureKeywords.hasFancy(node.type, ""):
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                if (this.parameterModeInCurrentParameter) {
                    newString = " " + newString;
                }
                break;
            case SyntaxNodeType.FunctionParameterMode:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString = text;

                // Add a space because the structure is, for example, "INPUT identifier AS TypeTuning", so we need a space before the identifier.
                if (this.typeTuningInCurrentParameter) {
                    newString += " ".repeat(
                        this.settings.alignTypes()
                            ? this.alignParameterMode - text.length + 1
                            : 1
                    );
                }
                break;
            case SyntaxNodeType.Identifier: {
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                // No type-tuning implies that the type is DATASET, DATASET-HANDLE, TABLE or TABLE-HANDLE, and the identifier itself is not at the start of the parameter.
                if (!this.typeTuningInCurrentParameter) {
                    newString = " " + text;
                } else {
                    newString = this.settings.alignTypes()
                        ? text + " ".repeat(this.alignType - text.length)
                        : text;
                }
                break;
            }
            case SyntaxNodeType.TypeTuning:
                newString = this.collectTypeTuningString(node, fullText);
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

    private collectTypeTuningString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getTypeTuningString(child, fullText)
            );
        });
        return resultString;
    }

    private getTypeTuningString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        const text = FormatterHelper.getCurrentText(node, fullText).trim();
        switch (node.type) {
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                newString = text.length === 0 ? "" : " " + text;
                break;
        }
        return newString;
    }
}
