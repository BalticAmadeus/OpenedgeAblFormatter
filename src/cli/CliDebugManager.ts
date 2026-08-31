import { IDebugManager } from "../providers/IDebugManager";
import { Tree } from "web-tree-sitter";
import { SyntaxNodeType } from "../model/SyntaxNodeType";

/**
 * CLI stub for DebugManager - minimal implementation without VS Code dependencies
 */
export class CliDebugManager implements IDebugManager {
    private verbose: boolean;
    private parseErrorCount = 0;

    constructor(verbose = false) {
        this.verbose = verbose;
    }

    public parserReady(): void {
        if (this.verbose) {
            console.error("Parser ready");
        }
    }

    public handleErrors(tree: Tree): void {
        this.parseErrorCount = this.countErrorNodes(tree.rootNode, true);
    }

    public handleErrorRanges(ranges: any[]): void {
        // No-op for CLI
    }

    public fileFormattedSuccessfully(numOfCodeEdits: number): void {
        if (this.verbose) {
            console.error(`Formatted successfully with ${numOfCodeEdits} edits`);
        }
    }

    public getParseErrorCount(): number {
        return this.parseErrorCount;
    }

    public hasParseErrors(): boolean {
        return this.parseErrorCount > 0;
    }

    public isInDebugMode(): boolean {
        return false;
    }

    public disableExtension(): void {
        console.error("Extension disabled");
    }

    private countErrorNodes(node: any, isRoot: boolean): number {
        let errorCount = 0;

        if (
            !isRoot &&
            node.type === SyntaxNodeType.Error
        ) {
            errorCount += 1;
        }

        for (const child of node.children) {
            errorCount += this.countErrorNodes(child, false);
        }

        return errorCount;
    }
}
