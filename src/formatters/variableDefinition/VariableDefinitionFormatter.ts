import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import {
    definitionKeywords,
    variableKeywords,
    SyntaxNodeType,
} from "../../model/SyntaxNodeType";
import { VariableDefinitionSettings } from "./VariableDefinitionSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class VariableDefinitionFormatter
    extends AFormatter
    implements IFormatter
{
    public static readonly formatterLabel = "variableDefinitionFormatting";
    private readonly settings: VariableDefinitionSettings;
    private visitedNodes: Set<number> = new Set();
    private alignType: number = 0;
    private alignVariableTuning: number = 0;
    private alignExtent: number = 0;
    private alignVariableKeyword: number = 0;
    private countAccessTuning: number = 0;
    private alignScopeGroup: number = 0;
    private hasAccessTuning: boolean = false;
    private hasStaticWithoutAccess: boolean = false;
    private hasScopeTuningWithoutAccess: boolean = false;

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

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        this.resetNodeVariables();

        if (this.visitedNodes.has(node.id)) {
            const newText = this.collectDefineString(node, fullText);
            return this.getCodeEdit(node, oldText, newText, fullText);
        }

        this.resetVariables();
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
            this.visitedNodes.add(currentNode.id);
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

        // Fix for issue #448
        const lastNode = node.children[node.children.length - 1];
        if (lastNode.type === SyntaxNodeType.TypeTuning) {
            resultString = resultString.trimEnd();
        }
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
                this.alignVariableTuning = Math.max(
                    this.alignVariableTuning,
                    this.collectTypeTuningString(node, fullText).length
                );
                break;
            case SyntaxNodeType.Identifier:
                this.alignType = Math.max(
                    this.alignType,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
            case SyntaxNodeType.AccessTuning:
                this.countAccessTuning++;
                this.alignVariableKeyword = Math.max(
                    this.alignVariableKeyword,
                    FormatterHelper.getCurrentText(node, fullText).trim().length
                );
                break;
            case SyntaxNodeType.VariableTuning:
                const hasExtentKeyword = node.children.find(
                    (child) => child.type === SyntaxNodeType.ExtentKeyword
                );
                const IsPreviousTypeTuning =
                    node.previousSibling?.type === SyntaxNodeType.TypeTuning;

                if (hasExtentKeyword && IsPreviousTypeTuning) {
                    this.alignExtent = Math.max(
                        this.alignExtent,
                        this.collectTypeTuningString(node, fullText).length
                    );
                }
                break;
            case SyntaxNodeType.ScopeTuning:
                this.alignScopeGroup = Math.max(
                    this.alignScopeGroup,
                    this.collectScopeTuningGroup(node, fullText).length
                );
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
                        this.alignVariableTuning - typeTuningText.length
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
                    " ".repeat(this.alignVariableKeyword - text.length);
                this.hasAccessTuning = true;
                break;
            }
            case variableKeywords.hasFancy(node.type, ""): {
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                const shouldAlign =
                    !this.hasAccessTuning && this.alignVariableKeyword !== 0;
                let spacesCount = 1;

                if (shouldAlign) {
                    if (
                        this.hasStaticWithoutAccess ||
                        this.hasScopeTuningWithoutAccess
                    ) {
                        spacesCount = 1;
                    } else {
                        spacesCount = 2 + this.alignVariableKeyword;
                        this.hasAccessTuning = true;
                    }
                }
                newString = " ".repeat(spacesCount) + text;
                break;
            }
            case SyntaxNodeType.Identifier:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString =
                    " " + text + " ".repeat(this.alignType - text.length);
                break;
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            case SyntaxNodeType.ScopeTuning: {
                if (this.visitedNodes.has(node.id)) {
                    return "";
                }
                const scopeGroupText = this.collectScopeTuningGroup(
                    node,
                    fullText
                );
                const hasStatic = node.children.find(
                    (child) => child.type === SyntaxNodeType.StaticKeyword
                );

                this.markScopeGroupAsVisited(node);

                if (hasStatic) {
                    this.hasStaticWithoutAccess = true;
                } else {
                    this.hasScopeTuningWithoutAccess = true;
                }

                const needsLeadingPadding =
                    this.hasAccessTuning ||
                    this.countAccessTuning === 0 ||
                    this.hasScopeTuningWithoutAccess;

                const needsTrailingPadding =
                    !this.hasAccessTuning &&
                    !this.hasStaticWithoutAccess &&
                    !hasStatic;

                const leadingSpaces = needsLeadingPadding
                    ? 1
                    : this.alignVariableKeyword + 2; // Compensate two trimmed whitespaces
                const trailingSpaces = needsTrailingPadding
                    ? this.alignScopeGroup - scopeGroupText.length
                    : 0;

                newString =
                    " ".repeat(leadingSpaces) +
                    scopeGroupText +
                    " ".repeat(trailingSpaces);
                break;
            }
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
                            this.alignExtent -
                            FormatterHelper.getCurrentText(
                                node.previousSibling,
                                fullText
                            ).trim().length -
                            1;
                    } else {
                        spacesCount = this.alignExtent;
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

    private collectScopeTuningGroup(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let scopeGroupText = "";
        let currentNode: SyntaxNode | null = node;

        while (currentNode && currentNode.type === SyntaxNodeType.ScopeTuning) {
            const currentText = FormatterHelper.getCurrentText(
                currentNode,
                fullText
            ).trim();
            scopeGroupText += (scopeGroupText ? " " : "") + currentText;
            currentNode = currentNode.nextSibling;
        }
        return scopeGroupText;
    }

    private markScopeGroupAsVisited(node: SyntaxNode): void {
        let currentNode: SyntaxNode | null = node;
        while (currentNode && currentNode.type === SyntaxNodeType.ScopeTuning) {
            this.visitedNodes.add(currentNode.id);
            currentNode = currentNode.nextSibling;
        }
    }

    private resetNodeVariables() {
        this.hasAccessTuning = false;
        this.hasStaticWithoutAccess = false;
        this.hasScopeTuningWithoutAccess = false;
    }

    private resetVariables() {
        this.alignType = 0;
        this.alignVariableTuning = 0;
        this.alignExtent = 0;
        this.alignVariableKeyword = 0;
        this.countAccessTuning = 0;
        this.alignScopeGroup = 0;
    }
}
