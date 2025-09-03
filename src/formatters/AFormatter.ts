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
        return node1.equals(node2);
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
}
