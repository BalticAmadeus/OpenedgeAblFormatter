import Parser, { Tree } from "web-tree-sitter";
import path from "path";

/**
 * ParserWorker - A worker process for handling tree-sitter parsing operations
 * This runs in a separate process to avoid V8 heap limit issues in VS Code
 */
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
            default:
                console.log(
                    "[ParserWorker] Unknown message type:",
                    message.type
                );
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

            // Send back the serialized tree data
            if (process.send) {
                process.send({
                    type: "parseResult",
                    id: message.id,
                    success: true,
                    tree: serializedTree,
                });
            }
        } catch (error) {
            console.error("[ParserWorker] Parse error:", error);
            if (process.send) {
                process.send({
                    type: "parseResult",
                    id: message.id,
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
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
            type: node.type,
            text: node.text,
            startPosition: node.startPosition,
            endPosition: node.endPosition,
            hasError: node.hasError(),
            startIndex: node.startIndex,
            endIndex: node.endIndex,
            childCount: node.childCount,
            namedChildCount: node.namedChildCount,
            children: node.children.map((child) => this.serializeNode(child)),
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

        // Keep the process alive by ensuring there's always something to do
        // This prevents Node.js from exiting when there are no active handles
        const keepAlive = setInterval(() => {
            // Just a keep-alive timer - does nothing but keeps process alive
        }, 30000);

        // Clean up on exit
        process.on("exit", () => {
            clearInterval(keepAlive);
        });
    }
}

// Start the worker if this file is run directly
if (require.main === module) {
    const worker = new ParserWorker();
    worker.start().catch(console.error);
}

export { ParserWorker };
