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

    compare(node1: SyntaxNode, node2: SyntaxNode): boolean {
        if (node1.type === SyntaxNodeType.UsingStatement) {
            const usingStatements1 = this.collectAllUsingStatements(node1);
            const usingStatements2 = this.collectAllUsingStatements(node2);

            if (usingStatements1.length !== usingStatements2.length) {
                console.log(
                    `Using statement count mismatch: ${usingStatements1.length} vs ${usingStatements2.length}`
                );
                return false;
            }

            const formattedStatements1 = usingStatements1
                .map((stmt) => this.formatUsingStatementForComparison(stmt))
                .sort();
            const formattedStatements2 = usingStatements2
                .map((stmt) => this.formatUsingStatementForComparison(stmt))
                .sort();

            for (let i = 0; i < formattedStatements1.length; i++) {
                if (formattedStatements1[i] !== formattedStatements2[i]) {
                    console.log(
                        `Using statement content mismatch after sorting:`
                    );
                    console.log(`Expected: "${formattedStatements1[i]}"`);
                    console.log(`Actual: "${formattedStatements2[i]}"`);
                    return false;
                }
            }

            return true;
        }

        return super.compare(node1, node2);
    }

    private formatUsingStatementForComparison(
        statement: UsingStatement
    ): string {
        if (statement.optionalDefinitions === "") {
            return statement.identifier + ".";
        } else {
            return (
                statement.identifier + " " + statement.optionalDefinitions + "."
            );
        }
    }

    private formatUsingStatementForOutput(
        statement: UsingStatement,
        allStatements: UsingStatement[]
    ): string {
        const maxAlignment = Math.max(
            ...allStatements.map((stmt) => stmt.identifier.length + 1)
        );

        if (statement.optionalDefinitions === "") {
            return statement.identifier + ".";
        } else {
            return (
                statement.identifier +
                " ".repeat(maxAlignment - statement.identifier.length) +
                statement.optionalDefinitions +
                "."
            );
        }
    }

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined {
        this.usingStatementsFound++;
        if (this.usingStatementsFound === 1) {
            const collectedStatements = this.collectAllUsingStatements(
                node,
                fullText
            );
            this.textUsingStatements = collectedStatements.map(
                (usingStatement) =>
                    this.formatUsingStatementForOutput(
                        usingStatement,
                        collectedStatements
                    )
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
        startNode: SyntaxNode,
        fullText?: Readonly<FullText>
    ): UsingStatement[] {
        const usingStatements: UsingStatement[] = [];

        let firstUsingNode = startNode;
        while (
            firstUsingNode.previousSibling &&
            (firstUsingNode.previousSibling.type ===
                SyntaxNodeType.UsingStatement ||
                firstUsingNode.previousSibling.type === SyntaxNodeType.Comment)
        ) {
            firstUsingNode = firstUsingNode.previousSibling;
        }

        let currentNode: SyntaxNode | null = firstUsingNode;
        while (currentNode) {
            if (currentNode.type === SyntaxNodeType.Comment) {
                currentNode = currentNode.nextSibling;
                continue;
            }
            if (!this.match(currentNode)) {
                break;
            }

            const keywordChild = currentNode.child(0);
            const identifierChild = currentNode.child(1);

            if (keywordChild === null || identifierChild === null) {
                currentNode = currentNode.nextSibling;
                continue;
            }

            let keyword: string;
            let identifier: string;
            let optionalDefinitions = "";

            if (fullText) {
                keyword = FormatterHelper.getCurrentText(
                    keywordChild,
                    fullText
                );
                keyword = this.settings.casing()
                    ? keyword.trim().toUpperCase()
                    : keyword.trim().toLowerCase();
                identifier = FormatterHelper.getCurrentText(
                    identifierChild,
                    fullText
                ).trim();

                if (currentNode.childCount > 2) {
                    for (let i = 2; i < currentNode.childCount; ++i) {
                        const currentChild = currentNode.child(i);
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
            } else {
                keyword = keywordChild.text.trim();
                keyword = this.settings.casing()
                    ? keyword.toUpperCase()
                    : keyword.toLowerCase();
                identifier = identifierChild.text.trim();

                if (currentNode.childCount > 2) {
                    for (let i = 2; i < currentNode.childCount; i++) {
                        const currentChild = currentNode.child(i);
                        if (currentChild) {
                            optionalDefinitions +=
                                currentChild.text.trim() + " ";
                        }
                    }
                    optionalDefinitions = this.settings.casing()
                        ? optionalDefinitions.trim().toUpperCase()
                        : optionalDefinitions.trim().toLowerCase();
                }
            }

            usingStatements.push({
                identifier: keyword + " " + identifier,
                optionalDefinitions,
            });

            currentNode = currentNode.nextSibling;
        }

        return usingStatements;
    }

    private reset(): void {
        this.usingStatementsFound = 0;
        this.textUsingStatements = [];
    }
}

type UsingStatement = {
    identifier: string;
    optionalDefinitions: string;
};
