import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { TempTableSettings } from "./TempTableSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { definitionKeywords, SyntaxNodeType } from "../../model/SyntaxNodeType";

@RegisterFormatter
export class TempTableFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "temptableFormatting";
    private readonly settings: TempTableSettings;
    private alignType = 0;
    private startColumn = 0;
    private temptableValueColumn = 0;
    private temptableBodyValue = "";

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new TempTableSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.TemptableDefinition) {
            return true;
        }
        return false;
    }
    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.collectTemptableStructure(node, fullText);
        const text = FormatterHelper.getCurrentText(node, fullText);
        this.collectTemptableString(node, fullText);
        return this.getCodeEdit(node, text, this.temptableBodyValue, fullText);
    }

    private collectTemptableString(node: SyntaxNode, fullText: FullText) {
        this.startColumn = FormatterHelper.getActualStatementIndentation(
            node,
            fullText
        );
        this.temptableValueColumn = this.startColumn + this.settings.tabSize();
        this.temptableBodyValue = this.getTemptableBlock(node, fullText);
    }

    private getTemptableBlock(node: SyntaxNode, fullText: FullText): string {
        let resultString = "";

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getTemptableExpressionString(
                    child,
                    fullText.eolDelimiter.concat(
                        " ".repeat(this.temptableValueColumn)
                    ),
                    fullText
                )
            );
        });

        resultString += ".";

        return resultString;
    }

    private collectTemptableStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): void {
        node.children.forEach((child) => {
            this.getTemptableStructure(child, fullText);
        });
    }

    private getTemptableStructure(node: SyntaxNode, fullText: FullText): void {
        switch (node.type) {
            case SyntaxNodeType.FieldDefinition:
                node.children.forEach((child) => {
                    this.getFieldStructure(child, fullText);
                });
                break;
        }
    }

    private getFieldStructure(node: SyntaxNode, fullText: FullText): void {
        switch (node.type) {
            case SyntaxNodeType.Identifier:
                this.alignType = Math.max(
                    this.alignType,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
        }
    }

    private collectFieldString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        node.children.forEach((child) => {
            newString = newString.concat(this.getFieldString(child, fullText));
        });
        return newString;
    }

    private getFieldString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let newString = "";
        const text = FormatterHelper.getCurrentText(node, fullText).trim();
        switch (node.type) {
            case SyntaxNodeType.FieldKeyword:
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                break;
            case SyntaxNodeType.TypeTuning:
                newString = this.collectTypeTuningString(node, fullText);
                break;
            case SyntaxNodeType.Identifier:
                newString =
                    " " + text + " ".repeat(this.alignType - text.length);
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                newString = text.length === 0 ? "" : " " + text;
                break;
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

    private getTemptableExpressionString(
        node: SyntaxNode,
        separator: string,
        fullText: FullText
    ): string {
        let newString = "";

        switch (node.type) {
            case definitionKeywords.hasFancy(node.type, ""):
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            case SyntaxNodeType.FieldDefinition:
                newString = separator + this.collectFieldString(node, fullText);
                break;
            case SyntaxNodeType.IndexDefinition:
                node.children.forEach((child) => {
                    newString = newString.concat(
                        this.getTemptableExpressionString(
                            child,
                            fullText.eolDelimiter.concat(
                                " ".repeat(this.temptableValueColumn)
                            ),
                            fullText
                        )
                    );
                });

                newString = separator + newString;
                break;
            case SyntaxNodeType.LikeKeyword:
                if (
                    node.parent!.type.trim() ===
                        SyntaxNodeType.FieldDefinition ||
                    node.parent!.type.trim() === SyntaxNodeType.IndexDefinition
                ) {
                    newString =
                        " " +
                        FormatterHelper.getCurrentText(node, fullText).trim();
                } else {
                    newString =
                        separator +
                        FormatterHelper.getCurrentText(node, fullText).trim();
                }
                break;
            case SyntaxNodeType.FieldKeyword:
            case SyntaxNodeType.IndexKeyword:
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                newString =
                    " " + FormatterHelper.getCurrentText(node, fullText).trim();
                break;
        }
        return newString;
    }
}
