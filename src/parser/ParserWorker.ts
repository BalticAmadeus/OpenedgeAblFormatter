import Parser from "web-tree-sitter";
import path from "path";
import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { WorkerConfigurationManager } from "../utils/ConfigurationManagerWorker";
import { enableFormatterDecorators } from "../formatterFramework/enableFormatterDecorators";
import { DebugManagerMock } from "../test/suite/DebugManagerMock";
import { FileIdentifier } from "../model/FileIdentifier";

// Register all formatters in the worker
enableFormatterDecorators();

class ParserWorker {
    private parser: Parser | null = null;
    private ablLanguage: Parser.Language | null = null;

    constructor() {
        // Don't start initialization here, wait for start() to be called
        if (process.send) {
            process.send({
                type: "log",
                message: "Worker started...",
            });
        }
    }

    private async initializeParser(): Promise<void> {
        try {
            // Initialize tree-sitter first
            await Parser.init();
            this.parser = new Parser();

            // Get the extension path from command line arguments or environment
            const extensionPath =
                process.argv[2] || process.env.EXTENSION_PATH || "";
            const wasmPath = path.join(
                extensionPath,
                "resources/tree-sitter-abl.wasm"
            );

            this.ablLanguage = await Parser.Language.load(wasmPath);
            this.parser.setLanguage(this.ablLanguage);
        } catch (error) {
            if (process.send) {
                process.send({
                    type: "error",
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
            process.exit(1);
        }
    }

    private handleMessage(message: any): void {
        switch (message.type) {
            case "parse":
                this.handleParseRequest(message);
                break;
            case "ping":
                this.handlePingRequest(message);
                break;
            case "shutdown":
                process.exit(0);
            case "format":
                this.handleFormatRequest(message);
                break;
            case "compare":
                this.handleCompareRequest(message);
                break;
            default:
            // Unknown message type, ignore
        }
    }

    private handleCompareRequest(message: any): void {
        try {
            if (!this.ablLanguage || !this.parser) {
                throw new Error("Parser not initialized");
            }

            // Parse both texts
            const tree1 = this.parser.parse(message.text1);
            const tree2 = this.parser.parse(message.text2);

            // Accept settings from the main thread (message.options.settings)
            const settings = { ...(message.options?.settings || {}) };

            // Use WorkerConfigurationManager in the worker
            const configManager = new WorkerConfigurationManager();
            configManager.setAll(settings);

            // Dummy parserHelper for FormattingEngine
            const parserHelper = {
                getParser: () => this.parser,
                getLanguage: () => this.ablLanguage,
                getTree: () => tree1, // Not used in isAstEqual
                parse: (
                    _fileIdentifier: any,
                    text: string,
                    _previousTree?: any
                ) => {
                    return { tree: this.parser!.parse(text), ranges: [] };
                },
                parseAsync: async (
                    _fileIdentifier: any,
                    text: string,
                    _previousTree?: any
                ) => {
                    return { tree: this.parser!.parse(text), ranges: [] };
                },
                format: async () => {
                    throw new Error(
                        "Not implemented in worker dummy parserHelper"
                    );
                },
            };

            const formattingEngine = new FormattingEngine(
                parserHelper,
                new FileIdentifier("worker", 1),
                configManager,
                new DebugManagerMock()
            );

            // Use formatter-specific AST comparison
            const result = formattingEngine.isAstEqual(tree1, tree2);
            if (process.send) {
                process.send({
                    type: "compareResult",
                    id: message.id,
                    success: true,
                    result,
                });
            }

            tree1.delete();
            tree2.delete();
        } catch (error) {
            if (process.send) {
                process.send({
                    type: "compareResult",
                    id: message.id,
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    private handleFormatRequest(message: any): void {
        try {
            if (!this.ablLanguage || !this.parser) {
                throw new Error("Parser not initialized");
            }

            // Parse the text using the worker's parser
            const tree = this.parser.parse(message.text);

            // Accept settings from the main thread (message.options.settings)
            const settings = { ...(message.options?.settings || {}) };

            // Use WorkerConfigurationManager in the worker
            const configManager = new WorkerConfigurationManager();
            configManager.setAll(settings);

            // Parse and apply settings override from comment block in the document
            this.applySettingsOverrideFromComment(message.text, configManager);

            // Dummy parser helper (implements IParserHelper signature, returns ParseResult)
            const parserHelper = {
                getParser: () => this.parser,
                getLanguage: () => this.ablLanguage,
                getTree: () => tree,
                parse: (
                    _fileIdentifier: any,
                    text: string,
                    _previousTree?: any
                ) => {
                    return { tree: this.parser!.parse(text), ranges: [] };
                },
                parseAsync: async (
                    _fileIdentifier: any,
                    text: string,
                    _previousTree?: any
                ) => {
                    return { tree: this.parser!.parse(text), ranges: [] };
                },
                format: async () => {
                    throw new Error(
                        "Not implemented in worker dummy parserHelper"
                    );
                },
            };

            // --- Apply settings override from comments before formatting ---
            // This matches the main-thread logic
            const formattingEngine = new FormattingEngine(
                parserHelper,
                new FileIdentifier(message.fileId || "worker", 1),
                configManager,
                new DebugManagerMock()
            );
            // ParseResult for settingsOverride
            const parseResult = { tree, ranges: [] };
            formattingEngine["settingsOverride"](parseResult);

            // Now format with updated configManager (only correct settings enabled)
            const formattedText = formattingEngine.formatText(
                message.text,
                message.options?.eol
            );

            if (process.send) {
                process.send({
                    type: "formatResult",
                    id: message.id,
                    success: true,
                    formattedText,
                });
            }
        } catch (error) {
            if (process.send) {
                process.send({
                    type: "formatResult",
                    id: message.id,
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    private applySettingsOverrideFromComment(
        text: string,
        configManager: WorkerConfigurationManager
    ): void {
        const overrideMatch = text.match(
            /\/\*+\s*formatterSettingsOverride\s*\*\/[\s\r\n]*\/\*+([\s\S]*?)\*\//i
        );
        if (overrideMatch) {
            try {
                const overrideJson = overrideMatch[1];
                const overrideSettings = JSON.parse(overrideJson);
                configManager.setOverridingSettings(overrideSettings);
            } catch (e) {
                console.error(
                    "[Worker] Failed to parse settings override from comment:",
                    e
                );
            }
        }
    }

    private handlePingRequest(message: any): void {
        if (process.send) {
            process.send({
                type: "pong",
                id: message.id,
                timestamp: Date.now(),
            });
        }
    }

    private handleParseRequest(message: any): void {
        try {
            if (!this.ablLanguage || !this.parser) {
                throw new Error("Parser not initialized");
            }

            const tree = this.parser.parse(message.text);
            const serializedTree = this.serializeTree(tree);

            // Extract error ranges
            const errorRanges = this.extractErrorRanges(tree);

            // Send back the serialized tree data with error ranges and default EOL
            if (process.send) {
                process.send({
                    type: "parseResult",
                    id: message.id,
                    fileId: message.fileId,
                    success: true,
                    tree: serializedTree,
                    errorRanges: errorRanges,
                    eol: message.options?.eol || "\n", // Add default EOL property
                });
            }
        } catch (error) {
            console.error("[ParserWorker] Parse error:", error);
            if (process.send) {
                process.send({
                    type: "parseResult",
                    id: message.id,
                    fileId: message.fileId,
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    private extractErrorRanges(tree: Parser.Tree): Parser.Range[] {
        const ranges: Parser.Range[] = [];

        const collectErrors = (node: Parser.SyntaxNode) => {
            // Only add the node if it is an error node itself
            if (node.type === "ERROR") {
                ranges.push({
                    startPosition: node.startPosition,
                    endPosition: node.endPosition,
                    startIndex: node.startIndex,
                    endIndex: node.endIndex,
                });
            }
            // Recursively check children
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    collectErrors(child);
                }
            }
        };

        collectErrors(tree.rootNode);
        return ranges;
    }

    private serializeTree(tree: Parser.Tree): any {
        // Send just the essential tree data for serialization
        return {
            rootNode: this.serializeNode(tree.rootNode),
            hasErrors: tree.rootNode.hasError(),
        };
    }

    private serializeNode(node: Parser.SyntaxNode): any {
        // Send only the data needed, not methods or interface implementations
        return {
            id: node.id, // Include the node ID for hover display and formatter logic
            type: node.type,
            text: node.text,
            startPosition: node.startPosition,
            endPosition: node.endPosition,
            hasError: node.hasError(),
            startIndex: node.startIndex,
            endIndex: node.endIndex,
            childCount: node.childCount,
            namedChildCount: node.namedChildCount,
            isNamed: node.isNamed(),
            isMissing: node.isMissing(),
            children: node.children.map((child) => this.serializeNode(child)),
            // Add sibling information
            hasNextSibling: !!node.nextSibling,
            hasPreviousSibling: !!node.previousSibling,
            hasNextNamedSibling: !!node.nextNamedSibling,
            hasPreviousNamedSibling: !!node.previousNamedSibling,
        };
    }

    public async start(): Promise<void> {
        // Listen for messages from parent process
        process.on("message", (message) => {
            this.handleMessage(message);
        });

        // Initialize the parser asynchronously
        await this.initializeParser();

        // Send ready signal to parent process after initialization
        if (process.send) {
            process.send({ type: "ready" });
        }

        // Handle graceful shutdown
        process.on("SIGTERM", () => {
            process.exit(0);
        });

        process.on("SIGINT", () => {
            process.exit(0);
        });

        // Handle parent process disconnect
        process.on("disconnect", () => {
            process.exit(0);
        });

        // Handle uncaught exceptions to prevent hanging
        process.on("uncaughtException", (error) => {
            console.error("[ParserWorker] Uncaught exception:", error);
            process.exit(1);
        });

        process.on("unhandledRejection", (reason, promise) => {
            console.error(
                "[ParserWorker] Unhandled rejection at:",
                promise,
                "reason:",
                reason
            );
            process.exit(1);
        });
    }
}

// Start the worker if this file is run directly
if (require.main === module) {
    const worker = new ParserWorker();
    worker.start().catch(console.error);
}

export { ParserWorker };
