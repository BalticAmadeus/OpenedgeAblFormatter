import * as fs from "node:fs";
import * as path from "node:path";

// Mock 'vscode' module so we can run this outside the extension host
const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request: string) {
    if (request === "vscode") {
        return {
            Range: class Range { constructor() {} },
            Position: class Position { constructor() {} },
            workspace: { 
                getConfiguration: () => ({ get: () => undefined, update: () => {} }),
                onDidChangeConfiguration: () => ({ dispose: () => {} })
            },
            window: { 
                showErrorMessage: () => {},
                showInformationMessage: () => {}
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

import { setupParserHelper, extensionDevelopmentPath, readFile, format, getSettingsOverride } from "./suitesUtils";
import { FileIdentifier } from "../model/FileIdentifier";
import { SyntaxNodeType } from "../model/SyntaxNodeType";
import { AblParserHelper } from "../parser/AblParserHelper";
import { enableFormatterDecorators } from "../formatterFramework/enableFormatterDecorators";
import type Parser from "web-tree-sitter";
import { IStrategy } from "./strategies/IStrategy";
import { ProcedureStrategy } from "./strategies/ProcedureStrategy";
import { CommentsRemoveStrategy } from "./strategies/CommentsRemoveStrategy";
import { FunctionStrategy } from "./strategies/FunctionStrategy";
import { ClassStrategy } from "./strategies/ClassStrategy";
import { MethodStrategy } from "./strategies/MethodStrategy";

// ----------------------------------------------------
// 1. Core Reduction Strategies Interface and Classes
// ----------------------------------------------------
// Strategies are now imported from the src/utils/strategies directory

// ----------------------------------------------------
// 2. The Delta Debugging (Reduction) Algorithm
// ----------------------------------------------------

const onlyTestFail = true;


let strategies: IStrategy[] = [];
let globalParserHelper: AblParserHelper;

function countActualSymbols(text: string): number {
    let count = 0;
    for (const element of text) {
        const char = element;
        // Exclude spaces, newlines, carriage returns, and tabs
        if (char !== " " && char !== "\n" && char !== "\r" && char !== "\t") {
            count++;
        }
    }
    return count;
}

// Checking if the candidate fails the Symbol test
async function fails(input: string): Promise<boolean> {
    if (!onlyTestFail) {
        // Shrik perfectly to the smallest pieces by always failing
        return true; 
    }

    try {
        // Force the settings override onto every isolated candidate we test
        const settingsOverride = getSettingsOverride(true);
        const testPayload = settingsOverride + input;

        // 1. Run the snippet through the formatter
        const formattedText = format(testPayload, "temp.p", globalParserHelper);
        
        // 2. Count the symbols before and after (make sure we count the testPayload which has the overrides!)
        const beforeCount = countActualSymbols(testPayload);
        const afterCount = countActualSymbols(formattedText);
        
        // 3. If counts don't match, this chunk fails the symbol test!
        return beforeCount !== afterCount;
    } catch (e) {
        // If the formatter throws an exception, assume it's a structural failure that should be investigated
        console.error("Formatter threw an error: ", e);
        return true;
    }
}

async function reduce(input: string): Promise<string[]> {
    if (!(await fails(input))) {
        return [];
    }

    for (const strategy of strategies) {
        if (!strategy.applicable(input)) {
            continue;
        }

        const candidates = strategy.generate(input);
        let anyFailing = false;
        let currentReduced: string[] = [];

        for (const candidate of candidates) {
            if (await fails(candidate)) {
                anyFailing = true;
                // Recursively break down the candidate further
                const reduced = await reduce(candidate);
                currentReduced.push(...reduced);
            }
        }
        
        // If this strategy successfully broke down the problem into smaller failing parts,
        // we return those parts. We don't need to try other strategies on the whole input.
        if (anyFailing) {
            return Array.from(new Set(currentReduced)); // Return unique minimal candidates
        }
    }

    return [input];
}

// ----------------------------------------------------
// 3. Script Execution
// ----------------------------------------------------

export async function runDeltaReduction() {
    const targetFile = "resources\\ade\\adedict\\TRIG\\_trigdlg.p";
    const targetFilePath = path.join(extensionDevelopmentPath, targetFile);
    
    if (!fs.existsSync(targetFilePath)) {
        console.error(`Target file not found: ${targetFilePath}`);
        return;
    }

    const baseName = path.parse(targetFilePath).name;
    const extName = path.parse(targetFilePath).ext || ".p";
    const beforeText = readFile(targetFilePath);

    // Initialize dependencies
    globalParserHelper = await setupParserHelper();
    enableFormatterDecorators();
    
    strategies = [
        new CommentsRemoveStrategy(globalParserHelper),
        new ProcedureStrategy(globalParserHelper),
        new FunctionStrategy(globalParserHelper),
        new ClassStrategy(globalParserHelper),
        new MethodStrategy(globalParserHelper)
    ];

    console.log(`Starting reduction on ${targetFile} (size: ${beforeText.length} chars)...`);
    
    // Execute reduction algorithm
    const minCandidates = await reduce(beforeText);

    if (!minCandidates || minCandidates.length === 0) {
        console.log("No failing condition detected in the original input.");
        return;
    }

    // Setup output directory
    const outputDir = path.join(extensionDevelopmentPath, "resources/failedTestsReducted");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Delta reduction complete! Found ${minCandidates.length} minimal reproducible cases.`);
    
    minCandidates.forEach((candidate, index) => {
        const outPath = path.join(outputDir, `${baseName}_minimized_${index + 1}${extName}`);
        fs.writeFileSync(outPath, candidate, "utf-8");
        console.log(`- Result ${index + 1} saved to ${outPath} (reduced size: ${candidate.length} chars)`);
    });
}

// Execute if run directly via ts-node or node
if (require.main === module) {
    runDeltaReduction().catch(console.error);
}