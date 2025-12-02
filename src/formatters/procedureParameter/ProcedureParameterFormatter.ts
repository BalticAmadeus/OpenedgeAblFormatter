import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import {
    definitionKeywords,
    parameterTypes,
    SyntaxNodeType,
} from "../../model/SyntaxNodeType";
import { ProcedureParameterSettings } from "./ProcedureParameterSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class ProcedureParameterFormatter
    extends AFormatter
    implements IFormatter
{
    public static readonly formatterLabel = "procedureParameterFormatting";
    private readonly settings: ProcedureParameterSettings;
    private static visitedNodes: Set<number> = new Set();
    private static alignType = 0;
    private static alignNoUndo = 0;
    private static alignParameter = 0;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new ProcedureParameterSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.ParameterDefinition) {
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
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        if (ProcedureParameterFormatter.visitedNodes.has(node.id)) {
            const newText = this.collectString(node, fullText);
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
            if (currentNode.type !== SyntaxNodeType.ParameterDefinition) {
                break;
            }
            this.collectStructure(currentNode, fullText);
            ProcedureParameterFormatter.visitedNodes.add(currentNode.id);
        }
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
        resultString += ".";
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
            case SyntaxNodeType.TypeTuning:
                ProcedureParameterFormatter.alignNoUndo = Math.max(
                    ProcedureParameterFormatter.alignNoUndo,
                    this.collectTypeTuningString(node, fullText).length
                );
                break;
            case SyntaxNodeType.Identifier:
                ProcedureParameterFormatter.alignType = Math.max(
                    ProcedureParameterFormatter.alignType,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
            case parameterTypes.hasFancy(node.type, ""):
                ProcedureParameterFormatter.alignParameter = Math.max(
                    ProcedureParameterFormatter.alignParameter,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
        }
    }

    private getString(node: SyntaxNode, fullText: Readonly<FullText>): string {
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
                        ProcedureParameterFormatter.alignNoUndo -
                            typeTuningText.length
                    );
                break;
            case SyntaxNodeType.Identifier:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString =
                    " " +
                    text +
                    " ".repeat(
                        ProcedureParameterFormatter.alignType - text.length
                    );
                break;
            case parameterTypes.hasFancy(node.type, ""): {
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString =
                    " " +
                    text +
                    " ".repeat(
                        ProcedureParameterFormatter.alignParameter - text.length
                    );
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

    private resetStaticVariables() {
        ProcedureParameterFormatter.alignType = 0;
        ProcedureParameterFormatter.alignNoUndo = 0;
        ProcedureParameterFormatter.alignParameter = 0;
    }
}
