import Parser, { Tree } from "web-tree-sitter";
import { IParserHelper } from "./IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { ParseResult } from "../model/ParseResult";
import path from "path";
import { SyntaxNodeType } from "../model/SyntaxNodeType";
import { IDebugManager } from "../providers/IDebugManager";
import { spawn, ChildProcess } from "child_process";

export class AblParserHelper implements IParserHelper {
    private parser: Parser | null = null;
    private trees = new Map<string, Parser.Tree>();
    private ablLanguagePromise: Promise<Parser.Language>;
    private debugManager: IDebugManager;
    private workerProcess: ChildProcess | null = null;
    private useWorker: boolean = true;
    private workerReady: boolean = false;
    private messageId = 0;
    private pendingRequests = new Map<
        number,
        { resolve: Function; reject: Function }
    >();
    private extensionPath: string;
    private workerInitPromise: Promise<void> | null = null;

    public constructor(extensionPath: string, debugManager: IDebugManager) {
        this.extensionPath = extensionPath;
        this.debugManager = debugManager;

        this.ablLanguagePromise = Parser.init().then(() => {
            this.parser = new Parser();
            return Parser.Language.load(
                path.join(extensionPath, "resources/tree-sitter-abl.wasm")
            );
        });

        this.ablLanguagePromise.then((abl) => {
            if (this.parser) {
                this.parser.setLanguage(abl);
                this.debugManager.parserReady();
            }
        });

        this.workerInitPromise = this.initializeWorker()
            .then(() => {
                console.log(
                    "[AblParserHelper] Worker initialization completed successfully"
                );
            })
            .catch((error: any) => {
                console.warn(
                    "[AblParserHelper] Failed to initialize worker, falling back to direct parsing:",
                    error
                );
                this.useWorker = false;
            });
    }

    public async awaitLanguage(): Promise<void> {
        await this.ablLanguagePromise;
    }

    public async awaitWorker(): Promise<void> {
        if (this.workerInitPromise) {
            await this.workerInitPromise;
        }
    }

    public parse(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): ParseResult {
        // Always use direct parsing synchronously
        // The worker process will be used for background optimization in the future
        console.log("[AblParserHelper] Using direct parsing");
        if (!this.parser) {
            throw new Error("Parser not initialized");
        }

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

    private async initializeWorker(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const jsWorkerPath = path.join(__dirname, "ParserWorker.js");
            const tsWorkerPath = path.join(__dirname, "ParserWorker.ts");

            let workerPath: string;
            let command: string;
            let args: string[];

            try {
                require.resolve(jsWorkerPath);
                workerPath = jsWorkerPath;
                command = "node";
                args = [workerPath, this.extensionPath];
                console.log(
                    `[AblParserHelper] Using compiled JS worker: ${workerPath}`
                );
            } catch {
                workerPath = tsWorkerPath;
                command = "node";
                args = [
                    "-r",
                    "ts-node/register",
                    workerPath,
                    this.extensionPath,
                ];
                console.log(
                    `[AblParserHelper] Using TypeScript worker: ${workerPath}`
                );
            }

            this.workerProcess = spawn(command, args, {
                stdio: ["pipe", "pipe", "pipe", "ipc"],
            });

            this.workerProcess.stdout?.on("data", (data) => {
                console.log(`[Worker stdout]: ${data}`);
            });

            this.workerProcess.stderr?.on("data", (data) => {
                console.error(`[Worker stderr]: ${data}`);
            });

            this.workerProcess.on("message", (message: any) => {
                this.handleWorkerMessage(message);
                if (message.type === "ready") {
                    console.log("[AblParserHelper] Worker process ready");
                    this.workerReady = true;
                    resolve();
                } else if (message.type === "error") {
                    reject(new Error(message.error));
                }
            });

            this.workerProcess.on("error", (error) => {
                console.error("[AblParserHelper] Worker process error:", error);
                reject(error);
            });

            this.workerProcess.on("exit", (code) => {
                console.log(
                    `[AblParserHelper] Worker process exited with code ${code}`
                );
                this.workerProcess = null;
                this.useWorker = false;
                this.workerReady = false;
            });

            setTimeout(() => {
                if (this.workerProcess && !this.workerProcess.killed) {
                    reject(new Error("Worker initialization timeout"));
                }
            }, 10000);
        });
    }

    private handleWorkerMessage(message: any): void {
        if (message.type === "parseResult" && message.id) {
            const pendingRequest = this.pendingRequests.get(message.id);
            if (pendingRequest) {
                this.pendingRequests.delete(message.id);
                if (message.success) {
                    const mockTree = this.createMockTreeFromWorker(
                        message.tree
                    );
                    const parseResult: ParseResult = {
                        tree: mockTree,
                        ranges: [], // TODO: Handle ranges from worker
                    };
                    pendingRequest.resolve(parseResult);
                } else {
                    pendingRequest.reject(new Error(message.error));
                }
            }
        }
    }

    private createMockTreeFromWorker(workerTree: any): Parser.Tree {
        const mockTree: any = {
            rootNode: this.createMockNodeFromWorker(workerTree.rootNode),
            getChangedRanges: (other: Parser.Tree) => [],
            edit: () => {},
            walk: () => this.createMockTreeCursor(workerTree.rootNode),
        };
        return mockTree as Parser.Tree;
    }

    private createMockNodeFromWorker(workerNode: any): Parser.SyntaxNode {
        const mockNode: any = {
            type: workerNode.type,
            text: workerNode.text,
            startPosition: workerNode.startPosition,
            endPosition: workerNode.endPosition,
            hasError: () => workerNode.hasError || false,
            children:
                workerNode.children?.map((child: any) =>
                    this.createMockNodeFromWorker(child)
                ) || [],
            parent: null,
            nextSibling: null,
            previousSibling: null,
            firstChild: null,
            lastChild: null,
            childCount: workerNode.childCount || 0,
            namedChildCount: workerNode.namedChildCount || 0,
            startIndex: workerNode.startIndex || 0,
            endIndex: workerNode.endIndex || 0,
            isNamed: () => true,
            isMissing: () => false,
            isExtra: () => false,
            walk: () => this.createMockTreeCursor(workerNode),
        };
        return mockNode as Parser.SyntaxNode;
    }

    private createMockTreeCursor(workerNode: any): Parser.TreeCursor {
        const mockCursor: any = {
            currentNode: () => this.createMockNodeFromWorker(workerNode),
            gotoFirstChild: () => false,
            gotoNextSibling: () => false,
            gotoParent: () => false,
            delete: () => {},
        };
        return mockCursor as Parser.TreeCursor;
    }

    private async parseWithWorker(text: string): Promise<ParseResult> {
        return new Promise<ParseResult>((resolve, reject) => {
            if (!this.workerProcess) {
                reject(new Error("Worker process not available"));
                return;
            }

            const id = ++this.messageId;
            this.pendingRequests.set(id, { resolve, reject });

            this.workerProcess.send({
                type: "parse",
                id,
                text,
            });

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error("Parse request timeout"));
                }
            }, 30000);
        });
    }

    public dispose(): void {
        if (this.workerProcess) {
            console.log("[AblParserHelper] Disposing worker process");
            this.workerProcess.kill();
            this.workerProcess = null;
        }
        this.pendingRequests.clear();
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
