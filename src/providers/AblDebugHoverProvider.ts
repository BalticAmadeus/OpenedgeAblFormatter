import {
    CancellationToken,
    Hover,
    HoverProvider,
    Position,
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

    async provideHover(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): Promise<Hover | undefined> {
        const showTreeOnHover = DebugManager.getInstance().isShowTreeOnHover();

        if (!showTreeOnHover) {
            return;
        }

        const point: Point = {
            row: position.line,
            column: position.character,
        };

        const node = await this.getNodeForPoint(document, point);

        if (!node) {
            return;
        }

        const hoverText =
            "| ID | TYPE | START POS | END POS | INDEX | TEXT | \n | ---- | ---- | ---- | ---- | ---- | ---- | \n" +
            this.fillTreeWithAcendantsInfo(node);

        return new Hover(hoverText);
    }

    private async getNodeForPoint(
        document: TextDocument,
        point: Point
    ): Promise<SyntaxNode | undefined> {
        if (!this.parserHelper.isParserAvailable()) {
            // Parser is not available (worker not started and no direct parser)
            return undefined;
        }
        let result = this.getResultIfDocumentWasAlreadyParsed(document);

        if (result === undefined) {
            try {
                result = await this.parseDocumentAndAddToInstances(document);
            } catch (err) {
                // If parser fails, return undefined
                return undefined;
            }
        }

        if (!result) {
            return undefined;
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

    private async parseDocumentAndAddToInstances(
        document: TextDocument
    ): Promise<ParseResult> {
        const parseResult = await this.parserHelper.parseAsync(
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
        if (node.parent === null) {
            // This is the root node, skip it
            return "";
        }
        const str =
            "| " +
            (node.id || "N/A") +
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
            `\`${node.text
                .replaceAll("\r\n", " ")
                .replaceAll("\n", " ")
                .substring(0, 200)}\`` +
            " | " +
            " \n";

        if (node.parent === null) {
            return str;
        } else {
            return str + this.fillTreeWithAcendantsInfo(node.parent);
        }
    }
}
