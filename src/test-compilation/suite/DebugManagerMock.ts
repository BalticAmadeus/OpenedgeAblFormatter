import { Tree } from "web-tree-sitter";
import { IDebugManager } from "../../providers/IDebugManager";

export class DebugManagerMock implements IDebugManager {
    handleErrors(tree: Tree): void {
        //Do nothing
    }
    parserReady(): void {
        //Do nothing
    }
    fileFormattedSuccessfully(_: number): void {
        //Do nothing
    }
    isInDebugMode(): boolean {
        return false;
    }
}
