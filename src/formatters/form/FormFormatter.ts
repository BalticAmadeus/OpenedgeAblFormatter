import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { FormSettings } from "./FormSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";

@RegisterFormatter
export class FormFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "formFormatting";
    private readonly settings: FormSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new FormSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        return node.type === SyntaxNodeType.FormStatement;
    }

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        const newText = this.formatForm(node, fullText);

        return this.getCodeEdit(node, oldText, newText, fullText);
    }

    private formatForm(node: SyntaxNode, fullText: FullText): string {
        const startColumn = FormatterHelper.getActualStatementIndentation(
            node,
            fullText
        );
        const indent = " ".repeat(startColumn + this.settings.tabSize());

        let result = "";
        let currentLine = "";
        let isFirstContent = true;
        let hasFormKeyword = false;

        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (!child) {
                continue;
            }

            const childText = FormatterHelper.getCurrentText(
                child,
                fullText
            ).trim();

            if (childText.length === 0) {
                continue;
            }

            // Handle FORM keyword specially
            if (child.type === "FORM" && !hasFormKeyword) {
                result = "FORM";
                hasFormKeyword = true;
                continue;
            }

            // Check if this should start a new line
            const shouldStartNewLine = this.shouldStartNewLine(child.type);

            if (shouldStartNewLine) {
                // Flush current line
                if (currentLine.length > 0) {
                    if (isFirstContent && this.settings.startOnNewLine()) {
                        result += fullText.eolDelimiter + indent + currentLine;
                    } else if (isFirstContent) {
                        result += " " + currentLine;
                    } else {
                        result += fullText.eolDelimiter + indent + currentLine;
                    }
                    currentLine = "";
                    isFirstContent = false;
                }
                // Start new line with this item
                currentLine = childText;
            } else {
                // Add to current line
                if (currentLine.length > 0) {
                    currentLine += " " + childText;
                } else {
                    currentLine = childText;
                }
            }
        }

        // Flush any remaining content
        if (currentLine.length > 0) {
            if (isFirstContent && this.settings.startOnNewLine()) {
                result += fullText.eolDelimiter + indent + currentLine;
            } else if (isFirstContent) {
                result += " " + currentLine;
            } else {
                result += fullText.eolDelimiter + indent + currentLine;
            }
        }

        // Add period
        if (this.settings.endDotOnNewLine()) {
            result += fullText.eolDelimiter + indent + ".";
        } else {
            result += ".";
        }

        return result;
    }

    private shouldStartNewLine(nodeType: string): boolean {
        // Each of these item types should start on a new line
        const newLineItems = [
            "form_field_item", // Customer.Name LABEL "Name"
            "form_skip", // SKIP(2)
            "form_space", // SPACE(3)
            "form_string_item", // "Total Orders:" AT 1
            "form_with_clause", // WITH FRAME ...
            "form_title_clause", // TITLE "..."
        ];

        return newLineItems.includes(nodeType);
    }
}
