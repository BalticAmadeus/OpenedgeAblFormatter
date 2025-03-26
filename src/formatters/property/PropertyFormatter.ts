import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { definitionKeywords, SyntaxNodeType } from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { PropertySettings } from "./PropertySettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";

@RegisterFormatter
export class PropertyFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "propertyFormatting";
    private readonly settings: PropertySettings;

    private startColumn = 0;
    private propertyBodyValue = "";

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new PropertySettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.PropertyDefinition) {
            return true;
        }
        return false;
    }
    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.collectPropertyStructure(node, fullText);

        return this.getCodeEdit(
            node,
            FormatterHelper.getCurrentText(node, fullText),
            this.propertyBodyValue,
            fullText
        );
    }

    private collectPropertyStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ) {
        this.startColumn = FormatterHelper.getActualStatementIndentation(
            node,
            fullText
        );

        this.propertyBodyValue = this.getPropertyBlock(node, fullText);
    }

    private getPropertyBlock(node: SyntaxNode, fullText: FullText): string {
        let resultString = "";

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getPropertyExpressionString(child, fullText)
            );
        });

        return resultString;
    }

    private getPropertyExpressionString(
        node: SyntaxNode,
        fullText: FullText
    ): string {
        let newString = "";

        switch (node.type) {
            case definitionKeywords.hasFancy(node.type, ""):
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            case SyntaxNodeType.Getter:
            case SyntaxNodeType.Setter:
                const firstLineWhitespace =
                    FormatterHelper.getActualStatementIndentation(
                        node,
                        fullText
                    );
                const statement = FormatterHelper.addIndentation(
                    FormatterHelper.getCurrentText(node, fullText).trim(),
                    -firstLineWhitespace +
                        this.settings.tabSize() +
                        this.startColumn,
                    fullText.eolDelimiter
                );
                newString =
                    fullText.eolDelimiter +
                    " ".repeat(this.startColumn + this.settings.tabSize()) +
                    statement;
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
