import Parser, { Tree } from "web-tree-sitter";
import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { ParseResult } from "../model/ParseResult";
import * as path from "path";

/**
 * CLI Parser Helper - initializes tree-sitter without VS Code extension context
 */
export class CliParserHelper implements IParserHelper {
    private parser: Parser | null = null;
    private trees = new Map<string, Parser.Tree>();
    private ablLanguagePromise: Promise<Parser.Language>;
    private wasmPath: string;
    private isInitialized = false;

    constructor(wasmPath: string) {
        this.wasmPath = wasmPath;
        this.ablLanguagePromise = this.initializeParser();
    }

    private async initializeParser(): Promise<Parser.Language> {
        // Initialize the parser (WASM)
        await Parser.init();
        this.parser = new Parser();

        // Load the ABL language
        const abl = await Parser.Language.load(this.wasmPath);
        this.parser.setLanguage(abl);
        this.isInitialized = true;

        return abl;
    }

    public async awaitLanguage(): Promise<void> {
        await this.ablLanguagePromise;
    }

    public parse(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): ParseResult {
        if (!this.parser || !this.isInitialized) {
            throw new Error("Parser not initialized. Call awaitLanguage() first.");
        }

        const newTree = this.parser.parse(text, previousTree);
        let ranges: Parser.Range[];

        if (previousTree !== undefined) {
            ranges = previousTree.getChangedRanges(newTree);
        } else {
            ranges = [];
        }

        const result: ParseResult = {
            tree: newTree,
            ranges: ranges,
        };

        return result;
    }
}
