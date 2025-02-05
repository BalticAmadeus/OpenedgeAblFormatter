import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import {
    definitionKeywords,
    SyntaxNodeType,
} from "../../../model/SyntaxNodeType";
import { VariableDefinitionSettings } from "./VariableDefinitionSettings";
import { IConfigurationManager } from "../../../utils/IConfigurationManager";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class VariableDefinitionFormatter
    extends AFormatter
    implements IFormatter
{
    public static readonly formatterLabel = "variableDefinitionFormatting";
    private readonly settings: VariableDefinitionSettings;
    private static visitedNodes: Set<number> = new Set();
    private static alignType = 0;
    private static alignVariableTuning = 0;
    private static alignExtent = 0;
    private static alignVariableKeyword = 0;
    private hasAccessTuning = false;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new VariableDefinitionSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.VariableDefinition) {
            return true;
        }
        return false;
    }
    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        this.resetNodeVariables();

        if (VariableDefinitionFormatter.visitedNodes.has(node.id)) {
            const newText = this.collectDefineString(node, fullText);
            return this.getCodeEdit(node, oldText, newText, fullText);
        }

        this.resetStaticVariables();
        let currentNode: SyntaxNode | null = node;
        for (
            currentNode;
            currentNode !== null;
            currentNode = currentNode.nextSibling
        ) {
            if (currentNode.type === SyntaxNodeType.Comment) {
                continue;
            }
            if (currentNode.type !== SyntaxNodeType.VariableDefinition) {
                break;
            }
            this.collectDefineStructure(currentNode, fullText);
            VariableDefinitionFormatter.visitedNodes.add(currentNode.id);
        }
        const newText = this.collectDefineString(node, fullText);
        return this.getCodeEdit(node, oldText, newText, fullText);
    }

    private collectDefineString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getExpressionString(child, fullText)
            );
        });
        resultString += ".";
        return resultString;
    }

    private collectDefineStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): void {
        node.children.forEach((child) => {
            this.getDefineStructure(child, fullText);
        });
    }

    private getDefineStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): void {
        switch (node.type) {
            case SyntaxNodeType.TypeTuning:
                VariableDefinitionFormatter.alignVariableTuning = Math.max(
                    VariableDefinitionFormatter.alignVariableTuning,
                    this.collectTypeTuningString(node, fullText).length
                );
                break;
            case SyntaxNodeType.Identifier:
                VariableDefinitionFormatter.alignType = Math.max(
                    VariableDefinitionFormatter.alignType,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
            case SyntaxNodeType.AccessTuning:
                VariableDefinitionFormatter.alignVariableKeyword = Math.max(
                    VariableDefinitionFormatter.alignVariableKeyword,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
            case SyntaxNodeType.VariableTuning:
                const hasExtentKeyword = node.children.find(
                    (child) => child.type === SyntaxNodeType.ExtentKeyword
                );
                const IsPreviousTypeTunning =
                    node.previousSibling?.type === SyntaxNodeType.TypeTuning;

                if (hasExtentKeyword && IsPreviousTypeTunning) {
                    VariableDefinitionFormatter.alignExtent = Math.max(
                        VariableDefinitionFormatter.alignExtent,
                        this.collectTypeTuningString(node, fullText).length
                    );
                }
                break;
        }
    }

    private getExpressionString(
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
            case SyntaxNodeType.TypeTuning:
                const typeTuningText = this.collectTypeTuningString(
                    node,
                    fullText
                );
                newString =
                    typeTuningText +
                    " ".repeat(
                        VariableDefinitionFormatter.alignVariableTuning -
                            typeTuningText.length
                    );
                break;
            case SyntaxNodeType.AccessTuning: {
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString =
                    " " +
                    text +
                    " ".repeat(
                        VariableDefinitionFormatter.alignVariableKeyword -
                            text.length
                    );
                this.hasAccessTuning = true;
                break;
            }
            case SyntaxNodeType.VariableKeyword: {
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                if (
                    !this.hasAccessTuning &&
                    VariableDefinitionFormatter.alignVariableKeyword !== 0
                ) {
                    newString =
                        " ".repeat(
                            2 + VariableDefinitionFormatter.alignVariableKeyword
                        ) + text;
                    this.hasAccessTuning = true;
                } else {
                    newString = " " + text;
                }
                break;
            }
            case SyntaxNodeType.Identifier:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString =
                    " " +
                    text +
                    " ".repeat(
                        VariableDefinitionFormatter.alignType - text.length
                    );
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            case SyntaxNodeType.VariableTuning:
                let variableTuningText = "";
                let spacesCount = 0;
                const noUndoKeyword = node.children.find(
                    (child) => child.type === SyntaxNodeType.NoUndoKeyword
                );
                const previousExtent = node.previousSibling?.children.find(
                    (child) => child.type === SyntaxNodeType.ExtentKeyword
                );

                if (noUndoKeyword) {
                    variableTuningText = this.collectTypeTuningString(
                        node,
                        fullText
                    );
                    if (previousExtent && node.previousSibling) {
                        spacesCount =
                            VariableDefinitionFormatter.alignExtent -
                            node.previousSibling.text.length;
                    } else {
                        spacesCount = VariableDefinitionFormatter.alignExtent;
                    }
                    newString = " ".repeat(spacesCount) + variableTuningText;
                    break;
                }
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

    private resetNodeVariables() {
        this.hasAccessTuning = false;
    }

    private resetStaticVariables() {
        VariableDefinitionFormatter.alignType = 0;
        VariableDefinitionFormatter.alignVariableTuning = 0;
        VariableDefinitionFormatter.alignExtent = 0;
        VariableDefinitionFormatter.alignVariableKeyword = 0;
    }
}
