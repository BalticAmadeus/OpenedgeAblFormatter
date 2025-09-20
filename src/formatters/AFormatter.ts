import { SyntaxNode } from "web-tree-sitter";
import { IConfigurationManager } from "../utils/IConfigurationManager";
import { CodeEdit } from "../model/CodeEdit";
import { FullText } from "../model/FullText";

export abstract class AFormatter {
    protected readonly configurationManager: IConfigurationManager;

    public constructor(configurationManager: IConfigurationManager) {
        this.configurationManager = configurationManager;
    }

    protected compare(
        node1: Readonly<SyntaxNode>,
        node2: Readonly<SyntaxNode>
    ): boolean {
        // Skip comparison for nodes that have using_statement ancestors
        // since using statements are compared as groups and may be reordered
        if (
            this.hasUsingStatementAncestor(node1) ||
            this.hasUsingStatementAncestor(node2)
        ) {
            return true; // Let UsingFormatter handle using statement comparisons
        }

        if (node1.type !== node2.type) {
            return false;
        }

        if (node1.childCount !== node2.childCount) {
            return false;
        }

        if (node1.namedChildCount !== node2.namedChildCount) {
            return false;
        }

        if (node1.childCount === 0) {
            const text1 = node1.text.replace(/\s+/g, " ").trim();
            const text2 = node2.text.replace(/\s+/g, " ").trim();
            if (text1 !== text2) {
                return false;
            }
        }

        return true;
    }

    protected getCodeEdit(
        node: SyntaxNode,
        oldText: string,
        newText: string,
        fullText: FullText
    ): CodeEdit {
        const diff = newText.length - oldText.length;
        const rowDiff =
            newText.split(fullText.eolDelimiter).length -
            oldText.split(fullText.eolDelimiter).length;
        const lastRowColumn = newText.split(fullText.eolDelimiter)[
            newText.split(fullText.eolDelimiter).length - 1
        ].length;

        return {
            text: newText,
            edit: {
                startIndex: node.startIndex,
                oldEndIndex: node.endIndex,
                startPosition: node.startPosition,
                oldEndPosition: node.endPosition,
                newEndIndex: node.endIndex + diff,
                newEndPosition: {
                    column: lastRowColumn,
                    row: node.endPosition.row + Math.max(rowDiff, 0),
                },
            },
        };
    }

    private hasUsingStatementAncestor(node: SyntaxNode): boolean {
        let currentNode: SyntaxNode | null = node.parent;
        while (currentNode) {
            if (currentNode.type === "using_statement") {
                return true;
            }
            currentNode = currentNode.parent;
        }
        return false;
    }
}
