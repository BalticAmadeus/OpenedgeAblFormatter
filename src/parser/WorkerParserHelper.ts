import Parser from "web-tree-sitter";
import { IParserHelper } from "./IParserHelper";

export class WorkerParserHelper implements IParserHelper {
    constructor(private parser: Parser, private ablLanguage: Parser.Language) {}

    public parse(_fileIdentifier: any, text: string, _previousTree?: any) {
        return { tree: this.parser.parse(text), ranges: [] };
    }

    public async parseAsync(
        _fileIdentifier: any,
        text: string,
        _previousTree?: any
    ) {
        return { tree: this.parser.parse(text), ranges: [] };
    }

    public async format(): Promise<string> {
        throw new Error("Not implemented in worker dummy parserHelper");
    }

    public async startWorker() {
        // No-op for worker context
        return;
    }
}
