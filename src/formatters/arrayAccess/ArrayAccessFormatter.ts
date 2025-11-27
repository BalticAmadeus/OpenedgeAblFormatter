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
    private addSpaceBeforeLeftBracket: boolean = false;
    private addSpaceBeforeIdentifier: boolean = false;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new ArrayAccessSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        return (
            node.type === SyntaxNodeType.ArrayAccess ||
            node.type === SyntaxNodeType.ArrayLiteral
        );
    }

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        // Reset flags for this formatting operation
        this.formattingArrayLiteral = false;
        this.addSpaceBeforeLeftBracket = false;
        this.addSpaceBeforeIdentifier = false;

        if (node.type === SyntaxNodeType.ArrayLiteral) {
            this.formattingArrayLiteral = true;

            if (
                node.previousSibling?.type !== SyntaxNodeType.Identifier &&
                node.previousNamedSibling?.type !== SyntaxNodeType.TypeTuning
            ) {
                this.addSpaceBeforeLeftBracket = true;
            }

            if (node.previousSibling?.type === SyntaxNodeType.Identifier) {
                this.addSpaceBeforeIdentifier = true;
            } else {
                this.addSpaceBeforeIdentifier = false;
            }
        }
        const oldText = FormatterHelper.getCurrentText(node, fullText);

        if (node.type === SyntaxNodeType.ArrayAccess) {
            let isFirstStatement = this.isFirstInStatementChain(
                node,
                this.statementTypes
            );
            if (isFirstStatement === false) {
                this.addSpaceBeforeIdentifier = true;
            } else {
                this.addSpaceBeforeIdentifier = false;
            }
        }

        const text = this.addSpaceBeforeIdentifier
            ? " " + this.collectString(node, fullText)
            : this.collectString(node, fullText);

        return this.getCodeEdit(node, oldText, text, fullText);
    }

    isFirstInStatementChain(
        node: SyntaxNode,
        statementTypes: string[]
    ): boolean {
        let current = node;
        while (current.parent) {
            const parent = current.parent;
            const siblings = parent.children;
            if (!siblings || siblings.length === 0) {
                return true;
            }
            if (siblings[0].id !== current.id) {
                return false;
            }
            if (statementTypes.includes(parent.type) || !parent.parent) {
                for (const child of siblings) {
                    if (
                        child.type === SyntaxNodeType.Identifier ||
                        child.type === SyntaxNodeType.ArrayAccess
                    ) {
                        return child.id === current.id;
                    }
                }
                return false;
            }
            current = parent;
        }
        return true;
    }

    statementTypes = [
        SyntaxNodeType.AblStatement,
        SyntaxNodeType.ReturnStatement,
        SyntaxNodeType.MessageStatement,
        SyntaxNodeType.InputOutputStatement,
        SyntaxNodeType.ReleaseStatement,
        SyntaxNodeType.Assignment,
        SyntaxNodeType.VariableAssignment,
    ];

    private collectString(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let resultString = "";
        for (const child of node.children) {
            resultString = resultString.concat(this.getString(child, fullText));
        }
        return resultString;
    }

    private getString(node: SyntaxNode, fullText: Readonly<FullText>): string {
        let newString = "";

        if (node.type === SyntaxNodeType.LeftBracket) {
            newString = "[";
            if (this.addSpaceBeforeLeftBracket) {
                newString = " " + newString;
            }
        } else if (node.type === SyntaxNodeType.RightBracket) {
            newString = "]";
        } else if (
            node.type === SyntaxNodeType.CommaKeyword &&
            this.formattingArrayLiteral
        ) {
            newString = ",";
            if (this.settings.addSpaceAfterComma()) {
                newString += " ";
            }
        } else {
            // For all other nodes, get the text (which will be from cache or original source)
            newString = FormatterHelper.getCurrentText(node, fullText).trim();

            // If the result is empty (whitespace node), skip it
            if (newString === "") {
                return "";
            }
        }
        return newString;
    }
}
