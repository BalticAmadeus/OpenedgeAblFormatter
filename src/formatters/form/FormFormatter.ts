import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { IConfigurationManager } from "../../utils/IConfigurationManager";

@RegisterFormatter
export class FormFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "formFormatting";

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
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
        return this.getCodeEdit(node, oldText, oldText, fullText);
    }
}
