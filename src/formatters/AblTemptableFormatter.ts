import { SyntaxNode } from "web-tree-sitter";
import { SourceChanges } from "../model/SourceChanges";
import { AAblFormatter } from "./AAblFormatter";
import { IAblFormatter } from "./IAblFormatter";
import { Range, TextEdit } from "vscode";
import { FormatterSettings } from "../model/FormatterSettings";
import { SyntaxNodeType } from "../model/SyntaxNodeType";

export class AblTemptableFormatter extends AAblFormatter implements IAblFormatter {
    private startColumn = 0;
    private temptableValueColumn = 0;
    private temptableBodyValue = "";

    private textEdit: TextEdit[] = [];

    protected getSelf(): IAblFormatter {
        return this;
    }

    parseNode(node: SyntaxNode): void {
        if (!FormatterSettings.temptableFormatting()) {
            return;
        }

        if (node.type !== SyntaxNodeType.TemptableDefinition) {
            return;
        }

        if (this.ablFormatterRunner === undefined) {
            return;
        }

        this.collectTemptableStructure(node);

        const newBlock = this.getPrettyBlock();

        if (
            this.ablFormatterRunner
                .getDocument()
                .getText(
                    new Range(
                        node.startPosition.row,
                        node.startPosition.column,
                        node.endPosition.row,
                        node.endPosition.column
                    )
                ) === newBlock
        ) {
            return;
        }
        this.textEdit?.push(
            new TextEdit(
                new Range(
                    node.startPosition.row,
                    node.startPosition.column,
                    node.endPosition.row,
                    node.endPosition.column
                ),
                newBlock
            )
        );
    }

    getSourceChanges(): SourceChanges {
        return {
            textEdits: this.textEdit,
        };
    }

    clearSourceChanges(): void {
        this.textEdit.length = 0;
    }

    private collectTemptableStructure(node: SyntaxNode): void {
        this.startColumn          = node.startPosition.column;
        this.temptableValueColumn = this.startColumn + FormatterSettings.tabSize();
        this.temptableBodyValue   = this.getTemptableBlock(node);
    }

    private getTemptableBlock(node: SyntaxNode): string {
        let resultString = "";

        node.children.forEach((child) => {
            resultString = resultString.concat(
                this.getTemptableExpressionString(child, "\r\n".concat(" ".repeat(this.temptableValueColumn)))
            );
        });

        return resultString.trim();
    }

    private getTemptableExpressionString(node: SyntaxNode, separator: string): string {
        switch (node.type.trim()) {
            case SyntaxNodeType.FieldDefinition:
            case SyntaxNodeType.IndexDefinition:
                let resultTemptableString = "";

                node.children.forEach((child) => {
                    resultTemptableString = resultTemptableString.concat(
                        this.getTemptableExpressionString(child, "\r\n".concat(" ".repeat(this.temptableValueColumn)))
                    );
                });

                return separator + resultTemptableString;
            case SyntaxNodeType.LikeKeyword:
                if (node.parent!.type.trim() === SyntaxNodeType.FieldDefinition ||
                    node.parent!.type.trim() === SyntaxNodeType.IndexDefinition) {
                 return " " + node.text.trim();
                } else {
                    return separator + node.text.trim();
                }
            case SyntaxNodeType.FieldKeyword:
            case SyntaxNodeType.IndexKeyword:
                return node.text.trim();
            default:
                return " " + node.text.trim();
        }
    }

    private getPrettyBlock(): string {
        const block = ""
            .concat(this.temptableBodyValue.trim())
            .concat(".");

        return block;
    }
}