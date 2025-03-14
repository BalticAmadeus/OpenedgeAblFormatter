import Parser, { Tree } from "tree-sitter";
import AblLanguage from "@usagi-coffee/tree-sitter-abl/bindings/node";
import { IParserHelper } from "./IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { ParseResult } from "../model/ParseResult";
import { SyntaxNodeType } from "../model/SyntaxNodeType";
import { IDebugManager } from "../providers/IDebugManager";

export class AblParserHelper implements IParserHelper {
    private parser = new Parser();
    private trees = new Map<string, Parser.Tree>();
    private debugManager: IDebugManager;

    public constructor(extensionPath: string, debugManager: IDebugManager) {
        this.debugManager = debugManager;
        this.parser.setLanguage(AblLanguage); // Directly set the imported language
        this.debugManager.parserReady();
    }

    public async awaitLanguage(): Promise<void> {
        return Promise.resolve(); // Language is already set, no need to load anything
    }

    public parse(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): ParseResult {
        const newTree = this.parser.parse(text, previousTree);
        let ranges: Parser.Range[];

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
    node: Parser.SyntaxNode,
    isRoot: boolean
): Parser.SyntaxNode[] {
    let errorNodes: Parser.SyntaxNode[] = [];

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
