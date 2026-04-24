import * as fs from "fs";
import * as path from "path";
import Parser from "web-tree-sitter";
import {
    allDocumentedFeatures,
    DocumentedFeature,
    ParserSupport,
} from "./ParserCoverageData";

const FUNCTIONAL_TESTS_RELATIVE_DIR = path.join("resources", "functionalTests");
const TEST_FILE_EXTENSIONS = new Set([".p", ".i", ".cls", ".w"]);
const CONTEXTUAL_SHARED_RULES = new Set(["primitive_type", "assignment_operator"]);
const COMMON_NOISE_TOKENS = new Set([
    "STATEMENT",
    "STATEMENTS",
    "ALL",
    "RECORD",
    "OBJECT",
    "WIDGET",
    "LEVEL",
    "PHRASE",
    "PARSE",
    "GENERIC",
]);

export interface FeatureTestCoverage {
    feature: DocumentedFeature;
    tested: boolean;
    matchedKeywords: string[];
    testFileCount: number;
}

export interface ParserTestCoverageSummary {
    totalFunctionalTestInputs: number;
    testsRootPath: string;
    testedGrammarFeatures: number;
    totalGrammarFeatures: number;
    percentage: number;
    testedDedicatedRules: number;
    totalDedicatedRules: number;
    dedicatedRulePercentage: number;
}

export interface ParserTestCoverageReport {
    summary: ParserTestCoverageSummary;
    byFeature: FeatureTestCoverage[];
}

let languageLoadPromise: Promise<Parser.Language> | undefined;

function getLanguage(extensionPath: string): Promise<Parser.Language> {
    if (!languageLoadPromise) {
        const wasmPath = path.join(extensionPath, "resources", "tree-sitter-abl.wasm");
        languageLoadPromise = Parser.init().then(() =>
            Parser.Language.load(wasmPath)
        );
    }
    return languageLoadPromise;
}

export async function calculateParserTestCoverage(
    extensionPath: string,
    workspaceRoots: string[] = []
): Promise<ParserTestCoverageReport> {
    const testsRootPath = findBestFunctionalTestsRoot(extensionPath, workspaceRoots);
    const testInputs = readFunctionalTestInputFiles(testsRootPath);
    const { tokenToFiles, ruleToFiles } = await buildAstMaps(testInputs, extensionPath);

    const grammarFeatures = allDocumentedFeatures.filter(
        (feature) =>
            feature.support !== ParserSupport.None &&
            feature.support !== ParserSupport.NotApplicable
    );
    const sharedGrammarRules = getSharedGrammarRules(grammarFeatures);

    const byFeature: FeatureTestCoverage[] = grammarFeatures.map((feature) => {
        const featureKeywordGroups = getFeatureKeywordGroups(feature);
        const matchedKeywords: string[] = [];
        const matchedFilePaths = new Set<string>();

        // Dedicated grammar rules are matched via AST node types.
        // Generic catch-all abl_statement must be validated via statement keywords,
        // otherwise every generic feature would look tested in the same files.
        if (feature.grammarRule && feature.grammarRule !== "abl_statement" && !feature.grammarRule.startsWith("_")) {
            const ruleMatches = ruleToFiles.get(feature.grammarRule);
            if (ruleMatches && ruleMatches.size > 0) {
                const requiresKeywordDisambiguation =
                    featureKeywordGroups.length > 0 &&
                    (sharedGrammarRules.has(feature.grammarRule) ||
                        CONTEXTUAL_SHARED_RULES.has(feature.grammarRule));

                if (!requiresKeywordDisambiguation) {
                    for (const filePath of ruleMatches) {
                        matchedFilePaths.add(filePath);
                    }
                } else {
                    for (const keywordGroup of featureKeywordGroups) {
                        const groupFilePaths = getFilePathsForKeywordGroup(
                            keywordGroup,
                            tokenToFiles
                        );
                        if (groupFilePaths.size === 0) {
                            continue;
                        }
                        const intersection = intersectFileSets(ruleMatches, groupFilePaths);
                        if (intersection.size === 0) {
                            continue;
                        }
                        matchedKeywords.push(keywordGroup.join(" "));
                        for (const filePath of intersection) {
                            matchedFilePaths.add(filePath);
                        }
                    }
                }
            }
        }

        // For features without explicit rules and generic abl_statement features,
        // require textual keyword evidence in functional tests.
        if (!feature.grammarRule || feature.grammarRule === "abl_statement" || feature.grammarRule.startsWith("_")) {
            for (const keywordGroup of featureKeywordGroups) {
                const groupFilePaths = getFilePathsForKeywordGroup(
                    keywordGroup,
                    tokenToFiles
                );
                if (groupFilePaths.size === 0) {
                    continue;
                }
                matchedKeywords.push(keywordGroup.join(" "));
                for (const filePath of groupFilePaths) {
                    matchedFilePaths.add(filePath);
                }
            }
        }

        return {
            feature,
            tested: matchedFilePaths.size > 0,
            matchedKeywords: matchedKeywords.sort(),
            testFileCount: matchedFilePaths.size,
        };
    });

    const testedGrammarFeatures = byFeature.filter((item) => item.tested).length;
    const totalGrammarFeatures = byFeature.length;

    const dedicatedRules = new Set(
        grammarFeatures
            .map((feature) => feature.grammarRule)
            .filter(
                (rule): rule is string =>
                    typeof rule === "string" && rule !== "abl_statement" && !rule.startsWith("_")
            )
    );

    const testedDedicatedRules = new Set(
        byFeature
            .filter(
                (item) =>
                    item.tested &&
                    Boolean(item.feature.grammarRule) &&
                    item.feature.grammarRule !== "abl_statement" &&
                    !(item.feature.grammarRule as string).startsWith("_")
            )
            .map((item) => item.feature.grammarRule as string)
    );

    const summary: ParserTestCoverageSummary = {
        totalFunctionalTestInputs: testInputs.length,
        testsRootPath,
        testedGrammarFeatures,
        totalGrammarFeatures,
        percentage:
            totalGrammarFeatures === 0
                ? 0
                : Math.round((testedGrammarFeatures / totalGrammarFeatures) * 100),
        testedDedicatedRules: testedDedicatedRules.size,
        totalDedicatedRules: dedicatedRules.size,
        dedicatedRulePercentage:
            dedicatedRules.size === 0
                ? 0
                : Math.round((testedDedicatedRules.size / dedicatedRules.size) * 100),
    };

    byFeature.sort((a, b) => {
        if (a.tested !== b.tested) {
            return a.tested ? -1 : 1;
        }
        return a.feature.name.localeCompare(b.feature.name);
    });

    return { summary, byFeature };
}

export async function generateParserTestHtmlReport(
    extensionPath: string,
    workspaceRoots: string[] = []
): Promise<string> {
    const report = await calculateParserTestCoverage(extensionPath, workspaceRoots);
    const tested = report.byFeature.filter((item) => item.tested);
    const untested = report.byFeature.filter((item) => !item.tested);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parser vs Functional Tests Coverage</title>
    <style>
        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
            background: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #d4d4d4);
            margin: 0;
            padding: 20px;
        }
        .header {
            border-bottom: 1px solid var(--vscode-panel-border, #454545);
            margin-bottom: 18px;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0 0 6px 0;
            color: var(--vscode-textLink-foreground, #3794ff);
        }
        .muted {
            color: var(--vscode-descriptionForeground, #9d9d9d);
            font-size: 0.9em;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 10px;
            margin-bottom: 14px;
        }
        .card {
            background: var(--vscode-input-background, #2f2f2f);
            border-radius: 8px;
            padding: 10px;
        }
        .big {
            font-size: 1.6em;
            font-weight: 700;
        }
        .bar {
            height: 14px;
            border-radius: 7px;
            overflow: hidden;
            background: #333;
            margin: 8px 0 14px 0;
        }
        .bar-fill {
            height: 100%;
            background: #4caf50;
        }
        .section-title {
            margin: 16px 0 8px 0;
            color: var(--vscode-textLink-foreground, #3794ff);
        }
        details.section {
            margin: 12px 0;
            border: 1px solid var(--vscode-panel-border, #3c3c3c);
            border-radius: 8px;
            background: var(--vscode-editor-background, #1e1e1e);
            overflow: hidden;
        }
        details.section > summary {
            list-style: none;
            cursor: pointer;
            padding: 10px 12px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground, #3794ff);
            background: var(--vscode-input-background, #2f2f2f);
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
        }
        details.section > summary::-webkit-details-marker {
            display: none;
        }
        .summary-label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .chevron {
            transition: transform 0.15s ease-in-out;
            color: var(--vscode-descriptionForeground, #9d9d9d);
        }
        details.section[open] .chevron {
            transform: rotate(90deg);
        }
        .section-content {
            padding: 10px;
            max-height: 55vh;
            overflow: auto;
        }
        .feature-item {
            background: var(--vscode-input-background, #2f2f2f);
            border-radius: 7px;
            padding: 10px;
            margin-bottom: 8px;
        }
        .row {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        .status-tested { color: #4caf50; }
        .status-untested { color: #f44336; }
        .rule {
            font-family: Consolas, 'Courier New', monospace;
            color: var(--vscode-descriptionForeground, #9d9d9d);
            font-size: 0.85em;
        }
        .tag {
            display: inline-block;
            font-family: Consolas, 'Courier New', monospace;
            font-size: 0.8em;
            border-radius: 4px;
            background: rgba(56, 139, 253, 0.2);
            color: #58a6ff;
            padding: 2px 6px;
            margin: 2px 4px 0 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Parser vs Functional Tests Coverage</h1>
        <div class="muted">Compares parser-supported ABL features with what appears in resources/functionalTests input files.</div>
        <div class="muted" style="margin-top:4px;">Using tests from: ${escapeHtml(report.summary.testsRootPath)}</div>
    </div>

    <div class="stats">
        <div class="card"><div class="big">${report.summary.percentage}%</div><div>Parser Features Covered by Tests</div></div>
        <div class="card"><div class="big">${report.summary.testedGrammarFeatures}/${report.summary.totalGrammarFeatures}</div><div>Grammar Features Tested</div></div>
        <div class="card"><div class="big">${report.summary.dedicatedRulePercentage}%</div><div>Dedicated Rules Touched by Tests</div></div>
        <div class="card"><div class="big">${report.summary.totalFunctionalTestInputs}</div><div>Functional Test Input Files</div></div>
    </div>

    <div class="bar">
        <div class="bar-fill" style="width:${report.summary.percentage}%"></div>
    </div>

    <details class="section" open>
        <summary>
            <span class="summary-label">Tested Features (${tested.length})</span>
            <span class="chevron">▶</span>
        </summary>
        <div class="section-content">
            ${tested
                .slice(0, 120)
                .map(
                    (item) => `
                <div class="feature-item">
                    <div class="row"><strong class="status-tested">✓ ${escapeHtml(item.feature.name)}</strong><span class="rule">${escapeHtml(item.feature.grammarRule ?? "(no grammar rule)")}</span><span class="muted">${item.testFileCount} test file(s)</span></div>
                </div>
            `
                )
                .join("")}
        </div>
    </details>

    <details class="section">
        <summary>
            <span class="summary-label">Untested Features (${untested.length})</span>
            <span class="chevron">▶</span>
        </summary>
        <div class="section-content">
            ${untested
                .map(
                    (item) => `
                <div class="feature-item">
                    <div class="row"><strong class="status-untested">○ ${escapeHtml(item.feature.name)}</strong><span class="rule">${escapeHtml(item.feature.grammarRule ?? "(no grammar rule)")}</span></div>
                </div>
            `
                )
                .join("")}
        </div>
    </details>
</body>
</html>`;
}

function readFunctionalTestInputFiles(rootPath: string): Array<{ path: string; content: string }> {
    if (!fs.existsSync(rootPath)) {
        return [];
    }

    const files: Array<{ path: string; content: string }> = [];
    const stack: string[] = [rootPath];

    while (stack.length > 0) {
        const currentPath = stack.pop() as string;
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const extension = path.extname(entry.name).toLowerCase();
            if (!TEST_FILE_EXTENSIONS.has(extension)) {
                continue;
            }
            if (!entry.name.toLowerCase().startsWith("input")) {
                continue;
            }

            files.push({
                path: fullPath,
                content: fs.readFileSync(fullPath, "utf8"),
            });
        }
    }

    return files;
}

function findBestFunctionalTestsRoot(
    extensionPath: string,
    workspaceRoots: string[]
): string {
    const candidates = [
        path.join(extensionPath, FUNCTIONAL_TESTS_RELATIVE_DIR),
        ...workspaceRoots.map((root) =>
            path.join(root, FUNCTIONAL_TESTS_RELATIVE_DIR)
        ),
    ];

    let bestPath = candidates[0];
    let bestCount = -1;

    for (const candidate of candidates) {
        const count = countFunctionalInputs(candidate);
        if (count > bestCount) {
            bestCount = count;
            bestPath = candidate;
        }
    }

    return bestPath;
}

function countFunctionalInputs(rootPath: string): number {
    if (!fs.existsSync(rootPath)) {
        return 0;
    }

    let count = 0;
    const stack: string[] = [rootPath];
    while (stack.length > 0) {
        const currentPath = stack.pop() as string;
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }
            const extension = path.extname(entry.name).toLowerCase();
            if (
                TEST_FILE_EXTENSIONS.has(extension) &&
                entry.name.toLowerCase().startsWith("input")
            ) {
                count++;
            }
        }
    }

    return count;
}

async function buildAstMaps(
    testInputs: Array<{ path: string; content: string }>,
    extensionPath: string
): Promise<{
    tokenToFiles: Map<string, Set<string>>;
    ruleToFiles: Map<string, Set<string>>;
}> {
    const language = await getLanguage(extensionPath);
    const parser = new Parser();
    parser.setLanguage(language);

    const tokenToFiles = new Map<string, Set<string>>();
    const ruleToFiles = new Map<string, Set<string>>();

    for (const testInput of testInputs) {
        const tree = parser.parse(testInput.content);
        const { rulesInFile, tokensInFile } = collectNodeTypesAndTokens(tree.rootNode);

        for (const token of tokensInFile) {
            if (!tokenToFiles.has(token)) {
                tokenToFiles.set(token, new Set<string>());
            }
            (tokenToFiles.get(token) as Set<string>).add(testInput.path);
        }

        for (const rule of rulesInFile) {
            if (!ruleToFiles.has(rule)) {
                ruleToFiles.set(rule, new Set<string>());
            }
            (ruleToFiles.get(rule) as Set<string>).add(testInput.path);
        }
    }

    return { tokenToFiles, ruleToFiles };
}

function collectNodeTypesAndTokens(rootNode: Parser.SyntaxNode): {
    rulesInFile: Set<string>;
    tokensInFile: Set<string>;
} {
    const nodeTypes = new Set<string>();
    const tokensInFile = new Set<string>();
    const stack: Parser.SyntaxNode[] = [rootNode];

    while (stack.length > 0) {
        const node = stack.pop() as Parser.SyntaxNode;
        nodeTypes.add(node.type);

        if (node.childCount === 0 && shouldUseLeafForKeywordMatching(node)) {
            for (const token of extractTokens(node.text)) {
                tokensInFile.add(token);
            }
        }

        // Preprocessor directive text is stored in the top-level node, not
        // in leaf children. Extract keyword tokens from the node text directly
        // so disambiguation like GLOBAL-DEFINE vs SCOPED-DEFINE works.
        if (node.type === "preprocessor_directive") {
            for (const token of extractTokens(node.text)) {
                tokensInFile.add(token);
            }
        }

        for (const child of node.children) {
            stack.push(child);
        }
    }

    return { rulesInFile: nodeTypes, tokensInFile };
}

function shouldUseLeafForKeywordMatching(node: Parser.SyntaxNode): boolean {
    const lowerType = node.type.toLowerCase();
    if (lowerType.includes("identifier")) {
        return false;
    }
    if (lowerType.includes("comment")) {
        return false;
    }
    if (lowerType.includes("string")) {
        return false;
    }
    return true;
}

function getSharedGrammarRules(features: DocumentedFeature[]): Set<string> {
    const counts = new Map<string, number>();
    for (const feature of features) {
        const rule = feature.grammarRule;
        if (!rule || rule === "abl_statement" || rule.startsWith("_")) {
            continue;
        }
        counts.set(rule, (counts.get(rule) ?? 0) + 1);
    }

    return new Set(
        Array.from(counts.entries())
            .filter(([, count]) => count > 1)
            .map(([rule]) => rule)
    );
}

function intersectFileSets(a: Set<string>, b: Set<string>): Set<string> {
    const small = a.size <= b.size ? a : b;
    const large = a.size <= b.size ? b : a;
    return new Set(Array.from(small).filter((value) => large.has(value)));
}

function getFeatureKeywordGroups(feature: DocumentedFeature): string[][] {
    const groups: string[][] = [];
    const seen = new Set<string>();

    const addGroupTokens = (tokens: string[]): void => {
        const filteredTokens = tokens.filter(
            (token) => token.length >= 2 && !COMMON_NOISE_TOKENS.has(token)
        );
        if (filteredTokens.length === 0) {
            return;
        }
        const key = filteredTokens.join("|");
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        groups.push(filteredTokens);
    };

    const addPhraseGroup = (phrase: string): void => {
        const tokens = extractTokens(phrase);
        if (tokens.length === 0) {
            return;
        }

        // Slash-delimited docs (for example CHARACTER/CHAR) represent alternatives,
        // so we track each token independently rather than requiring all of them.
        if (phrase.includes("/") && tokens.length > 1) {
            for (const token of tokens) {
                addGroupTokens([token]);
            }
            return;
        }

        addGroupTokens(tokens);
    };

    // Skip name-derived keyword groups when the feature name starts with a
    // non-alphabetic character (e.g. {&name}, &DEFINE, = (assignment), ...).
    // In those cases, any alphabetic tokens extracted from the name are
    // English descriptions, not ABL keywords, so they would give false negatives.
    if (/^[A-Za-z]/.test(feature.name)) {
        addPhraseGroup(feature.name);
    }
    if (feature.supportedKeywords) {
        for (const keywordMeta of feature.supportedKeywords) {
            addPhraseGroup(keywordMeta.keyword);
        }
    }

    return groups;
}

function getFilePathsForKeywordGroup(
    keywordGroup: string[],
    tokenToFiles: Map<string, Set<string>>
): Set<string> {
    let result: Set<string> | undefined;
    for (const token of keywordGroup) {
        const tokenFiles = tokenToFiles.get(token);
        if (!tokenFiles || tokenFiles.size === 0) {
            return new Set<string>();
        }

        if (!result) {
            result = new Set<string>(tokenFiles);
            continue;
        }

        result = new Set<string>(
            Array.from(result).filter((filePath) => tokenFiles.has(filePath))
        );

        if (result.size === 0) {
            return result;
        }
    }

    return result || new Set<string>();
}

function extractTokens(text: string): string[] {
    const matches = text.toUpperCase().match(/[A-Z][A-Z0-9-]*/g);
    if (!matches) {
        return [];
    }
    return matches;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
