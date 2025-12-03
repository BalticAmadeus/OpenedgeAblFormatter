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
    private workerRequestCount = 0;
    private readonly workerRestartThreshold = 1000;

    public constructor(
        extensionPath: string,
        debugManager: IDebugManager,
        testMode: boolean = false
    ) {
        this.extensionPath = extensionPath;
        this.debugManager = debugManager;
        this.isTestMode = testMode;

        // Use worker-based parsing for crash prevention, with NO main-thread parser fallback
        this.useWorker = true;
    }

    public parse(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): ParseResult {
        throw new Error(
            "Direct parse is disabled. Use parseAsync (worker) only."
        );
    }

    // Patch: respawn worker automatically on next request if it crashed
    private async ensureWorkerReady(): Promise<void> {
        if (
            !this.workerProcess ||
            this.workerRequestCount >= this.workerRestartThreshold
        ) {
            if (this.workerProcess) {
                // Try graceful shutdown
                let exited = false;
                const proc = this.workerProcess;
                const exitPromise = new Promise<void>((resolve) => {
                    const cleanup = () => {
                        exited = true;
                        resolve();
                    };
                    proc.once("exit", cleanup);
                    proc.once("close", cleanup);
                });
                try {
                    proc.send && proc.send({ type: "shutdown" });
                } catch {}
                // Wait up to 2 seconds for graceful exit
                await Promise.race([
                    exitPromise,
                    new Promise((res) => setTimeout(res, 2000)),
                ]);
                if (!exited) {
                    try {
                        proc.kill("SIGTERM");
                    } catch {}
                    // Wait a bit more for forced exit
                    await Promise.race([
                        exitPromise,
                        new Promise((res) => setTimeout(res, 1000)),
                    ]);
                    if (!exited) {
                        try {
                            proc.kill("SIGKILL");
                        } catch {}
                    }
                }
                this.workerProcess = null;
                this.workerReady = false;
            }
            // Start worker and always await readiness
            this.workerInitPromise = this.initializeWorker()
                .then(() => {
                    this.workerReady = true;
                    this.debugManager.parserReady();
                })
                .catch((error: any) => {
                    this.useWorker = false;
                    throw new Error(
                        "Direct parser initialization is disabled. All parsing/formatting must use the worker."
                    );
                });
            await this.workerInitPromise;
            // Defensive: wait until workerReady is true
            if (!this.workerReady) {
                throw new Error("Worker not ready after initialization");
            }
            this.workerRequestCount = 0;
        }
        this.workerRequestCount++;
        // Defensive: if worker is not ready, wait for workerInitPromise
        if (!this.workerReady && this.workerInitPromise) {
            await this.workerInitPromise;
        }
        if (!this.workerReady) {
            throw new Error("Worker not ready");
        }
    }

    public async parseAsync(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): Promise<ParseResult> {
        await this.ensureWorkerReady();
        if (this.useWorker && this.workerReady && this.workerProcess) {
            // Get result from worker
            const result = await this.parseWithWorker(fileIdentifier, text);
            // NEW: Notify DebugManager with error ranges
            if (
                this.debugManager &&
                typeof this.debugManager.handleErrorRanges === "function"
            ) {
                // Convert web-tree-sitter ranges to VSCode Range objects
                const vscode = require("vscode");
                const convertedRanges = (result.ranges || []).map(
                    (r: any) =>
                        new vscode.Range(
                            new vscode.Position(
                                r.startPosition.row,
                                r.startPosition.column
                            ),
                            new vscode.Position(
                                r.endPosition.row,
                                r.endPosition.column
                            )
                        )
                );
                this.debugManager.handleErrorRanges(convertedRanges);
            }
            return result;
        } else {
            // Retry once after a short delay
            await new Promise((res) => setTimeout(res, 50));
            await this.ensureWorkerReady();
            if (this.useWorker && this.workerReady && this.workerProcess) {
                return this.parseWithWorker(fileIdentifier, text);
            }
            throw new Error("Worker not available for parsing (after retry)");
        }
    }

    public async format(file: FileIdentifier, text: string, settings: FormatterSettings): Promise<string> {
        return new Promise<string>((resolve, reject) => {

    public async compare(
        text1: string,
        text2: string,
        options?: any
    ): Promise<boolean> {
        await this.ensureWorkerReady();
        return new Promise<boolean>((resolve, reject) => {
            if (!this.workerProcess) {
                reject(new Error("Worker process not available"));
                return;
            }
            const id = ++this.messageId;
            this.pendingRequests.set(id, { resolve, reject });
            this.workerProcess.send({
                type: "compare",
                id,
                text1,
                text2,
                options,
            });
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error("Compare request timeout"));
                }
            }, 30000);
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
                throw new Error(
                    "Direct parser initialization is disabled. All parsing/formatting must use the worker."
                );
            });
        await this.workerInitPromise;
    }

    private async initializeWorker(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
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
            let args: string[];

            // Try to find the bundled JavaScript worker
            for (const candidatePath of possibleWorkerPaths) {
                const exists = require("fs").existsSync(candidatePath);
                if (exists) {
                    workerPath = candidatePath;
                    break;
                }
            }

            // If no worker found, list directory contents for debugging (removed logs)
            if (!workerPath) {
                try {
                    const dirContents = require("fs").readdirSync(__dirname);
                    const parserDir = path.join(__dirname, "parser");
                    if (require("fs").existsSync(parserDir)) {
                        require("fs").readdirSync(parserDir);
                    }
                    console.log("Parser directory", parserDir);
                    console.log("Directory contens", dirContents);
                } catch (error) {
                    console.log("Error while reading directories", error);
                }
            }

            if (workerPath) {
                args = [workerPath, this.extensionPath];
            } else {
                // Fallback to TypeScript (development mode only)
                const tsWorkerPath = path.join(__dirname, "ParserWorker.ts");
                console.log("Ts worker path", tsWorkerPath);
                if (require("fs").existsSync(tsWorkerPath)) {
                    workerPath = tsWorkerPath;
                    args = [
                        "-r",
                        "ts-node/register",
                        workerPath,
                        this.extensionPath,
                    ];
                } else {
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

            const nodePath = process.execPath;
            this.workerProcess = spawn(nodePath, args, {
                stdio: ["pipe", "pipe", "pipe", "ipc"],
            });

            this.workerProcess.stdout?.on("data", (data) => {
                console.log("[Worker stdout]:", data.toString().trim());
            });

            this.workerProcess.stderr?.on("data", (data) => {
                console.log("[Worker stderr]:", data.toString().trim());
            });

            this.workerProcess.on("message", (message: any) => {
                this.handleWorkerMessage(message);
                if (message.type === "ready") {
                    this.workerReady = true;
                    resolve();
                } else if (message.type === "error") {
                    reject(new Error(message.error));
                }
            });

            this.workerProcess.on("error", (error) => {
                console.log("error", error);
                this.workerProcess = null;
                this.workerReady = false;
                reject(error);
            });

            this.workerProcess.on("exit", (code, signal) => {
                console.log("exit", code, signal);
                this.workerProcess = null;
                this.workerReady = false;
                // Optionally: log or notify about the crash
                // Automatically respawn on next request
            });

            setTimeout(() => {
                if (!this.workerReady) {
                    if (this.workerProcess && !this.workerProcess.killed) {
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
                    // Ensure error is a string
                    const errorMsg =
                        typeof message.error === "object"
                            ? JSON.stringify(message.error)
                            : String(message.error);
                    pendingRequest.reject(new Error(errorMsg));
                }
            }
        } else if (message.type === "formatResult" && message.id) {
            const pendingRequest = this.pendingRequests.get(message.id);
            if (pendingRequest) {
                this.pendingRequests.delete(message.id);
                if (message.success) {
                    const textLength = message.formattedText?.length ?? 0;
                    if (message.formattedText === undefined || message.formattedText === null) {
                        console.error(`[AblParserHelper] Worker returned undefined/null formattedText for request ${message.id}`);
                        pendingRequest.reject(new Error("Worker returned undefined/null formattedText"));
                    } else {
                        pendingRequest.resolve(message.formattedText);
                    }
                } else {
                    // Ensure error is a string
                    const errorMsg =
                        typeof message.error === "object"
                            ? JSON.stringify(message.error)
                            : String(message.error);
                    pendingRequest.reject(new Error(errorMsg));
                }
            }
        } else if (message.type === "compareResult" && message.id) {
            const pendingRequest = this.pendingRequests.get(message.id);
            if (pendingRequest) {
                this.pendingRequests.delete(message.id);
                if (message.success) {
                    pendingRequest.resolve(message.result);
                } else {
                    const errorMsg =
                        typeof message.error === "object"
                            ? JSON.stringify(message.error)
                            : String(message.error);
                    pendingRequest.reject(new Error(errorMsg));
                }
            }
        } else if (message.type === "log") {
        }
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
            try {
                this.workerProcess.send({ type: "shutdown" });
                this.workerProcess.kill("SIGTERM");
            } catch (error) {
                try {
                    this.workerProcess.kill("SIGKILL");
                } catch (killError) {
                    console.log("killError", killError);
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
