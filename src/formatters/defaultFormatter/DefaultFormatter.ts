import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../../formatters/AFormatter";
import { DefaultSettings } from "./DefaultSettings";
import { IConfigurationManager } from "../../utils/IConfigurationManager";

@RegisterFormatter
export class DefaultFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "defaultFormatting";
    private readonly settings: DefaultSettings;

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new DefaultSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        return node.type === "default";
    }

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean {
        return super.compare(node1, node2);
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        return undefined;
    }
}
