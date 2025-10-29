import { Tree } from "web-tree-sitter";
import * as vscode from "vscode";

export interface IDebugManager {
    handleErrors(tree: Tree): void;
    handleErrorRanges(ranges: vscode.Range[]): void;
    parserReady(): void;
    fileFormattedSuccessfully(numOfEdits: number): void;
    isInDebugMode(): boolean;
}
