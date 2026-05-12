import * as fs from "node:fs";
import * as path from "node:path";
import Parser from "web-tree-sitter";
import { FileIdentifier } from "../model/FileIdentifier";
import { AblParserHelper } from "../parser/AblParserHelper";
import { enableFormatterDecorators } from "../formatterFramework/enableFormatterDecorators";
import { IStrategy } from "./strategies/IStrategy";
import { CommentsRemoveStrategy } from "./strategies/CommentsRemoveStrategy";
import { ParseResult } from "../model/ParseResult";
import { BaseStrategy } from "./strategies/BaseStrategy";

const extensionDevelopmentPath = path.resolve(__dirname, "../../");

function readFile(fileUri: string): string {
    return fs.readFileSync(fileUri, "utf-8");
}

async function setupParserHelper(): Promise<AblParserHelper> {
    await Parser.init();

    const debugManager: any = {
        handleErrors: () => {},
        handleErrorRanges: () => {},
        parserReady: () => {},
        fileFormattedSuccessfully: () => {},
        isInDebugMode: () => false,
    };

    const parserHelper = new AblParserHelper(
        extensionDevelopmentPath,
        debugManager
    );
    await parserHelper.awaitLanguage();
    return parserHelper;
}

export interface DeltaReductionOptions {
    parserHelper?: AblParserHelper;
    shouldKeepAsFailing?: (snippet: string) => Promise<boolean> | boolean;
    trackBlocksRootDir?: string;
}

export interface DeltaReductionResult {
    targetFilePath: string;
    trackBlocksDir: string;
    totalBlocks: number;
    failingBlocks: number;
}

export async function runDeltaReduction(
    targetFile: string = "src\\utils\\strategies\\strategyTester.p",
    options: DeltaReductionOptions = {}
): Promise<DeltaReductionResult | undefined> {
    const targetFilePath = path.isAbsolute(targetFile)
        ? targetFile
        : path.join(extensionDevelopmentPath, targetFile);
    
    if (!fs.existsSync(targetFilePath)) {
        console.error(`Target file not found: ${targetFilePath}`);
        return undefined;
    }

    const parsedPath = path.parse(targetFilePath);
    const extName = parsedPath.ext || ".p";
    const baseName = parsedPath.name;
    let beforeText = readFile(targetFilePath);

    // Initialize dependencies
    const parserHelper = options.parserHelper ?? (await setupParserHelper());
    enableFormatterDecorators();
    const shouldKeepAsFailing = options.shouldKeepAsFailing ?? (async () => true);
    
    // Fully Strip comments
    const commentsStrategy = new CommentsRemoveStrategy(parserHelper);
    const parseForComments = parserHelper.parse(new FileIdentifier("temp.p", 1), beforeText);
    if (commentsStrategy.applicable(beforeText, parseForComments)) {
        const commentBlocks = commentsStrategy.generate(beforeText, parseForComments);
        // Sort descending so splicing from the back doesn't affect earlier offsets
        const sortedBlocks = [...commentBlocks].sort((a,b) => b.start - a.start);
        for (const b of sortedBlocks) {
            beforeText = beforeText.substring(0, b.start) + beforeText.substring(b.end);
        }
    }
    const strategy = new BaseStrategy(parserHelper);

    console.log(`Starting reduction on ${targetFile} (size: ${beforeText.length} chars)...`);
    
    // Setup track blocks output directory
    const trackBlocksRootDir = options.trackBlocksRootDir ?? path.join(extensionDevelopmentPath, "resources/failedTestsReducted/trackBlocks");
    const trackBlocksDir = path.join(trackBlocksRootDir, baseName);
    const blocksDir = path.join(trackBlocksDir, "blocks");
    const failingBlocksDir = path.join(trackBlocksDir, "failingBlocks");

    if (!fs.existsSync(trackBlocksDir)) {
        fs.mkdirSync(trackBlocksDir, { recursive: true });
    }
    if (!fs.existsSync(blocksDir)) {
        fs.mkdirSync(blocksDir, { recursive: true });
    }
    if (!fs.existsSync(failingBlocksDir)) {
        fs.mkdirSync(failingBlocksDir, { recursive: true });
    }

    const initialParseResult = parserHelper.parse(new FileIdentifier("temp.p", 1), beforeText);
    
    // Collect all generated blocks from strategies using recursive getNextStrategy
    const allTrackedBlocks: { start: number, end: number, strategyName: string, snippet: string, id?: number }[] = [];

    async function explore(
        text: string,
        parseResult: ParseResult | undefined,
        baseOffset: number,
        parentSpan: number
    ): Promise<void> {
        if (!parseResult) parseResult = parserHelper.parse(new FileIdentifier("temp.p", 1), text);

        const next = (strategy as any).getNextStrategy(text, parseResult) as IStrategy | undefined;
        if (!next) return;

        const blocks = next.generate(text, parseResult);

        for (const b of blocks) {
            const blockText = b.text ?? beforeText.substring(baseOffset + b.start, baseOffset + b.end);
            const hasText = b.text !== undefined;
            const globalStart = hasText ? baseOffset : baseOffset + b.start;
            const globalEnd = hasText ? baseOffset + blockText.length : baseOffset + b.end;
            const strategyName = next.name || next.constructor.name;
            allTrackedBlocks.push({ start: globalStart, end: globalEnd, strategyName, snippet: blockText });

            const span = blockText.length;
            // Guard: only recurse into strictly smaller spans to avoid infinite loops
            if (span <= 0 || span >= parentSpan) continue;

            if (b.text !== undefined) {
                continue;
            }

            const childBaseOffset = b.text !== undefined ? baseOffset : baseOffset + b.start;
            const childParseResult = parserHelper.parse(new FileIdentifier("temp.p", 1), blockText);
            await explore(blockText, childParseResult, childBaseOffset, span);
        }
    }
    
    // Calls the "explore" function that recursively dives into the strategy-generated blocks
    await explore(beforeText, initialParseResult, 0, beforeText.length);


    let blockId = 1;
    for (const b of allTrackedBlocks) {
        b.id = blockId;
        const safeName = b.strategyName.replace(/\./g, '_');
        fs.writeFileSync(path.join(blocksDir, `block_${blockId}_${safeName}${extName}`), b.snippet, "utf-8");
        blockId++;
    }

    for (const b of allTrackedBlocks) {
        const isFailing = await shouldKeepAsFailing(b.snippet);
        if (!isFailing) {
            continue;
        }
        const blockIdLabel = b.id ?? 0;
        const safeName = b.strategyName.replace(/\./g, '_');
        fs.writeFileSync(path.join(failingBlocksDir, `failing_block_${blockIdLabel}_${safeName}${extName}`), b.snippet, "utf-8");
    }

    const failingBlocksCount = fs.existsSync(failingBlocksDir)
        ? fs.readdirSync(failingBlocksDir).length
        : 0;

    return {
        targetFilePath,
        trackBlocksDir,
        totalBlocks: allTrackedBlocks.length,
        failingBlocks: failingBlocksCount,
    };
}

if (require.main === module) {
    runDeltaReduction().catch(console.error);
}