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
        throw new Error("Direct parse is disabled. Use parseAsync (worker) only.");
    }

    public async parseAsync(
        fileIdentifier: FileIdentifier,
        text: string,
        previousTree?: Tree
    ): Promise<ParseResult> {
        if (this.useWorker && this.workerReady) {
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
                throw new Error("Direct parser initialization is disabled. All parsing/formatting must use the worker.");
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
            let command: string;
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
                } catch (error) {
                    // ignore
                }
            }

            if (workerPath) {
                command = "node";
                args = [workerPath, this.extensionPath];
            } else {
                // Fallback to TypeScript (development mode only)
                const tsWorkerPath = path.join(__dirname, "ParserWorker.ts");
                if (require("fs").existsSync(tsWorkerPath)) {
                    workerPath = tsWorkerPath;
                    command = "node";
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

            this.workerProcess = spawn(command, args, {
                stdio: ["pipe", "pipe", "pipe", "ipc"],
            });

            this.workerProcess.stdout?.on("data", (data) => {
                // Optionally handle worker stdout
            });

            this.workerProcess.stderr?.on("data", (data) => {
                // Optionally handle worker stderr
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
                reject(error);
            });

            this.workerProcess.on("exit", (code) => {
                this.workerProcess = null;
                this.workerReady = false;
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
                    // ignore
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
