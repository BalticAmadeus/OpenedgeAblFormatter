/**
 * ABL Parser Coverage Calculator
 * 
 * Calculates how much of the official Progress OpenEdge ABL documentation
 * is supported by the tree-sitter-abl grammar.
 * 
 * This measures parser completeness: "What ABL features from official docs 
 * does tree-sitter-abl actually support?"
 * 
 * Support levels:
 * - Full: Has dedicated grammar rule with comprehensive keyword support
 * - Partial: Has dedicated grammar rule but missing some keywords/options
 * - Generic: Parses via abl_statement catch-all (no structural understanding)
 * - None: Cannot be parsed at all
 */

import {
    allDocumentedFeatures,
    DocumentedFeature,
    DocCategory,
    ParserSupport,
    KeywordSupport,
    statementsWithDedicatedRules,
    definitionsWithDedicatedRules,
    ooWithDedicatedRules,
    errorHandlingWithRules,
    statementsWithGenericParsing,
    dataTypes,
    operators,
    preprocessor,
    expressions,
    definitionsNotSupported,
    countKeywordSupport,
} from "./ParserCoverageData";
import {
    formatterEntries,
    FormatterCoverage,
    calculateFormatterStats,
    getOverallFormatterCoverage,
} from "./FormatterCoverageData";

export interface ParserCoverageStats {
    /** Total number of applicable documented features */
    total: number;
    /** Number of features with dedicated grammar rules (full support) */
    full: number;
    /** Number of features with partial dedicated support */
    partial: number;
    /** Number of features that parse via abl_statement generic fallback */
    generic: number;
    /** Number of features that cannot be parsed */
    none: number;
    /** Number of not applicable features (excluded) */
    notApplicable: number;
    /** Overall parser coverage percentage with weights:
     * Full=1.0, Partial=0.75, Generic=0.25, None=0 */
    percentage: number;
    /** Strict coverage percentage (only full + partial with dedicated rules) */
    dedicatedRulePercentage: number;
    /** Total keyword support counts */
    keywordStats: {
        supported: number;
        unsupported: number;
        total: number;
    };
}

export interface DocCategoryCoverage {
    category: DocCategory;
    categoryName: string;
    stats: ParserCoverageStats;
    features: DocumentedFeature[];
}

const categoryNames: Record<DocCategory, string> = {
    [DocCategory.Statement]: "Statements",
    [DocCategory.Definition]: "Definitions",
    [DocCategory.Block]: "Block Constructs",
    [DocCategory.DataType]: "Data Types",
    [DocCategory.Operator]: "Operators",
    [DocCategory.Preprocessor]: "Preprocessor",
    [DocCategory.ObjectOriented]: "Object-Oriented",
    [DocCategory.ErrorHandling]: "Error Handling",
    [DocCategory.Expression]: "Expressions",
    [DocCategory.Other]: "Other",
};

/**
 * Calculate stats for a list of features
 */
function calculateStats(features: DocumentedFeature[]): ParserCoverageStats {
    const applicable = features.filter(f => f.support !== ParserSupport.NotApplicable);
    
    const full = applicable.filter(f => f.support === ParserSupport.Full).length;
    const partial = applicable.filter(f => f.support === ParserSupport.Partial).length;
    const generic = applicable.filter(f => f.support === ParserSupport.Generic).length;
    const none = applicable.filter(f => f.support === ParserSupport.None).length;
    const notApplicable = features.filter(f => f.support === ParserSupport.NotApplicable).length;
    
    const total = applicable.length;
    
    // Weighted coverage: Full=1.0, Partial=0.75, Generic=0.25, None=0
    const effectiveCoverage = full * 1.0 + partial * 0.75 + generic * 0.25;
    
    // Dedicated rule coverage (actual structural understanding)
    const dedicatedRuleCoverage = full + partial;

    // Calculate keyword support
    let keywordsSupported = 0;
    let keywordsUnsupported = 0;
    for (const feature of applicable) {
        const kw = countKeywordSupport(feature);
        keywordsSupported += kw.supported;
        keywordsUnsupported += kw.total - kw.supported;
    }

    return {
        total,
        full,
        partial,
        generic,
        none,
        notApplicable,
        percentage: total > 0 ? Math.round((effectiveCoverage / total) * 100) : 0,
        dedicatedRulePercentage: total > 0 ? Math.round((dedicatedRuleCoverage / total) * 100) : 0,
        keywordStats: {
            supported: keywordsSupported,
            unsupported: keywordsUnsupported,
            total: keywordsSupported + keywordsUnsupported,
        },
    };
}

/**
 * Calculate overall parser coverage
 * How much of Progress OpenEdge ABL does tree-sitter-abl support?
 */
export function calculateParserCoverage(): ParserCoverageStats {
    return calculateStats(allDocumentedFeatures);
}

/**
 * Calculate parser coverage by documentation category
 */
export function calculateParserCoverageByCategory(): DocCategoryCoverage[] {
    const featureGroups: { category: DocCategory; features: DocumentedFeature[] }[] = [
        { 
            category: DocCategory.Statement, 
            features: [...statementsWithDedicatedRules, ...statementsWithGenericParsing]
        },
        { 
            category: DocCategory.Definition, 
            features: [...definitionsWithDedicatedRules, ...definitionsNotSupported]
        },
        { 
            category: DocCategory.ObjectOriented, 
            features: ooWithDedicatedRules
        },
        { 
            category: DocCategory.ErrorHandling, 
            features: errorHandlingWithRules
        },
        { category: DocCategory.DataType, features: dataTypes },
        { category: DocCategory.Operator, features: operators },
        { category: DocCategory.Preprocessor, features: preprocessor },
        { category: DocCategory.Expression, features: expressions },
    ];

    const results: DocCategoryCoverage[] = [];

    for (const { category, features } of featureGroups) {
        if (features.length === 0) continue;
        
        results.push({
            category,
            categoryName: categoryNames[category],
            stats: calculateStats(features),
            features,
        });
    }

    // Sort by dedicated rule percentage descending
    results.sort((a, b) => b.stats.dedicatedRulePercentage - a.stats.dedicatedRulePercentage);
    return results;
}

/**
 * Get features with dedicated grammar rules
 */
export function getFeaturesWithDedicatedRules(): DocumentedFeature[] {
    return allDocumentedFeatures.filter(
        f => f.support === ParserSupport.Full || f.support === ParserSupport.Partial
    );
}

/**
 * Get features parsed via generic abl_statement
 */
export function getGenericFeatures(): DocumentedFeature[] {
    return allDocumentedFeatures.filter(f => f.support === ParserSupport.Generic);
}

/**
 * Get features not supported by the grammar
 */
export function getUnsupportedFeatures(): DocumentedFeature[] {
    return allDocumentedFeatures.filter(f => f.support === ParserSupport.None);
}

/**
 * Get all unsupported keywords across features
 */
export function getUnsupportedKeywords(): { feature: string; keywords: KeywordSupport[] }[] {
    const result: { feature: string; keywords: KeywordSupport[] }[] = [];
    
    for (const feature of allDocumentedFeatures) {
        if (!feature.supportedKeywords) continue;
        const unsupported = feature.supportedKeywords.filter(k => !k.supported);
        if (unsupported.length > 0) {
            result.push({ feature: feature.name, keywords: unsupported });
        }
    }
    
    return result;
}

/**
 * Generate a text-based parser coverage report
 */
export function generateTextReport(): string {
    const overall = calculateParserCoverage();
    const byCategory = calculateParserCoverageByCategory();

    let report = "";
    report += "═══════════════════════════════════════════════════════════════════════════\n";
    report += "            TREE-SITTER-ABL PARSER COVERAGE REPORT\n";
    report += "   Comparing tree-sitter-abl grammar against Progress OpenEdge ABL docs\n";
    report += "═══════════════════════════════════════════════════════════════════════════\n\n";

    // Overall stats
    report += "📊 OVERALL PARSER COVERAGE\n";
    report += "───────────────────────────────────────────────────────────────────────────\n";
    report += `   Weighted Coverage:     ${overall.percentage}%\n`;
    report += `   Dedicated Rule Coverage: ${overall.dedicatedRulePercentage}% (actual structural understanding)\n\n`;
    report += `   Support Breakdown:\n`;
    report += `      ✓ Full Support (dedicated rule):      ${overall.full.toString().padStart(3)} features\n`;
    report += `      ◐ Partial Support (some keywords):    ${overall.partial.toString().padStart(3)} features\n`;
    report += `      ⚬ Generic Parse (abl_statement):      ${overall.generic.toString().padStart(3)} features\n`;
    report += `      ○ Not Supported:                      ${overall.none.toString().padStart(3)} features\n`;
    report += `      ─ Total Documented:                   ${overall.total.toString().padStart(3)} features\n\n`;

    // Keyword stats
    if (overall.keywordStats.total > 0) {
        const kwPercentage = Math.round((overall.keywordStats.supported / overall.keywordStats.total) * 100);
        report += `   Keyword Coverage: ${kwPercentage}% (${overall.keywordStats.supported}/${overall.keywordStats.total} keywords)\n\n`;
    }

    // Progress bar
    const barLength = 50;
    const fullLen = Math.round((overall.full / overall.total) * barLength);
    const partialLen = Math.round((overall.partial / overall.total) * barLength);
    const genericLen = Math.round((overall.generic / overall.total) * barLength);
    const noneLen = barLength - fullLen - partialLen - genericLen;
    const bar = "█".repeat(fullLen) + "▓".repeat(partialLen) + "░".repeat(genericLen) + "·".repeat(noneLen);
    report += `   [${bar}]\n`;
    report += `    █ Full  ▓ Partial  ░ Generic  · None\n\n`;

    // Category breakdown
    report += "📁 COVERAGE BY CATEGORY\n";
    report += "───────────────────────────────────────────────────────────────────────────\n\n";

    for (const cat of byCategory) {
        report += `   ${cat.categoryName}\n`;
        const catBar = "█".repeat(Math.round((cat.stats.dedicatedRulePercentage / 100) * 20));
        const catEmpty = "░".repeat(20 - catBar.length);
        report += `   [${catBar}${catEmpty}] ${cat.stats.dedicatedRulePercentage}% dedicated rules\n`;
        report += `      ✓ ${cat.stats.full} full | ◐ ${cat.stats.partial} partial | ⚬ ${cat.stats.generic} generic | ○ ${cat.stats.none} none\n\n`;
    }

    // Generic parsing (abl_statement fallback)
    const genericFeatures = getGenericFeatures();
    if (genericFeatures.length > 0) {
        report += "⚬ GENERIC PARSING (via abl_statement catch-all)\n";
        report += "───────────────────────────────────────────────────────────────────────────\n";
        report += "   These parse successfully but with no structural understanding:\n\n";
        
        for (const feature of genericFeatures) {
            const notes = feature.notes ? ` - ${feature.notes}` : "";
            report += `   ⚬ ${feature.name}${notes}\n`;
        }
        report += "\n";
    }

    // Not supported features
    const unsupported = getUnsupportedFeatures();
    if (unsupported.length > 0) {
        report += "○ NOT SUPPORTED (cannot be parsed)\n";
        report += "───────────────────────────────────────────────────────────────────────────\n";
        
        for (const feature of unsupported) {
            const notes = feature.notes ? ` - ${feature.notes}` : "";
            report += `   ○ ${feature.name}${notes}\n`;
        }
        report += "\n";
    }

    // Unsupported keywords
    const unsupportedKeywords = getUnsupportedKeywords();
    if (unsupportedKeywords.length > 0) {
        report += "⚠ MISSING KEYWORDS (in partially supported features)\n";
        report += "───────────────────────────────────────────────────────────────────────────\n";
        
        for (const { feature, keywords } of unsupportedKeywords.slice(0, 10)) {
            report += `\n   ${feature}:\n`;
            for (const kw of keywords) {
                const notes = kw.notes ? ` (${kw.notes})` : "";
                report += `      - ${kw.keyword}${notes}\n`;
            }
        }
        if (unsupportedKeywords.length > 10) {
            report += `\n   ... and ${unsupportedKeywords.length - 10} more features with missing keywords\n`;
        }
        report += "\n";
    }

    report += "═══════════════════════════════════════════════════════════════════════════\n";
    report += "   Source: Progress OpenEdge ABL Reference\n";
    report += "   https://docs.progress.com/bundle/abl-reference/\n";
    report += `   Report generated: ${new Date().toISOString()}\n`;
    report += "═══════════════════════════════════════════════════════════════════════════\n";

    return report;
}

function sharedStyles(): string {
    return `
        :root {
            --vscode-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        body {
            font-family: var(--vscode-foreground, var(--vscode-font-family));
            background-color: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #d4d4d4);
            padding: 20px;
            margin: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border, #454545);
        }
        .header h1 { color: var(--vscode-textLink-foreground, #3794ff); margin-bottom: 5px; }
        .header p { color: var(--vscode-descriptionForeground, #858585); margin: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 30px; }
        .stat-card { background: var(--vscode-input-background, #3c3c3c); border-radius: 8px; padding: 12px; text-align: center; }
        .stat-card .number { font-size: 1.8em; font-weight: bold; }
        .stat-card .label { color: var(--vscode-descriptionForeground, #858585); font-size: 0.8em; }
        .stat-card.full .number { color: #4caf50; }
        .stat-card.partial .number { color: #8bc34a; }
        .stat-card.generic .number { color: #ff9800; }
        .stat-card.none .number { color: #f44336; }
        .stat-card.blue .number { color: #3794ff; }
        .progress-container { background: var(--vscode-input-background, #3c3c3c); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .progress-bar { height: 30px; border-radius: 15px; overflow: hidden; display: flex; background: #333; }
        .progress-segment { height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75em; font-weight: bold; overflow: hidden; }
        .segment-full { background: #4caf50; }
        .segment-partial { background: #8bc34a; }
        .segment-generic { background: #ff9800; }
        .segment-none { background: #f44336; }
        .legend { display: flex; gap: 20px; margin: 15px 0; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.85em; }
        .legend-color { width: 12px; height: 12px; border-radius: 3px; }
        .section-title { color: var(--vscode-textLink-foreground, #3794ff); margin: 25px 0 15px 0; padding-bottom: 5px; border-bottom: 1px solid var(--vscode-panel-border, #454545); }
        .category-card { background: var(--vscode-input-background, #3c3c3c); border-radius: 8px; padding: 15px; margin-bottom: 12px; }
        .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .category-name { font-weight: bold; }
        .category-progress { height: 8px; border-radius: 4px; display: flex; overflow: hidden; background: #333; }
        .category-stats { display: flex; gap: 15px; margin-top: 8px; font-size: 0.85em; color: var(--vscode-descriptionForeground, #858585); }
        details { margin-top: 12px; }
        details summary { cursor: pointer; color: var(--vscode-textLink-foreground, #3794ff); font-size: 0.9em; }
        details summary:hover { text-decoration: underline; }
        .feature-list { max-height: 400px; overflow-y: auto; margin-top: 10px; padding: 10px; background: var(--vscode-editor-background, #1e1e1e); border-radius: 6px; }
        .feature-item { padding: 8px 5px; border-bottom: 1px solid var(--vscode-panel-border, #333); }
        .feature-item:last-child { border-bottom: none; }
        .feature-header { display: flex; align-items: center; gap: 10px; }
        .feature-name { font-weight: 500; min-width: 200px; }
        .feature-rule { color: var(--vscode-descriptionForeground, #858585); font-family: monospace; font-size: 0.85em; }
        .feature-notes { color: var(--vscode-descriptionForeground, #858585); font-size: 0.85em; font-style: italic; }
        .feature-link { color: var(--vscode-textLink-foreground, #3794ff); text-decoration: none; font-size: 0.85em; margin-left: auto; }
        .status-full { color: #4caf50; }
        .status-partial { color: #8bc34a; }
        .status-generic { color: #ff9800; }
        .status-none { color: #f44336; }
        .status-na { color: #858585; }
        .keyword-container { margin-top: 8px; padding-left: 20px; }
        .keyword-section { margin: 5px 0; }
        .keyword-label { font-size: 0.8em; margin-right: 8px; }
        .supported-label { color: #4caf50; }
        .unsupported-label { color: #f44336; }
        .keyword-list { display: inline-flex; flex-wrap: wrap; gap: 5px; }
        .keyword-tag { padding: 2px 6px; border-radius: 3px; font-size: 0.75em; font-family: monospace; }
        .keyword-tag.supported { background: rgba(76, 175, 80, 0.2); color: #4caf50; }
        .keyword-tag.unsupported { background: rgba(244, 67, 54, 0.2); color: #f44336; }
        .info-box { background: var(--vscode-input-background, #3c3c3c); border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .info-box.warning { border-left: 4px solid #ff9800; }
        .info-box h4 { margin: 0 0 8px 0; color: #ff9800; }
        .info-box p { margin: 0; font-size: 0.9em; color: var(--vscode-descriptionForeground, #858585); }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--vscode-panel-border, #454545); text-align: center; color: var(--vscode-descriptionForeground, #858585); font-size: 0.85em; }
        .footer a { color: var(--vscode-textLink-foreground, #3794ff); }
    `;
}

/**
 * Generate HTML report for webview (parser coverage only)
 */
export function generateParserHtmlReport(): string {
    const overall = calculateParserCoverage();
    const byCategory = calculateParserCoverageByCategory();
    const genericFeatures = getGenericFeatures();
    const unsupportedFeatures = getUnsupportedFeatures();
    const unsupportedKeywords = getUnsupportedKeywords();

    const supportIcon = (support: ParserSupport): string => {
        switch (support) {
            case ParserSupport.Full: return '<span class="status-full">✓</span>';
            case ParserSupport.Partial: return '<span class="status-partial">◐</span>';
            case ParserSupport.Generic: return '<span class="status-generic">⚬</span>';
            case ParserSupport.None: return '<span class="status-none">○</span>';
            default: return '<span class="status-na">─</span>';
        }
    };

    const renderKeywords = (feature: DocumentedFeature): string => {
        if (!feature.supportedKeywords || feature.supportedKeywords.length === 0) {
            return '';
        }
        const supported = feature.supportedKeywords.filter(k => k.supported);
        const unsupported = feature.supportedKeywords.filter(k => !k.supported);
        
        let html = '<div class="keyword-container">';
        
        if (supported.length > 0) {
            html += '<div class="keyword-section">';
            html += '<span class="keyword-label supported-label">Supported:</span>';
            html += '<div class="keyword-list">';
            for (const kw of supported) {
                html += `<span class="keyword-tag supported">${kw.keyword}</span>`;
            }
            html += '</div></div>';
        }
        
        if (unsupported.length > 0) {
            html += '<div class="keyword-section">';
            html += '<span class="keyword-label unsupported-label">Missing:</span>';
            html += '<div class="keyword-list">';
            for (const kw of unsupported) {
                const notes = kw.notes ? ` title="${kw.notes}"` : '';
                html += `<span class="keyword-tag unsupported"${notes}>${kw.keyword}</span>`;
            }
            html += '</div></div>';
        }
        
        html += '</div>';
        return html;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parser Coverage Report</title>
    <style>${sharedStyles()}</style>
</head>
<body>
    <div class="header">
        <h1>tree-sitter-abl Parser Coverage</h1>
        <p>Comparing grammar against Progress OpenEdge ABL Reference documentation</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card blue">
            <div class="number">${overall.dedicatedRulePercentage}%</div>
            <div class="label">Dedicated Rules</div>
        </div>
        <div class="stat-card full">
            <div class="number">${overall.full}</div>
            <div class="label">Full Support</div>
        </div>
        <div class="stat-card partial">
            <div class="number">${overall.partial}</div>
            <div class="label">Partial</div>
        </div>
        <div class="stat-card generic">
            <div class="number">${overall.generic}</div>
            <div class="label">Generic Parse</div>
        </div>
        <div class="stat-card none">
            <div class="number">${overall.none}</div>
            <div class="label">Not Supported</div>
        </div>
        <div class="stat-card">
            <div class="number">${overall.total}</div>
            <div class="label">Total Features</div>
        </div>
    </div>

    <div class="progress-container">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Parser Coverage Breakdown</span>
            <span>${overall.dedicatedRulePercentage}% with dedicated rules</span>
        </div>
        <div class="progress-bar">
            <div class="progress-segment segment-full" style="width: ${(overall.full / overall.total * 100).toFixed(1)}%">${overall.full > 3 ? 'Full' : ''}</div>
            <div class="progress-segment segment-partial" style="width: ${(overall.partial / overall.total * 100).toFixed(1)}%">${overall.partial > 3 ? 'Partial' : ''}</div>
            <div class="progress-segment segment-generic" style="width: ${(overall.generic / overall.total * 100).toFixed(1)}%">${overall.generic > 3 ? 'Generic' : ''}</div>
            <div class="progress-segment segment-none" style="width: ${(overall.none / overall.total * 100).toFixed(1)}%">${overall.none > 3 ? 'None' : ''}</div>
        </div>
        <div class="legend">
            <div class="legend-item"><div class="legend-color" style="background:#4caf50"></div> Full - Dedicated rule, most keywords</div>
            <div class="legend-item"><div class="legend-color" style="background:#8bc34a"></div> Partial - Dedicated rule, some keywords missing</div>
            <div class="legend-item"><div class="legend-color" style="background:#ff9800"></div> Generic - Parses via abl_statement fallback</div>
            <div class="legend-item"><div class="legend-color" style="background:#f44336"></div> None - Cannot be parsed</div>
        </div>
        ${overall.keywordStats.total > 0 ? `
        <div style="margin-top: 10px; font-size: 0.9em; color: var(--vscode-descriptionForeground);">
            Keyword-level coverage: ${Math.round((overall.keywordStats.supported / overall.keywordStats.total) * 100)}% 
            (${overall.keywordStats.supported} of ${overall.keywordStats.total} tracked keywords)
        </div>
        ` : ''}
    </div>

    <div class="info-box warning">
        <h4>Understanding Generic Parse</h4>
        <p>
            Statements with "Generic Parse" fall through to the <code>abl_statement</code> catch-all rule. 
            They parse successfully (no syntax errors) but the grammar doesn't understand their internal structure
            - they're treated as <code>identifier + expressions + period</code>. This means formatters and 
            analyzers can't provide intelligent handling for these statements.
        </p>
    </div>

    <h2 class="section-title">Coverage by Category</h2>

    ${byCategory.map(cat => {
        const fullPct = (cat.stats.full / cat.stats.total * 100).toFixed(1);
        const partialPct = (cat.stats.partial / cat.stats.total * 100).toFixed(1);
        const genericPct = (cat.stats.generic / cat.stats.total * 100).toFixed(1);
        const nonePct = (cat.stats.none / cat.stats.total * 100).toFixed(1);
        
        const fullFeatures = cat.features.filter(f => f.support === ParserSupport.Full);
        const partialFeatures = cat.features.filter(f => f.support === ParserSupport.Partial);
        const genericFeatures = cat.features.filter(f => f.support === ParserSupport.Generic);
        const noneFeatures = cat.features.filter(f => f.support === ParserSupport.None);
        
        return `
        <div class="category-card">
            <div class="category-header">
                <span class="category-name">${cat.categoryName}</span>
                <span>${cat.stats.dedicatedRulePercentage}% dedicated rules</span>
            </div>
            <div class="category-progress">
                <div class="segment-full" style="width: ${fullPct}%"></div>
                <div class="segment-partial" style="width: ${partialPct}%"></div>
                <div class="segment-generic" style="width: ${genericPct}%"></div>
                <div class="segment-none" style="width: ${nonePct}%"></div>
            </div>
            <div class="category-stats">
                <span class="status-full">✓ ${cat.stats.full} full</span>
                <span class="status-partial">◐ ${cat.stats.partial} partial</span>
                <span class="status-generic">⚬ ${cat.stats.generic} generic</span>
                <span class="status-none">○ ${cat.stats.none} none</span>
            </div>
            
            <details>
                <summary>View ${cat.features.length} features in this category</summary>
                <div class="feature-list">
                    ${fullFeatures.length > 0 ? `
                        <h4 class="status-full">✓ Full Support (${fullFeatures.length})</h4>
                        ${fullFeatures.map(f => `
                            <div class="feature-item">
                                <div class="feature-header">
                                    ${supportIcon(f.support)}
                                    <span class="feature-name">${f.name}</span>
                                    ${f.grammarRule ? `<span class="feature-rule">${f.grammarRule}</span>` : ''}
                                    ${f.docLink ? `<a class="feature-link" href="${f.docLink}" target="_blank">Docs</a>` : ''}
                                </div>
                                ${renderKeywords(f)}
                            </div>
                        `).join('')}
                    ` : ''}
                    
                    ${partialFeatures.length > 0 ? `
                        <h4 class="status-partial">◐ Partial Support (${partialFeatures.length})</h4>
                        ${partialFeatures.map(f => `
                            <div class="feature-item">
                                <div class="feature-header">
                                    ${supportIcon(f.support)}
                                    <span class="feature-name">${f.name}</span>
                                    ${f.grammarRule ? `<span class="feature-rule">${f.grammarRule}</span>` : ''}
                                    ${f.docLink ? `<a class="feature-link" href="${f.docLink}" target="_blank">Docs</a>` : ''}
                                </div>
                                ${f.notes ? `<div class="feature-notes">${f.notes}</div>` : ''}
                                ${renderKeywords(f)}
                            </div>
                        `).join('')}
                    ` : ''}
                    
                    ${genericFeatures.length > 0 ? `
                        <h4 class="status-generic">⚬ Generic Parse (${genericFeatures.length})</h4>
                        ${genericFeatures.map(f => `
                            <div class="feature-item">
                                <div class="feature-header">
                                    ${supportIcon(f.support)}
                                    <span class="feature-name">${f.name}</span>
                                    <span class="feature-rule">→ abl_statement</span>
                                    ${f.docLink ? `<a class="feature-link" href="${f.docLink}" target="_blank">Docs</a>` : ''}
                                </div>
                                ${f.notes ? `<div class="feature-notes">${f.notes}</div>` : ''}
                            </div>
                        `).join('')}
                    ` : ''}
                    
                    ${noneFeatures.length > 0 ? `
                        <h4 class="status-none">○ Not Supported (${noneFeatures.length})</h4>
                        ${noneFeatures.map(f => `
                            <div class="feature-item">
                                <div class="feature-header">
                                    ${supportIcon(f.support)}
                                    <span class="feature-name">${f.name}</span>
                                    ${f.docLink ? `<a class="feature-link" href="${f.docLink}" target="_blank">Docs</a>` : ''}
                                </div>
                                ${f.notes ? `<div class="feature-notes">${f.notes}</div>` : ''}
                            </div>
                        `).join('')}
                    ` : ''}
                </div>
            </details>
        </div>
        `;
    }).join('')}

    ${unsupportedKeywords.length > 0 ? `
    <h2 class="section-title">Missing Keywords in Partial Features</h2>
    <div class="info-box">
        ${unsupportedKeywords.map(({ feature, keywords }) => `
            <div style="margin-bottom: 10px;">
                <strong>${feature}</strong>
                <div class="keyword-list" style="margin-top: 5px;">
                    ${keywords.map(kw => `
                        <span class="keyword-tag unsupported" ${kw.notes ? `title="${kw.notes}"` : ''}>${kw.keyword}</span>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>Source: <a href="https://docs.progress.com/bundle/abl-reference/" target="_blank">Progress OpenEdge ABL Reference</a></p>
        <p>Report generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;
}

/**
 * Generate standalone HTML report for formatter coverage
 */
export function generateFormatterHtmlReport(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formatter Coverage Report</title>
    <style>${sharedStyles()}</style>
</head>
<body>
    <div class="header">
        <h1>ABL Formatter Coverage</h1>
        <p>Approximate coverage of each formatter against documented ABL constructs</p>
    </div>
    ${generateFormatterHtmlSection()}
    <div class="footer">
        <p>Report generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;
}

function generateFormatterHtmlSection(): string {
    const stats = calculateFormatterStats();
    const overallScore = getOverallFormatterCoverage();

    const coverageIcon = (coverage: FormatterCoverage): string => {
        switch (coverage) {
            case FormatterCoverage.Covered: return '<span class="status-full">✓</span>';
            case FormatterCoverage.PassThrough: return '<span class="status-generic">⚬</span>';
            case FormatterCoverage.Missing: return '<span class="status-none">○</span>';
        }
    };

    const scoreColor = (score: number): string => {
        if (score >= 80) { return 'var(--status-full-color, #4ec9b0)'; }
        if (score >= 60) { return 'var(--status-partial-color, #dcdcaa)'; }
        if (score >= 40) { return 'var(--status-generic-color, #9cdcfe)'; }
        return 'var(--status-none-color, #f44747)';
    };

    return `
    <h2 class="section-title">Formatter Coverage (Approximation)</h2>
    <div class="info-box">
        <p>
            <strong>Overall approximate formatter coverage: ${overallScore}%</strong><br>
            Each formatter is scored based on how many of the ABL construct's documented 
            keywords/options are actively formatted vs passed through unchanged or missing.
        </p>
        <p>
            <span class="status-full">✓</span> Covered — formatter actively handles and reformats this option.<br>
            <span class="status-generic">⚬</span> Pass-through — formatter preserves but does not reformat this option.<br>
            <span class="status-none">○</span> Missing — option is not handled; output may be malformatted.
        </p>
        <p style="font-size: 0.85em; color: var(--vscode-descriptionForeground, #858585);">
            Note: These scores are manual approximations based on source code inspection.
        </p>
    </div>

    <div class="stats-grid">
        ${stats.map(s => `
            <div class="stat-card" style="border-left: 3px solid ${scoreColor(s.approximateScore)};">
                <div class="stat-value" style="color: ${scoreColor(s.approximateScore)};">${s.approximateScore}%</div>
                <div class="stat-label">${s.formatterDir}</div>
            </div>
        `).join('')}
    </div>

    ${formatterEntries.map(entry => {
        const coveredCount = entry.options.filter(o => o.coverage === FormatterCoverage.Covered).length;
        const ptCount = entry.options.filter(o => o.coverage === FormatterCoverage.PassThrough).length;
        const missingCount = entry.options.filter(o => o.coverage === FormatterCoverage.Missing).length;
        const score = entry.approximateScore;
        const color = scoreColor(score);
        const barFull = ((coveredCount / entry.options.length) * 100).toFixed(1);
        const barPt = ((ptCount / entry.options.length) * 100).toFixed(1);
        const barMissing = ((missingCount / entry.options.length) * 100).toFixed(1);
        return `
        <div class="category-card">
            <div class="category-header">
                <span class="category-name">${entry.formatterName}</span>
                <span style="color: ${color}; font-weight: bold;">${score}%</span>
            </div>
            <div class="category-progress">
                <div class="segment-full" style="width: ${barFull}%"></div>
                <div class="segment-generic" style="width: ${barPt}%"></div>
                <div class="segment-none" style="width: ${barMissing}%"></div>
            </div>
            <div class="category-stats">
                <span class="status-full">✓ ${coveredCount} covered</span>
                <span class="status-generic">⚬ ${ptCount} pass-through</span>
                ${missingCount > 0 ? `<span class="status-none">○ ${missingCount} missing</span>` : ''}
            </div>
            ${entry.notes ? `<div class="feature-notes" style="margin-top: 6px;">${entry.notes}</div>` : ''}
            <details>
                <summary>View ${entry.options.length} options for ${entry.formatterDir}</summary>
                <div class="feature-list">
                    ${entry.options.map(opt => `
                        <div class="feature-item">
                            <div class="feature-header">
                                ${coverageIcon(opt.coverage)}
                                <span class="feature-name">${opt.name}</span>
                                ${opt.notes ? `<span class="feature-notes">${opt.notes}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </details>
            <div style="margin-top: 4px; font-size: 0.8em; color: var(--vscode-descriptionForeground, #858585);">
                Handles: ${entry.handlesNodeTypes.join(', ')}
            </div>
        </div>
        `;
    }).join('')}`;
}
