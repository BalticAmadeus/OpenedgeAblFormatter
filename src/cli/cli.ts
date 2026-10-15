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
        // Options that consume the following argument, so its value is never
        // mistaken for the input file (e.g. `--config settings.json file.p`).
        const valueFlags = new Set(["--config"]);

        const positionalArgs: string[] = [];
        let configFile: string | undefined;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (valueFlags.has(arg)) {
                const value = args[i + 1];
                if (value === undefined || value.startsWith("-")) {
                    console.error(`Error: ${arg} requires a value`);
                    process.exit(1);
                }
                if (arg === "--config") {
                    configFile = value;
                }
                i++; // skip the consumed value
                continue;
            }

            if (arg.startsWith("-")) {
                continue;
            }

            positionalArgs.push(arg);
        }

        if (positionalArgs.length === 0) {
            console.error("Error: No file specified");
            printUsage();
            process.exit(1);
        }

        // Only one file per run is supported. Silently ignoring the extras is
        // dangerous: `abl-format *.p --check` would expand to many files, check
        // only the first, and exit 0 - a CI gate that passes while unformatted
        // files go unnoticed. Fail loudly instead.
        if (positionalArgs.length > 1) {
            console.error(
                `Error: Expected exactly one file, but got ${positionalArgs.length}: ${positionalArgs.join(", ")}`
            );
            console.error(
                "The CLI formats one file per run. Loop over files instead, e.g.:"
            );
            console.error(
                '  for f in *.p; do abl-format "$f" --check || exit 1; done'
            );
            process.exit(1);
        }

        const fileArg = positionalArgs[0];

        const filePath = path.resolve(fileArg);

        if (!fs.existsSync(filePath)) {
            console.error(`Error: File not found: ${filePath}`);
            process.exit(1);
        }

        // existsSync() is true for directories too, and reading one throws a
        // raw EISDIR further down. Report it clearly instead.
        if (!fs.statSync(filePath).isFile()) {
            console.error(`Error: Not a file: ${filePath}`);
            process.exit(1);
        }

        const isWrite = args.includes("--write") || args.includes("-w");
        const isCheck = args.includes("--check") || args.includes("-c");
        const telemetryEnabled =
            args.includes("--telemetry") ||
            ["1", "true", "yes"].includes(
                (process.env.ABL_FORMATTER_TELEMETRY || "").toLowerCase()
            );
        const verbose = args.includes("--verbose") || args.includes("-v");

        if (telemetryEnabled) {
            CliTelemetry.initialize();
        }

        // Locate the ABL grammar. `resources/` is the canonical location and is
        // already shipped with the extension, so the CLI reads it from there
        // rather than requiring a duplicate ~3MB copy next to the bundle.
        const wasmCandidates = [
            path.join(__dirname, "../../resources/tree-sitter-abl.wasm"),
            path.join(__dirname, "../resources/tree-sitter-abl.wasm"),
            path.join(__dirname, "tree-sitter-abl.wasm"),
            path.join(__dirname, "../tree-sitter-abl.wasm"),
            path.join(__dirname, "../../tree-sitter-abl.wasm"),
        ];
        const wasmPath = wasmCandidates.find((candidate) =>
            fs.existsSync(candidate)
        );
        if (!wasmPath) {
            console.error(
                "Error: tree-sitter-abl.wasm not found. Make sure to run 'npm run build-cli'"
            );
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

        const formatStartTime = Date.now();
        const formattedCode = formatter.formatText(
            originalCode,
            new EOL(fileEol),
            false
        );
        const durationMs = Date.now() - formatStartTime;

        if (telemetryEnabled) {
            const fileExtension = path.extname(filePath).toLowerCase() || "none";
            const enabledFormatters = Object.entries(configManager.getAll())
                .filter(([key, value]) => key.endsWith("Formatting") && value === true)
                .map(([key]) => key.replace(/^AblFormatter\./, ""));

            CliTelemetry.sendEvent(
                "CLI.Format",
                {
                    mode: isWrite ? "write" : isCheck ? "check" : "stdout",
                    verbose: verbose ? "true" : "false",
                    fileExtension,
                },
                {
                    characters: originalCode.length,
                    lines: originalCode.split(/\r?\n/).length,
                    parseErrors: initialParseErrorCount,
                    durationMs,
                }
            );

            // Separate from CLI.Format so a run's performance/error data isn't
            // bloated with a per-formatter property list on every event.
            CliTelemetry.sendEvent(
                "CLI.Settings",
                { enabledFormatters: enabledFormatters.join(",") },
                { enabledFormatterCount: enabledFormatters.length }
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
                await CliTelemetry.dispose();
                process.exit(1);
            } else {
                console.log(`${filePath} is already formatted`);
                await CliTelemetry.dispose();
                process.exit(0);
            }
        } else if (isWrite) {
            fs.writeFileSync(filePath, formattedCode, "utf-8");
            console.log(`Formatted: ${filePath}`);
            await CliTelemetry.dispose();
            process.exit(0);
        } else {
            // Output to stdout
            console.log(formattedCode);
            await CliTelemetry.dispose();
            process.exit(0);
        }
    } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        CliTelemetry.sendEvent("CLI.Error", {
            message: error instanceof Error ? error.message : String(error),
        });
        await CliTelemetry.dispose();
        process.exit(1);
    }
}

function printUsage() {
    console.log(`
abl-format - OpenEdge ABL Code Formatter CLI

USAGE:
  abl-format <file> [OPTIONS]

OPTIONS:
  --write, -w      Write formatted code back to file
  --check, -c      Check if file would be reformatted (exit 1 if yes)
  --config <path>  Path to .ablformatter.json config file
  --telemetry      Enable CLI telemetry if a telemetry key is available
  --verbose, -v    Show verbose output
  --help, -h       Show this help message

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

main().catch(async (error) => {
    console.error("Unexpected error:", error);
    CliTelemetry.sendEvent("CLI.FatalError", {
        message: error instanceof Error ? error.message : String(error),
    });
    await CliTelemetry.dispose();
    process.exit(1);
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
