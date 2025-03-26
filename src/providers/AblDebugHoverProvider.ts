import {
    CancellationToken,
    Hover,
    HoverProvider,
    Position,
    ProviderResult,
    TextDocument,
} from "vscode";
import { Point, SyntaxNode } from "web-tree-sitter";
import { AblParserHelper } from "../parser/AblParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { ParseResult } from "../model/ParseResult";
import { DebugManager } from "./DebugManager";

interface DocumentParseInstance {
    fileIdentifier: FileIdentifier;
    parseResult: ParseResult;
}

export class AblDebugHoverProvider implements HoverProvider {
    private parserHelper: AblParserHelper;
    private documentParseInstances: DocumentParseInstance[] = [];

    public constructor(parserHelper: AblParserHelper) {
        this.parserHelper = parserHelper;
    }

    provideHover(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): ProviderResult<Hover> {
        if (!DebugManager.getInstance().isInDebugMode()) {
            return;
        }

        const point: Point = {
            row: position.line,
            column: position.character,
        };

        const node = this.getNodeForPoint(document, point);

        return new Hover(
            "| ID | TYPE | START POS | END POS | INDEX | TEXT | \n | ---- | ---- | ---- | ---- | ---- | ---- | \n" +
                this.fillTreeWithAcendantsInfo(node)
        );
    }

    private getNodeForPoint(document: TextDocument, point: Point): SyntaxNode {
        let result = this.getResultIfDocumentWasAlreadyParsed(document);

        if (result === undefined) {
            result = this.parseDocumentAndAddToInstances(document);
        }

        return result.tree.rootNode.descendantForPosition(point);
    }

    private getResultIfDocumentWasAlreadyParsed(
        document: TextDocument
    ): ParseResult | undefined {
        const instance = this.documentParseInstances.find((instance) => {
            if (
                instance.fileIdentifier.name === document.fileName &&
                instance.fileIdentifier.version === document.version
            ) {
                return true;
            }
        });

        return instance?.parseResult;
    }

    private parseDocumentAndAddToInstances(
        document: TextDocument
    ): ParseResult {
        const parseResult = this.parserHelper.parse(
            new FileIdentifier(document.fileName, document.version),
            document.getText()
        );

        this.documentParseInstances.push({
            fileIdentifier: new FileIdentifier(
                document.fileName,
                document.version
            ),
            parseResult: parseResult,
        });

        return parseResult;
    }

    private fillTreeWithAcendantsInfo(node: SyntaxNode): string {
        const str =
            "| " +
            node.id +
            " | " +
            node.type +
            " | " +
            node.startPosition.row +
            ":" +
            node.startPosition.column +
            " | " +
            node.endPosition.row +
            ":" +
            node.endPosition.column +
            " | " +
            node.startIndex +
            ":" +
            node.endIndex +
            " | " +
            node.text
                .replaceAll("\r\n", " ")
                .replaceAll("\n", " ")
                .substring(0, 200) +
            " | " +
            " \n";

        if (node.parent === null) {
            return "";
        }

        return str + this.fillTreeWithAcendantsInfo(node.parent);
    }
}
