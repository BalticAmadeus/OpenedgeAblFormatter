import { Tree } from "tree-sitter";

export interface IDebugManager {
    handleErrors(tree: Tree): void;
    parserReady(): void;
    fileFormattedSuccessfully(numOfEdits: number): void;
    isInDebugMode(): boolean;
}
