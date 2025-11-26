import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { EnumSettings } from "./EnumSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class EnumFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "enumFormatting";
    private readonly settings: EnumSettings;
    private alignColumn = 0;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new EnumSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        return node.type === SyntaxNodeType.EnumDefinition;
    }

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        const oldText = FormatterHelper.getCurrentText(node, fullText);

        const newText = this.collectEnumStructure(node, fullText);
        return this.getCodeEdit(node, oldText, newText, fullText);
    }

   private collectEnumStructure(
        node: SyntaxNode,
        fullText: Readonly<FullText>
    ): string {
        let foundFirstMember = false;
        let resultString = "";
        let defineEnumLineLength = 0;
        let hasCommentAfterEnum = false;
        
        // Get base indentation from old text
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        const defineKeywordMatch = oldText.match(/\n(\s*)define/i);
        const baseIndent = defineKeywordMatch ? defineKeywordMatch[1] : "    ";
        
        node.children.forEach((child, index) => {
            if (child.type === "comment") {
                let commentText = FormatterHelper.getCurrentText(child, fullText);
                
                // Remove trailing line ending from comment (if present)
                // This prevents double newlines when the comment is inline
                commentText = commentText.replace(/[\r\n]+$/, '');
                
                // Only strip base indent from continuation lines
                const commentLines = commentText.split(/\r?\n/);
                const strippedCommentLines = commentLines.map((line, lineIndex) => {
                    if (lineIndex === 0) {
                        return line;
                    }
                    if (line.startsWith(baseIndent)) {
                        return line.substring(baseIndent.length);
                    }
                    return line;
                });
                commentText = strippedCommentLines.join(fullText.eolDelimiter);
                
                const prevSibling = index > 0 ? node.children[index - 1] : null;
                
                if (prevSibling) {
                    const betweenText = fullText.text.substring(prevSibling.endIndex, child.startIndex);
                    resultString += betweenText;
                    
                    if (prevSibling.type === "ENUM") {
                        hasCommentAfterEnum = true;
                        const lines = resultString.split(/\r?\n/);
                        const currentLine = lines[lines.length - 1] || "";
                        defineEnumLineLength = currentLine.length;
                    }
                }
                
                resultString += commentText;
            } else {
                const childString = this.getEnumExpressionString(
                    child,
                    fullText,
                    foundFirstMember
                );
                
                if (!foundFirstMember && child.type === SyntaxNodeType.EnumMember) {
                    foundFirstMember = true;
                    
                    if (defineEnumLineLength > 0) {
                        this.alignColumn = defineEnumLineLength + 1;
                    } else {
                        this.alignColumn = 12;
                    }
                    
                    if (hasCommentAfterEnum && !childString.startsWith("\n") && !childString.startsWith("\r")) {
                        const trimmedChild = childString.trim();
                        const toAdd = fullText.eolDelimiter + " ".repeat(this.alignColumn) + trimmedChild;
                        resultString += toAdd;
                        return;
                    }
                }
                
                resultString = resultString.concat(childString);
            }
        });
        
        if (this.settings.endDotNewLine()) {
            resultString +=
                fullText.eolDelimiter + " ".repeat(this.alignColumn) + ".";
        } else {
            resultString += ".";
        }
        
        // Apply base indentation to all lines
        const lines = resultString.split(/\r?\n/);
        const indentedLines = lines.map((line, index) => {
            if (index === 0) {
                return line;
            }
            return baseIndent + line;
        });
        
        const finalResult = indentedLines.join(fullText.eolDelimiter);
        
        return finalResult;
    }

    private getEnumExpressionString(
        node: SyntaxNode,
        fullText: Readonly<FullText>,
        foundFirstMember: boolean
    ): string {
        let newString = "";

        switch (node.type) {
            case SyntaxNodeType.DefineKeyword:
                newString =
                    fullText.eolDelimiter +
                    FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case SyntaxNodeType.EnumMember:
                newString = foundFirstMember
                    ? fullText.eolDelimiter +
                      " ".repeat(this.alignColumn) +
                      FormatterHelper.getCurrentText(node, fullText).trim()
                    : " " +
                      FormatterHelper.getCurrentText(node, fullText).trim();
                break;
            case SyntaxNodeType.DotKeyword:
                newString = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                break;
            default:
                const text = FormatterHelper.getCurrentText(
                    node,
                    fullText
                ).trim();
                newString = text.length === 0 ? "" : " " + text;
                break;
        }

        return newString;
    }
}
