import * as fs from "node:fs";
import * as path from "node:path";
import Parser from "web-tree-sitter";
import { FileIdentifier } from "../model/FileIdentifier";
import { AblParserHelper } from "../parser/AblParserHelper";
import { enableFormatterDecorators } from "../formatterFramework/enableFormatterDecorators";
import { IStrategy } from "./strategies/IStrategy";
import { ProcedureStrategy } from "./strategies/ProcedureStrategy";
import { CommentsRemoveStrategy } from "./strategies/CommentsRemoveStrategy";
import { ClassStrategy } from "./strategies/ClassStrategy";

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
    targetFile: string = "resources\\ade\\adedict\\TRIG\\_trigdlg.p",
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
    const strategy = extName.toLowerCase() === ".cls"
    ? new ClassStrategy(parserHelper)
    : new ProcedureStrategy(parserHelper);

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
    
    // Collect all generated blocks from all strategies
    const allTrackedBlocks: { start: number, end: number, strategyName: string, snippet?: string, id?: number }[] = [];
    
    let sub: IStrategy | undefined;
    while ((sub = strategy.getNextSubStrategy()) !== undefined) {
        if (sub.applicable(beforeText, initialParseResult)) {
            const blocks = sub.generate(beforeText, initialParseResult);
            const strategyName = sub.name || sub.constructor.name;
            for (const b of blocks) {
                allTrackedBlocks.push({ start: b.start, end: b.end, strategyName });
            }
        }
    }

    // Sort by 'start' index ascending. If starts are identical, sort 'end' descending (outer blocks first)
    allTrackedBlocks.sort((a, b) => {
        if (a.start === b.start) {
            return b.end - a.end;
        }
        return a.start - b.start;
    });

    let blockId = 1;
    for (const b of allTrackedBlocks) {
        b.snippet = beforeText.substring(b.start, b.end);
        b.id = blockId;
        const safeName = b.strategyName.replace(/\./g, '_');
        fs.writeFileSync(path.join(blocksDir, `block_${blockId}_${safeName}${extName}`), b.snippet, "utf-8");
        blockId++;
    }

    console.log(`\nTesting ${allTrackedBlocks.length} blocks for failures...`);
    let skipUntil = -1;
    for (const b of allTrackedBlocks) {
        if (b.start < skipUntil && b.end <= skipUntil) {
            console.log(`Skipping testing Block ${b.id} (contained in passing block).`);
            continue;
        }

        const snippet = b.snippet!;
        const safeName = b.strategyName.replace(/\./g, '_');
        
        const isFailing = await shouldKeepAsFailing(snippet);

        if (isFailing) {
            console.log(`Block ${b.id} (${b.strategyName}) FAILED! Saving to failingBlocks...`);
            fs.writeFileSync(path.join(failingBlocksDir, `failing_block_${b.id}_${safeName}${extName}`), snippet, "utf-8");
        } else {
            console.log(`Block ${b.id} (${b.strategyName}) PASSED. Skipping all its children.`);
            skipUntil = Math.max(skipUntil, b.end);
        }
    }

    // Extract and save untouched code
    const mergedBlocks: { start: number, end: number }[] = [];
    for (const b of allTrackedBlocks) {
        if (mergedBlocks.length === 0) {
            mergedBlocks.push({ start: b.start, end: b.end });
        } else {
            const last = mergedBlocks[mergedBlocks.length - 1];
            if (b.start <= last.end) {
                last.end = Math.max(last.end, b.end);
            } else {
                mergedBlocks.push({ start: b.start, end: b.end });
            }
        }
    }

    let untouchedCode = "";
    let currentIndex = 0;
    for (const mb of mergedBlocks) {
        if (mb.start > currentIndex) {
            const gap = beforeText.substring(currentIndex, mb.start).trim();
            if (gap) {
                untouchedCode += gap + "\n\n/* --- END OF UNTOUCHED BLOCK --- */\n\n";
            }
        }
        currentIndex = Math.max(currentIndex, mb.end);
    }
    if (currentIndex < beforeText.length) {
        const gap = beforeText.substring(currentIndex).trim();
        if (gap) {
            untouchedCode += gap;
        }
    }

    if (untouchedCode.trim()) {
        const untouchedPath = path.join(trackBlocksDir, `untouched_code${extName}`);
        fs.writeFileSync(untouchedPath, untouchedCode, "utf-8");
        console.log(`Untouched code saved to trackBlocks/untouched_code${extName}`);
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