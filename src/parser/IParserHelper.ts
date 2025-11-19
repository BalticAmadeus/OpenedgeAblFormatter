import { Tree } from "web-tree-sitter";
import { FileIdentifier } from "../model/FileIdentifier";
import { ParseResult } from "../model/ParseResult";

export interface IParserHelper {
    parse(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): ParseResult;

    parseAsync(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): Promise<ParseResult>;

    format(
        fileIdentifier: FileIdentifier,
        text: string,
        options?: any
    ): Promise<string>;
    startWorker(): Promise<void>;
}
