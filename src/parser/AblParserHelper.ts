import Parser, { Tree } from "web-tree-sitter";
import { IParserHelper } from "./IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { ParseResult } from "../model/ParseResult";
import path from "path";
import { IDebugManager } from "../providers/IDebugManager";
import { spawn, ChildProcess } from "child_process";
import { createTreeProxy } from "../utils/proxyTree";
import { ConfigurationManager } from "../utils/ConfigurationManager";

export class AblParserHelper implements IParserHelper {
    private parser: Parser | null = null;
    private trees = new Map<string, Parser.Tree>();
    private ablLanguagePromise: Promise<Parser.Language> | null = null;

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
    private isTestMode: boolean = false;

    public constructor(
        extensionPath: string,
        debugManager: IDebugManager,
        testMode: boolean = false
    ) {
        this.extensionPath = extensionPath;
        this.debugManager = debugManager;
        this.isTestMode = testMode;

        // Use worker-based parsing for crash prevention, with NO main-thread parser fallback
        console.log(
            "[AblParserHelper] Using worker-based parsing ONLY (no main-thread parser)"
        );
        this.useWorker = true;
    }

    public async awaitMainThreadParserReady(): Promise<void> {
        // No-op: main-thread parser is never initialized
        return;
    }

    private async initializeMainThreadParser(): Promise<Parser.Language> {
        throw new Error("Main-thread parser initialization is disabled. All parsing/formatting must use the worker.");
    }

    public async awaitWorkerReady(): Promise<void> {
        if (this.workerInitPromise) {
            await this.workerInitPromise;
        }
    }

    public async awaitLanguage(): Promise<void> {
        await this.awaitWorkerReady();
    }

    private async initializeDirectParser(): Promise<void> {
        throw new Error("Direct parser initialization is disabled. All parsing/formatting must use the worker.");
    }

    public parse(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): ParseResult {
        throw new Error("Direct parse is disabled. Use parseAsync (worker) only.");
    }

    public async parseAsync(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): Promise<ParseResult> {
        if (this.useWorker && this.workerReady) {
            console.log("[AblParserHelper] Using worker-based parsing");
            return this.parseWithWorker(fileIdentifier, text);
        } else {
            throw new Error("Worker not available for parsing");
        }
    }

    public async format(
        fileIdentifier: FileIdentifier,
        text: string,
        options?: any
    ): Promise<string> {
        // Always send all relevant settings if not already provided
        if (!options) options = {};
        if (!options.settings) {
            options.settings = ConfigurationManager.getInstance().getAll();
        }
        return new Promise<string>((resolve, reject) => {
            if (!this.workerProcess) {
                reject(new Error("Worker process not available"));
                return;
            }
            const id = ++this.messageId;
            this.pendingRequests.set(id, { resolve, reject });
            this.workerProcess.send({
                type: "format",
                id,
                fileId: fileIdentifier.name,
                text,
                options,
            });
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error("Format request timeout"));
                }
            }, 60000);
        });
    }

    public async startWorker(): Promise<void> {
        if (this.workerProcess) {
            // Already running, do nothing
            return;
        }
        this.workerReady = false;
        this.useWorker = true; // Always allow worker usage on restart
        this.workerInitPromise = this.initializeWorker()
            .then(() => {
                this.workerReady = true;
                this.debugManager.parserReady();
            })
            .catch((error: any) => {
                this.useWorker = false;
                return this.initializeDirectParser();
            });
        await this.workerInitPromise;
    }

    private async initializeWorker(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            console.log(`[AblParserHelper] __dirname: ${__dirname}`);
            console.log(
                `[AblParserHelper] extensionPath: ${this.extensionPath}`
            );

            // Try multiple possible locations for the bundled worker
            const possibleWorkerPaths = [
                path.join(__dirname, "ParserWorker.js"), // Same directory as AblParserHelper
                path.join(__dirname, "parser", "ParserWorker.js"), // __dirname + parser subdirectory
                path.join(
                    this.extensionPath,
                    "out",
                    "parser",
                    "ParserWorker.js"
                ), // Extension path + out/parser
                path.join(this.extensionPath, "out", "ParserWorker.js"), // Extension path + out
                // Additional paths for packaged extension
                path.resolve(__dirname, "..", "parser", "ParserWorker.js"), // Go up one level then parser
                path.resolve(__dirname, "ParserWorker.js"), // Direct resolve
            ];

            let workerPath: string | null = null;
            let command: string;
            let args: string[];

            // Try to find the bundled JavaScript worker
            for (const candidatePath of possibleWorkerPaths) {
                console.log(
                    `[AblParserHelper] Checking worker path: ${candidatePath}`
                );
                const exists = require("fs").existsSync(candidatePath);
                console.log(`[AblParserHelper] Path exists: ${exists}`);
                if (exists) {
                    workerPath = candidatePath;
                    console.log(
                        `[AblParserHelper] Found bundled JS worker: ${workerPath}`
                    );
                    break;
                }
            }

            // If no worker found, list directory contents for debugging
            if (!workerPath) {
                console.log(
                    `[AblParserHelper] No worker found. Debugging directory contents:`
                );
                try {
                    const dirContents = require("fs").readdirSync(__dirname);
                    console.log(
                        `[AblParserHelper] __dirname contents:`,
                        dirContents
                    );

                    const parserDir = path.join(__dirname, "parser");
                    if (require("fs").existsSync(parserDir)) {
                        const parserContents =
                            require("fs").readdirSync(parserDir);
                        console.log(
                            `[AblParserHelper] parser directory contents:`,
                            parserContents
                        );
                    } else {
                        console.log(
                            `[AblParserHelper] parser directory does not exist at:`,
                            parserDir
                        );
                    }
                } catch (error) {
                    console.log(
                        `[AblParserHelper] Error reading directory:`,
                        error
                    );
                }
            }

            if (workerPath) {
                command = "node";
                args = [workerPath, this.extensionPath];
                console.log(
                    `[AblParserHelper] Using compiled JS worker: ${workerPath}`
                );
            } else {
                // Fallback to TypeScript (development mode only)
                const tsWorkerPath = path.join(__dirname, "ParserWorker.ts");
                console.log(
                    `[AblParserHelper] No JS worker found, checking TypeScript fallback: ${tsWorkerPath}`
                );

                if (require("fs").existsSync(tsWorkerPath)) {
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
                } else {
                    console.error(
                        `[AblParserHelper] No worker file found. Checked paths: ${possibleWorkerPaths.join(
                            ", "
                        )}, ${tsWorkerPath}`
                    );
                    reject(
                        new Error(
                            `Neither JS nor TS worker found. Checked: ${possibleWorkerPaths.join(
                                ", "
                            )}, ${tsWorkerPath}`
                        )
                    );
                    return;
                }
            }

            console.log(
                `[AblParserHelper] Spawning worker process with command: ${command} ${args.join(
                    " "
                )}`
            );

            this.workerProcess = spawn(command, args, {
                stdio: ["pipe", "pipe", "pipe", "ipc"],
            });

            console.log(
                `[AblParserHelper] Worker process spawned with PID: ${this.workerProcess.pid}`
            );

            this.workerProcess.stdout?.on("data", (data) => {
                console.log(`[Worker stdout]: ${data.toString().trim()}`);
            });

            this.workerProcess.stderr?.on("data", (data) => {
                console.error(`[Worker stderr]: ${data.toString().trim()}`);
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
                console.error("[AblParserHelper] Command:", command);
                console.error("[AblParserHelper] Args:", args);
                reject(error);
            });

            this.workerProcess.on("exit", (code) => {
                console.log(
                    `[AblParserHelper] Worker process exited with code ${code}`
                );
                this.workerProcess = null;
                this.workerReady = false;
            });

            setTimeout(() => {
                if (!this.workerReady) {
                    console.error(
                        "[AblParserHelper] Worker initialization timeout - no ready message received"
                    );
                    if (this.workerProcess && !this.workerProcess.killed) {
                        console.error(
                            "[AblParserHelper] Worker process still running but not ready"
                        );
                        this.workerProcess.kill("SIGTERM");
                    }
                    reject(
                        new Error(
                            "Worker initialization timeout - no ready message received within 15 seconds"
                        )
                    );
                }
            }, 15000);
        });
    }

    private handleWorkerMessage(message: any): void {
        if (message.type === "parseResult" && message.id) {
            const pendingRequest = this.pendingRequests.get(message.id);
            if (pendingRequest) {
                this.pendingRequests.delete(message.id);
                if (message.success) {
                    // Create a lightweight tree proxy that delegates operations to the worker
                    const treeProxy = createTreeProxy(
                        message.fileId,
                        message.tree
                    );
                    const parseResult: ParseResult = {
                        tree: treeProxy,
                        ranges: message.errorRanges || [], // Get error ranges from worker
                    };
                    pendingRequest.resolve(parseResult);
                } else {
                    pendingRequest.reject(new Error(message.error));
                }
            }
        } else if (message.type === "formatResult" && message.id) {
            const pendingRequest = this.pendingRequests.get(message.id);
            if (pendingRequest) {
                this.pendingRequests.delete(message.id);
                if (message.success) {
                    pendingRequest.resolve(message.formattedText);
                } else {
                    pendingRequest.reject(new Error(message.error));
                }
            }
        }
    }

    private extractErrorRanges(tree: Parser.Tree): Parser.Range[] {
        const ranges: Parser.Range[] = [];
        const collectErrors = (node: Parser.SyntaxNode) => {
            if (node.hasError() || node.type === "ERROR") {
                ranges.push({
                    startPosition: node.startPosition,
                    endPosition: node.endPosition,
                    startIndex: node.startIndex,
                    endIndex: node.endIndex,
                });
            }
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) collectErrors(child);
            }
        };
        collectErrors(tree.rootNode);
        return ranges;
    }

    private async parseWithWorker(
        fileIdentifier: FileIdentifier,
        text: string
    ): Promise<ParseResult> {
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
                fileId: fileIdentifier.name,
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
            try {
                this.workerProcess.send({ type: "shutdown" });
                this.workerProcess.kill("SIGTERM");
                console.log("[AblParserHelper] Worker process terminated");
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.log(
                    "[AblParserHelper] Error sending shutdown message, force killing:",
                    errorMessage
                );
                try {
                    this.workerProcess.kill("SIGKILL");
                } catch (killError) {
                    const killErrorMessage =
                        killError instanceof Error
                            ? killError.message
                            : String(killError);
                    console.log(
                        "[AblParserHelper] Error killing worker process:",
                        killErrorMessage
                    );
                }
            }
            this.workerProcess = null;
        }
        this.workerReady = false;
        this.workerInitPromise = null;
        this.useWorker = true; // Always allow retrying worker startup
        this.pendingRequests.clear();
    }

    public isParserAvailable(): boolean {
        return (this.useWorker && this.workerReady) || !!this.parser;
    }
}
