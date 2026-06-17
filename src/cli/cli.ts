#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

// Suppress formatter registration logs unless verbose mode
if (!process.argv.includes("--verbose") && !process.argv.includes("-v")) {
    process.env.ABL_FORMATTER_QUIET = "1";
}

import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { CliParserHelper } from "./CliParserHelper";
import { CliConfigurationManager } from "./CliConfigurationManager";
import { CliDebugManager } from "./CliDebugManager";
import { CliTelemetry } from "./CliTelemetry";
import { FileIdentifier } from "../model/FileIdentifier";
import { EOL } from "../model/EOL";
import { enableFormatterDecorators } from "../formatterFramework/enableFormatterDecorators";

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        printUsage();
        process.exit(0);
    }

    try {
        // Extract the file path (first non-flag argument)
        const fileArg = args.find((arg) => !arg.startsWith("-"));
        if (!fileArg) {
            console.error("Error: No file specified");
            printUsage();
            process.exit(1);
        }

        const filePath = path.resolve(fileArg);

        if (!fs.existsSync(filePath)) {
            console.error(`Error: File not found: ${filePath}`);
            process.exit(1);
        }

        const isWrite = args.includes("--write") || args.includes("-w");
        const isCheck = args.includes("--check") || args.includes("-c");
        const telemetryEnabled =
            args.includes("--telemetry") ||
            ["1", "true", "yes"].includes(
                (process.env.ABL_FORMATTER_TELEMETRY || "").toLowerCase()
            );
        const configIndex = args.indexOf("--config");
        const configFile =
            configIndex !== -1 ? args[configIndex + 1] : undefined;
        const verbose = args.includes("--verbose") || args.includes("-v");

        if (telemetryEnabled) {
            CliTelemetry.initialize();
        }

        // Initialize formatter
        // Look for WASM file in multiple locations
        let wasmPath = path.join(__dirname, "../../tree-sitter-abl.wasm");
        if (!fs.existsSync(wasmPath)) {
            wasmPath = path.join(__dirname, "../tree-sitter-abl.wasm");
        }
        if (!fs.existsSync(wasmPath)) {
            wasmPath = path.join(__dirname, "tree-sitter-abl.wasm");
        }
        if (!fs.existsSync(wasmPath)) {
            console.error("Error: tree-sitter-abl.wasm not found. Make sure to run 'npm run build-cli'");
            process.exit(1);
        }
        const parserHelper = new CliParserHelper(wasmPath);
        await parserHelper.awaitLanguage();

        enableFormatterDecorators();

        const configManager = new CliConfigurationManager(configFile);
        const debugManager = new CliDebugManager(verbose);

        // Read file
        const originalCode = fs.readFileSync(filePath, "utf-8");

        const initialParseResult = parserHelper.parse(
            new FileIdentifier(filePath, 1),
            originalCode
        );
        const initialParseErrorCount = countErrorNodes(
            initialParseResult.tree.rootNode,
            true
        );

        if (initialParseErrorCount > 0) {
            console.error(
                `Warning: tree-sitter detected ${initialParseErrorCount} syntax error(s) in the input file; formatting may be incomplete.`
            );
        }

        // Format
        const formatter = new FormattingEngine(
            parserHelper,
            new FileIdentifier(filePath, 1),
            configManager,
            debugManager
        );

        const fileEol = originalCode.includes("\r\n") ? "\r\n" : "\n";

        const formattedCode = formatter.formatText(
            originalCode,
            new EOL(fileEol),
            false
        );

        if (telemetryEnabled) {
            CliTelemetry.sendEvent(
                "CLI.Format",
                {
                    mode: isWrite ? "write" : isCheck ? "check" : "stdout",
                    verbose: verbose ? "true" : "false",
                },
                {
                    characters: originalCode.length,
                    lines: originalCode.split(/\r?\n/).length,
                    parseErrors: initialParseErrorCount,
                }
            );
        }

        if (debugManager.hasParseErrors()) {
            console.error(
                `Warning: tree-sitter detected ${debugManager.getParseErrorCount()} syntax error(s); formatting may be incomplete.`
            );
        }

        // Handle output
        if (isCheck) {
            if (originalCode !== formattedCode) {
                console.log(`${filePath} would be reformatted`);
                process.exit(1);
            } else {
                console.log(`${filePath} is already formatted`);
                process.exit(0);
            }
        } else if (isWrite) {
            fs.writeFileSync(filePath, formattedCode, "utf-8");
            console.log(`Formatted: ${filePath}`);
            process.exit(0);
        } else {
            // Output to stdout
            console.log(formattedCode);
            process.exit(0);
        }
    } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        CliTelemetry.sendEvent("CLI.Error", {
            message: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    }
}

function printUsage() {
    console.log(`
abl-format - OpenEdge ABL Code Formatter CLI

USAGE:
  abl-format <file> [OPTIONS]

OPTIONS:
  --write, -w        Write formatted code back to file
  --check, -c        Check if file would be reformatted (exit 1 if yes)
  --config <path>    Path to .ablformatter.json config file
    --telemetry        Enable CLI telemetry if a telemetry key is available
  --verbose, -v      Show verbose output
  --help, -h         Show this help message

EXAMPLES:
  # Format and output to stdout
  abl-format myfile.p

  # Format and write back to file
  abl-format myfile.p --write

  # Check if file needs formatting
  abl-format myfile.p --check

  # Use custom config
  abl-format myfile.p --write --config .ablformatter.json

    # Opt into CLI telemetry with a key provided via environment variables
    ABL_FORMATTER_TELEMETRY=1 ABL_FORMATTER_TELEMETRY_KEY=... abl-format myfile.p --telemetry
`);
}

main().catch((error) => {
    console.error("Unexpected error:", error);
        CliTelemetry.sendEvent("CLI.FatalError", {
                message: error instanceof Error ? error.message : String(error),
        });
        CliTelemetry.dispose();
    process.exit(1);
});

process.on("exit", () => {
        CliTelemetry.dispose();
});

function countErrorNodes(node: any, isRoot: boolean): number {
    let errorCount = 0;

    if (!isRoot && node.type === "ERROR") {
        errorCount += 1;
    }

    for (const child of node.children) {
        errorCount += countErrorNodes(child, false);
    }

    return errorCount;
}
