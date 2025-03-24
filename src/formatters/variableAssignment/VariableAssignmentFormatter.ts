import { Node } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { VariableDefinitionSettings } from "./VariableAssignmentSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";

@RegisterFormatter
export class VariableAssignmentFormatter
    extends AFormatter
    implements IFormatter
{
    public static readonly formatterLabel = "variableAssignmentFormatting";
    private readonly settings: VariableDefinitionSettings;
    private startOfAssignment = false;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new VariableDefinitionSettings(configurationManager);
    }

    match(node: Readonly<Node>): boolean {
        if (node.type === SyntaxNodeType.Assignment) {
            const parent = node.parent;
            if (
                parent !== null &&
                parent.type === SyntaxNodeType.VariableAssignment
            ) {
                return true;
            }
        }
        return false;
    }
    parse(
        node: Readonly<Node>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.startOfAssignment = true;
        const oldText = FormatterHelper.getCurrentText(node, fullText);
        const newText = this.collectString(node, fullText);
        return this.getCodeEdit(node, oldText, newText, fullText);
    }

    private collectString(node: Node, fullText: FullText): string {
        let resultString = "";
        node.children.forEach((child) => {
            resultString = resultString.concat(this.getString(child, fullText));
        });
        return resultString;
    }

    private getString(node: Node, fullText: FullText): string {
        let newString = "";
        const text = FormatterHelper.getCurrentText(node, fullText).trim();
        switch (node.type) {
            case SyntaxNodeType.Error:
                newString = FormatterHelper.getCurrentText(node, fullText);
                break;
            default:
                if (this.startOfAssignment) {
                    // No need for extra space at the start, simply keep the whitespace
                    this.startOfAssignment = false;
                    newString = FormatterHelper.getCurrentText(node, fullText);
                } else {
                    newString = text.length === 0 ? "" : " " + text;
                }
                break;
        }
        return newString;
    }
}
