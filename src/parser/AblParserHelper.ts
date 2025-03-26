import { Parser, Tree, Language, Range, SyntaxNode } from "web-tree-sitter";
import { IParserHelper } from "./IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { ParseResult } from "../model/ParseResult";
import path from "path";
import { SyntaxNodeType } from "../model/SyntaxNodeType";
import { IDebugManager } from "../providers/IDebugManager";

export class AblParserHelper implements IParserHelper {
    private parser = new Parser();
    private trees = new Map<string, Tree>();
    private ablLanguagePromise: Promise<Language>;
    private debugManager: IDebugManager;

    public constructor(extensionPath: string, debugManager: IDebugManager) {
        this.debugManager = debugManager;
        this.ablLanguagePromise = Language.load(
            path.join(extensionPath, "resources/tree-sitter-abl.wasm")
        );

        this.ablLanguagePromise.then((abl) => {
            this.parser.setLanguage(abl);
            this.debugManager.parserReady();
        });
    }

    public async awaitLanguage(): Promise<void> {
        await this.ablLanguagePromise;
    }

    public parse(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): ParseResult {
        const newTree = this.parser.parse(text, previousTree);
        let ranges: Range[];

        if (previousTree !== undefined) {
            ranges = previousTree.getChangedRanges(newTree);
        } else {
            ranges = []; // TODO
        }

        const result: ParseResult = {
            tree: newTree,
            ranges: ranges,
        };

        this.debugManager.handleErrors(newTree);

        return result;
    }
}

function getNodesWithErrors(
    node: SyntaxNode,
    isRoot: boolean
): SyntaxNode[] {
    let errorNodes: SyntaxNode[] = [];

    if (
        node.type === SyntaxNodeType.Error &&
        node.text.trim() !== "ERROR" &&
        !isRoot
    ) {
        errorNodes.push(node);
    }

    node.children.forEach((child) => {
        errorNodes = errorNodes.concat(getNodesWithErrors(child, false));
    });

    return errorNodes;
}
