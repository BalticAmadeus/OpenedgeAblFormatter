import Parser, { Tree } from "web-tree-sitter";
import path from "path";
import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { WorkerConfigurationManager } from "../utils/ConfigurationManagerWorker";
import { enableFormatterDecorators } from "../formatterFramework/enableFormatterDecorators";

// Register all formatters in the worker
enableFormatterDecorators();

class ParserWorker {
    private parser: Parser | null = null;
    private ablLanguage: Parser.Language | null = null;

    constructor() {
        console.log("[ParserWorker] Starting parser worker process...");
        // Don't start initialization here, wait for start() to be called
    }

    private async initializeParser(): Promise<void> {
        try {
            console.log("[ParserWorker] Initializing tree-sitter...");

            // Initialize tree-sitter first
            await Parser.init();
            this.parser = new Parser();

            console.log("[ParserWorker] Loading tree-sitter ABL language...");

            // Get the extension path from command line arguments or environment
            const extensionPath =
                process.argv[2] || process.env.EXTENSION_PATH || "";
            const wasmPath = path.join(
                extensionPath,
                "resources/tree-sitter-abl.wasm"
            );

            console.log(`[ParserWorker] WASM path: ${wasmPath}`);

            this.ablLanguage = await Parser.Language.load(wasmPath);
            this.parser.setLanguage(this.ablLanguage);

            console.log("[ParserWorker] Parser initialized successfully");
        } catch (error) {
            console.error("[ParserWorker] Failed to initialize parser:", error);
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
        console.log("[ParserWorker] Received message:", message.type);

        switch (message.type) {
            case "parse":
                this.handleParseRequest(message);
                break;
            case "ping":
                this.handlePingRequest(message);
                break;
            case "shutdown":
                console.log("[ParserWorker] Received shutdown request");
                process.exit(0);
            case "format":
                this.handleFormatRequest(message);
                break;
            default:
                console.log(
                    "[ParserWorker] Unknown message type:",
                    message.type
                );
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
            console.log('[Worker] Settings before override:', JSON.stringify(settings));

            const fileIdentifier = {
                name: message.fileId,
                version: 1,
                toKey: () => String(message.fileId),
            };
            // Use WorkerConfigurationManager in the worker
            const configManager = new WorkerConfigurationManager();
            configManager.setAll(settings);
            console.log('[Worker] ConfigManager after setAll:', JSON.stringify(configManager.getAll()));

            // Dummy debug manager
            const debugManager = {
                log: (..._args: any[]) => {},
                isDebugEnabled: () => false,
                handleErrors: () => {},
                parserReady: () => {},
                fileFormattedSuccessfully: () => {},
                isInDebugMode: () => false,
            };
            // Dummy parser helper (implements IParserHelper signature, returns ParseResult)
            const parserHelper = {
                getParser: () => this.parser,
                getLanguage: () => this.ablLanguage,
                getTree: () => tree,
                parse: (_fileIdentifier: any, text: string, _previousTree?: any) => {
                    return { tree: this.parser!.parse(text), ranges: [] };
                },
                parseAsync: async (_fileIdentifier: any, text: string, _previousTree?: any) => {
                    return { tree: this.parser!.parse(text), ranges: [] };
                },
                format: async () => { throw new Error("Not implemented in worker dummy parserHelper"); },
            };

            // Parse and apply settings override from comment block in the document
            const overrideMatch = message.text.match(/\/\*+\s*formatterSettingsOverride\s*\*\/[\s\r\n]*\/\*+([\s\S]*?)\*\//i);
            if (overrideMatch) {
                try {
                    const overrideJson = overrideMatch[1];
                    const overrideSettings = JSON.parse(overrideJson);
                    console.log('[Worker] Parsed settings override from comment:', overrideSettings);
                    // Use setOverridingSettings so comment overrides take precedence
                    configManager.setOverridingSettings(overrideSettings);
                } catch (e) {
                    console.error('[Worker] Failed to parse settings override from comment:', e);
                }
            }
            console.log('[Worker] ConfigManager after comment override:', JSON.stringify(configManager.getAll()));

            // --- Apply settings override from comments before formatting ---
            // This matches the main-thread logic
            const formattingEngine = new FormattingEngine(
                parserHelper,
                fileIdentifier,
                configManager,
                debugManager
            );
            // ParseResult for settingsOverride
            const parseResult = { tree, ranges: [] };
            formattingEngine["settingsOverride"](parseResult);
            console.log('[Worker] ConfigManager after settingsOverride:', JSON.stringify(configManager.getAll()));
            // Now format with updated configManager (only correct settings enabled)
            const formattedText = formattingEngine.formatText(message.text, message.options?.eol);
            console.log('[Worker] Formatted text output:', JSON.stringify(formattedText));

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
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    private handlePingRequest(message: any): void {
        console.log("[ParserWorker] Handling ping request");
        if (process.send) {
            process.send({
                type: "pong",
                id: message.id,
                timestamp: Date.now(),
            });
        }
    }

    private handleParseRequest(message: any): void {
        console.log(
            "[ParserWorker] Handling parse request for text length:",
            message.text?.length || 0
        );

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
            if (node.hasError() || node.type === "ERROR") {
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

    private serializeNodeBasic(node: Parser.SyntaxNode): any {
        // Serialize just basic info about sibling nodes to avoid deep recursion
        return {
            id: node.id,
            type: node.type,
            text: node.text,
            startPosition: node.startPosition,
            endPosition: node.endPosition,
            startIndex: node.startIndex,
            endIndex: node.endIndex,
            isNamed: node.isNamed(),
            isMissing: node.isMissing(),
            hasError: node.hasError(),
        };
    }

    public async start(): Promise<void> {
        console.log("[ParserWorker] Worker started, listening for messages...");

        // Listen for messages from parent process
        process.on("message", (message) => {
            this.handleMessage(message);
        });

        // Keep the process alive - wait for messages
        console.log("[ParserWorker] Ready and waiting for messages...");

        // Initialize the parser asynchronously
        await this.initializeParser();

        // Send ready signal to parent process after initialization
        console.log("[ParserWorker] Sending ready signal to parent...");
        if (process.send) {
            process.send({ type: "ready" });
        }

        // Handle graceful shutdown
        process.on("SIGTERM", () => {
            console.log("[ParserWorker] Received SIGTERM, shutting down...");
            process.exit(0);
        });

        process.on("SIGINT", () => {
            console.log("[ParserWorker] Received SIGINT, shutting down...");
            process.exit(0);
        });

        // Handle parent process disconnect
        process.on("disconnect", () => {
            console.log(
                "[ParserWorker] Parent process disconnected, shutting down..."
            );
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
