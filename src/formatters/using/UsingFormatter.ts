import { SyntaxNode } from "web-tree-sitter";
import { RegisterFormatter } from "../../formatterFramework/formatterDecorator";
import { IFormatter } from "../../formatterFramework/IFormatter";
import { CodeEdit } from "../../model/CodeEdit";
import { FullText } from "../../model/FullText";
import { AFormatter } from "../AFormatter";
import { IConfigurationManager } from "../../utils/IConfigurationManager";
import { FormatterHelper } from "../../formatterFramework/FormatterHelper";
import { UsingSettings } from "./UsingSettings";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";

@RegisterFormatter
export class UsingFormatter extends AFormatter implements IFormatter {
    public static readonly formatterLabel = "usingFormatting";
    private readonly settings: UsingSettings;

    private usingStatementsFound: number = 0;
    private alignOptionalStatements: number = 0;
    private usingStatements: UsingStatement[] = [];
    private textUsingStatements: string[] = [];

    public constructor(configurationManager: IConfigurationManager) {
        super(configurationManager);
        this.settings = new UsingSettings(configurationManager);
    }

    match(node: Readonly<SyntaxNode>): boolean {
        if (node.type === SyntaxNodeType.UsingStatement) {
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
        this.usingStatementsFound++;
        if (this.usingStatementsFound === 1) {
            this.collectAllUsingStatements(node, fullText);
            this.textUsingStatements = this.usingStatements.map(
                (usingStatement) => this.usingStatementToString(usingStatement)
            );
            this.textUsingStatements.sort();
        }
        const text = FormatterHelper.getCurrentText(node, fullText);
        if (this.usingStatementsFound > this.textUsingStatements.length) {
            return undefined;
        }
        const newText = this.textUsingStatements[this.usingStatementsFound - 1];
        if (this.usingStatementsFound === this.textUsingStatements.length) {
            this.reset();
        }
        return this.getCodeEdit(node, text, newText, fullText);
    }

    private collectAllUsingStatements(
        node: SyntaxNode | null,
        fullText: FullText
    ): void {
        for (node; node !== null; node = node.nextSibling) {
            if (node.type === SyntaxNodeType.Comment) {
                continue;
            }
            if (!this.match(node)) {
                break;
            }

            const keywordChild = node.child(0);
            const identifierChild = node.child(1);

            if (keywordChild === null || identifierChild === null) {
                return;
            }

            let keyword = FormatterHelper.getCurrentText(
                keywordChild,
                fullText
            );
            keyword = this.settings.casing()
                ? keyword.trim().toUpperCase()
                : keyword.trim().toLowerCase();
            const identifier = FormatterHelper.getCurrentText(
                identifierChild,
                fullText
            ).trim();

            let optionalDefinitions = "";
            this.alignOptionalStatements = Math.max(
                this.alignOptionalStatements,
                /*  The format is this:
                    USING IDENTIFIER OPTIONAL_DEFINITIONS.
                    therefore we add +1 for the spaces between different parts.
                */
                keyword.length + 1 + identifier.length + 1
            );
            if (node.childCount > 2) {
                for (let i = 2; i < node.childCount; ++i) {
                    const currentChild = node.child(i);
                    if (currentChild === null) {
                        continue;
                    }
                    optionalDefinitions +=
                        FormatterHelper.getCurrentText(
                            currentChild,
                            fullText
                        ).trim() + " ";
                }
                optionalDefinitions = this.settings.casing()
                    ? optionalDefinitions.trim().toUpperCase()
                    : optionalDefinitions.trim().toLowerCase();
            }

            this.usingStatements.push({
                identifier: keyword + " " + identifier,
                optionalDefinitions,
            });
        }
    }

    private usingStatementToString(statement: UsingStatement): string {
        if (statement.optionalDefinitions === "") {
            return statement.identifier + ".";
        } else {
            return (
                statement.identifier +
                " ".repeat(
                    this.alignOptionalStatements - statement.identifier.length
                ) +
                statement.optionalDefinitions +
                "."
            );
        }
    }

    private reset(): void {
        this.usingStatementsFound = 0;
        this.alignOptionalStatements = 0;
        this.usingStatements = [];
        this.textUsingStatements = [];
    }
}

type UsingStatement = {
    identifier: string;
    optionalDefinitions: string;
};
