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

    async provideHover(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): Promise<Hover | undefined> {
        console.log("[AblDebugHoverProvider] provideHover called");
        const showTreeOnHover = DebugManager.getInstance().isShowTreeOnHover();
        console.log(
            "[AblDebugHoverProvider] showTreeOnHover:",
            showTreeOnHover
        );

        if (!showTreeOnHover) {
            console.log(
                "[AblDebugHoverProvider] Hover disabled, returning undefined"
            );
            return;
        }

        const point: Point = {
            row: position.line,
            column: position.character,
        };

        const node = await this.getNodeForPoint(document, point);
        console.log(
            "[AblDebugHoverProvider] Found node:",
            node ? node.type : "null"
        );

        if (!node) {
            console.log(
                "[AblDebugHoverProvider] No node found at position, returning undefined"
            );
            return;
        }

        const hoverText =
            "| ID | TYPE | START POS | END POS | INDEX | TEXT | \n | ---- | ---- | ---- | ---- | ---- | ---- | \n" +
            this.fillTreeWithAcendantsInfo(node);

        console.log(
            "[AblDebugHoverProvider] Hover text generated, length:",
            hoverText.length
        );
        return new Hover(hoverText);
    }

    private async getNodeForPoint(
        document: TextDocument,
        point: Point
    ): Promise<SyntaxNode | undefined> {
        if (!this.parserHelper.isParserAvailable()) {
            // Parser is not available (worker not started and no direct parser)
            console.log("[AblDebugHoverProvider] Parser not available for hover");
            return undefined;
        }
        let result = this.getResultIfDocumentWasAlreadyParsed(document);

        if (result === undefined) {
            try {
                result = await this.parseDocumentAndAddToInstances(document);
            } catch (err) {
                // If parser fails, return undefined
                console.warn("[AblDebugHoverProvider] parseAsync failed:", err);
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
        console.log(
            "[AblDebugHoverProvider] Parsing document for hover using worker"
        );
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

        console.log(
            "[AblDebugHoverProvider] Document parsed successfully for hover"
        );
        return parseResult;
    }

    private fillTreeWithAcendantsInfo(node: SyntaxNode): string {
        console.log(
            "[AblDebugHoverProvider] Processing node for hover:",
            node.type,
            "id:",
            node.id
        );

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
            node.text
                .replaceAll("\r\n", " ")
                .replaceAll("\n", " ")
                .substring(0, 200) +
            " | " +
            " \n";

        if (node.parent === null) {
            console.log(
                "[AblDebugHoverProvider] Reached root node, stopping recursion"
            );
            return str;
        }

        return str + this.fillTreeWithAcendantsInfo(node.parent);
    }
}
