/**
 * ABL Parser Coverage Calculator
 * 
 * Calculates how much of the official Progress OpenEdge ABL documentation
 * is supported by the tree-sitter-abl grammar.
 * 
 * This measures parser completeness: "What ABL features from official docs 
 * does tree-sitter-abl actually support?"
 */

import {
    allDocumentedFeatures,
    DocumentedFeature,
    DocCategory,
    ParserCoverage,
    getDocFeaturesByCategory,
    getDocFeaturesByStatus,
    getApplicableDocFeatures,
    getMissingDocFeatures,
    documentedStatements,
    documentedDataTypes,
    documentedOperators,
    documentedPreprocessor,
    documentedOOFeatures,
    documentedErrorHandling,
} from "./ParserCoverageData";

export interface ParserCoverageStats {
    /** Total number of applicable documented features */
    total: number;
    /** Number of features fully supported by grammar */
    supported: number;
    /** Number of features partially supported */
    partial: number;
    /** Number of features not supported by grammar */
    notSupported: number;
    /** Number of not applicable features (excluded) */
    notApplicable: number;
    /** Overall parser coverage percentage (supported + 0.5*partial) */
    percentage: number;
    /** Strict coverage percentage (only fully supported) */
    strictPercentage: number;
}

export interface DocCategoryCoverage {
    category: DocCategory;
    categoryName: string;
    stats: ParserCoverageStats;
    features: DocumentedFeature[];
}

/**
 * Calculate overall parser coverage
 * How much of Progress OpenEdge ABL does tree-sitter-abl support?
 */
export function calculateParserCoverage(): ParserCoverageStats {
    const applicable = getApplicableDocFeatures();
    const supported = applicable.filter(
        (f) => f.parserStatus === ParserCoverage.Supported
    ).length;
    const partial = applicable.filter(
        (f) => f.parserStatus === ParserCoverage.Partial
    ).length;
    const notSupported = applicable.filter(
        (f) => f.parserStatus === ParserCoverage.NotSupported
    ).length;
    const notApplicable = allDocumentedFeatures.filter(
        (f) => f.parserStatus === ParserCoverage.NotApplicable
    ).length;

    const total = applicable.length;
    const effectiveCoverage = supported + partial * 0.5;

    return {
        total,
        supported,
        partial,
        notSupported,
        notApplicable,
        percentage: total > 0 ? Math.round((effectiveCoverage / total) * 100) : 0,
        strictPercentage: total > 0 ? Math.round((supported / total) * 100) : 0,
    };
}

/**
 * Calculate parser coverage by documentation category
 */
export function calculateParserCoverageByCategory(): DocCategoryCoverage[] {
    const categoryNames: Record<DocCategory, string> = {
        [DocCategory.Statement]: "Statements",
        [DocCategory.BuiltInFunction]: "Built-in Functions",
        [DocCategory.DataType]: "Data Types",
        [DocCategory.Operator]: "Operators",
        [DocCategory.Preprocessor]: "Preprocessor",
        [DocCategory.ObjectOriented]: "Object-Oriented",
        [DocCategory.Widget]: "Widgets & UI",
        [DocCategory.Database]: "Database Operations",
        [DocCategory.ErrorHandling]: "Error Handling",
        [DocCategory.SystemHandle]: "System Handles",
        [DocCategory.Event]: "Events",
        [DocCategory.Other]: "Other",
    };

    const featureGroups: { category: DocCategory; features: DocumentedFeature[] }[] = [
        { category: DocCategory.Statement, features: documentedStatements },
        { category: DocCategory.DataType, features: documentedDataTypes },
        { category: DocCategory.Operator, features: documentedOperators },
        { category: DocCategory.Preprocessor, features: documentedPreprocessor },
        { category: DocCategory.ObjectOriented, features: documentedOOFeatures },
        { category: DocCategory.ErrorHandling, features: documentedErrorHandling },
    ];

    const results: DocCategoryCoverage[] = [];

    for (const { category, features } of featureGroups) {
        const applicable = features.filter(
            (f) => f.parserStatus !== ParserCoverage.NotApplicable
        );
        
        if (applicable.length === 0) continue;

        const supported = applicable.filter(
            (f) => f.parserStatus === ParserCoverage.Supported
        ).length;
        const partial = applicable.filter(
            (f) => f.parserStatus === ParserCoverage.Partial
        ).length;
        const notSupported = applicable.filter(
            (f) => f.parserStatus === ParserCoverage.NotSupported
        ).length;
        const notApplicable = features.filter(
            (f) => f.parserStatus === ParserCoverage.NotApplicable
        ).length;

        const total = applicable.length;
        const effectiveCoverage = supported + partial * 0.5;

        results.push({
            category,
            categoryName: categoryNames[category],
            stats: {
                total,
                supported,
                partial,
                notSupported,
                notApplicable,
                percentage: total > 0 ? Math.round((effectiveCoverage / total) * 100) : 0,
                strictPercentage: total > 0 ? Math.round((supported / total) * 100) : 0,
            },
            features: applicable,
        });
    }

    // Sort by percentage descending
    results.sort((a, b) => b.stats.percentage - a.stats.percentage);
    return results;
}

/**
 * Get features not supported by the grammar
 */
export function getUnsupportedFeatures(): DocumentedFeature[] {
    return getDocFeaturesByStatus(ParserCoverage.NotSupported);
}

/**
 * Get features partially supported by the grammar
 */
export function getPartiallySupportedFeatures(): DocumentedFeature[] {
    return getDocFeaturesByStatus(ParserCoverage.Partial);
}

/**
 * Generate a text-based parser coverage report
 */
export function generateTextReport(): string {
    const overall = calculateParserCoverage();
    const byCategory = calculateParserCoverageByCategory();

    let report = "";
    report += "═══════════════════════════════════════════════════════════════\n";
    report += "        TREE-SITTER-ABL PARSER COVERAGE REPORT\n";
    report += "   How much of Progress OpenEdge ABL is parseable?\n";
    report += "═══════════════════════════════════════════════════════════════\n\n";

    // Overall stats
    report += "📊 OVERALL PARSER COVERAGE\n";
    report += "───────────────────────────────────────────────────────────────\n";
    report += `   Coverage:      ${overall.percentage}% (${overall.supported} fully + ${overall.partial} partial of ${overall.total} features)\n`;
    report += `   Strict:        ${overall.strictPercentage}% (fully supported only)\n`;
    report += `   Not Parseable: ${overall.notSupported} documented features\n`;
    report += `   Not Applicable: ${overall.notApplicable} features (runtime-only, etc.)\n\n`;

    // Progress bar
    const barLength = 40;
    const filledLength = Math.round((overall.percentage / 100) * barLength);
    const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);
    report += `   [${bar}] ${overall.percentage}%\n\n`;

    // Category breakdown
    report += "📁 COVERAGE BY CATEGORY\n";
    report += "───────────────────────────────────────────────────────────────\n";

    for (const cat of byCategory) {
        const catBar = "█".repeat(Math.round((cat.stats.percentage / 100) * 20));
        const catEmpty = "░".repeat(20 - catBar.length);
        report += `   ${cat.categoryName.padEnd(22)} [${catBar}${catEmpty}] ${cat.stats.percentage}%\n`;
        report += `      ✓ ${cat.stats.supported} supported | ◐ ${cat.stats.partial} partial | ○ ${cat.stats.notSupported} missing\n`;
    }

    report += "\n";

    // Not supported features
    const unsupported = getUnsupportedFeatures();
    if (unsupported.length > 0) {
        report += "⚠️  NOT SUPPORTED BY GRAMMAR (Progress docs features)\n";
        report += "───────────────────────────────────────────────────────────────\n";
        
        // Group by category for readability
        const groupedByCategory = new Map<DocCategory, DocumentedFeature[]>();
        for (const feature of unsupported) {
            const existing = groupedByCategory.get(feature.category) || [];
            existing.push(feature);
            groupedByCategory.set(feature.category, existing);
        }

        const categoryNames: Record<DocCategory, string> = {
            [DocCategory.Statement]: "Statements",
            [DocCategory.BuiltInFunction]: "Built-in Functions",
            [DocCategory.DataType]: "Data Types",
            [DocCategory.Operator]: "Operators",
            [DocCategory.Preprocessor]: "Preprocessor",
            [DocCategory.ObjectOriented]: "Object-Oriented",
            [DocCategory.Widget]: "Widgets & UI",
            [DocCategory.Database]: "Database Operations",
            [DocCategory.ErrorHandling]: "Error Handling",
            [DocCategory.SystemHandle]: "System Handles",
            [DocCategory.Event]: "Events",
            [DocCategory.Other]: "Other",
        };

        for (const [category, features] of groupedByCategory) {
            report += `\n   [${categoryNames[category]}]\n`;
            for (const feature of features.slice(0, 15)) {
                const notes = feature.notes ? ` - ${feature.notes}` : "";
                report += `   ○ ${feature.name}${notes}\n`;
            }
            if (features.length > 15) {
                report += `   ... and ${features.length - 15} more\n`;
            }
        }
        report += "\n";
    }

    // Partial features
    const partial = getPartiallySupportedFeatures();
    if (partial.length > 0) {
        report += "◐ PARTIALLY SUPPORTED (Grammar has limited support)\n";
        report += "───────────────────────────────────────────────────────────────\n";
        for (const feature of partial) {
            const notes = feature.notes ? ` - ${feature.notes}` : "";
            report += `   ◐ ${feature.name.padEnd(25)}${notes}\n`;
        }
        report += "\n";
    }

    report += "═══════════════════════════════════════════════════════════════\n";
    report += "   Source: Progress OpenEdge ABL Reference\n";
    report += "   https://docs.progress.com/bundle/abl-reference/\n";
    report += `   Report generated: ${new Date().toISOString()}\n`;
    report += "═══════════════════════════════════════════════════════════════\n";

    return report;
}

/**
 * Generate HTML report for webview
 */
export function generateHtmlReport(): string {
    const overall = calculateParserCoverage();
    const byCategory = calculateParserCoverageByCategory();
    const unsupported = getUnsupportedFeatures();
    const partial = getPartiallySupportedFeatures();

    // Group unsupported by category
    const groupedUnsupported = new Map<DocCategory, DocumentedFeature[]>();
    for (const feature of unsupported) {
        const existing = groupedUnsupported.get(feature.category) || [];
        existing.push(feature);
        groupedUnsupported.set(feature.category, existing);
    }

    const categoryNames: Record<DocCategory, string> = {
        [DocCategory.Statement]: "Statements",
        [DocCategory.BuiltInFunction]: "Built-in Functions",
        [DocCategory.DataType]: "Data Types",
        [DocCategory.Operator]: "Operators",
        [DocCategory.Preprocessor]: "Preprocessor",
        [DocCategory.ObjectOriented]: "Object-Oriented",
        [DocCategory.Widget]: "Widgets & UI",
        [DocCategory.Database]: "Database Operations",
        [DocCategory.ErrorHandling]: "Error Handling",
        [DocCategory.SystemHandle]: "System Handles",
        [DocCategory.Event]: "Events",
        [DocCategory.Other]: "Other",
    };

    let unsupportedHtml = "";
    for (const [category, features] of groupedUnsupported) {
        unsupportedHtml += `
            <details>
                <summary>${categoryNames[category]} (${features.length} missing)</summary>
                <div class="collapsible-content">
                    ${features.map(f => `
                        <div class="feature-item-compact">
                            <span class="feature-status status-missing">○</span>
                            <span class="feature-name">${f.name}</span>
                            ${f.notes ? `<span class="feature-notes">${f.notes}</span>` : ""}
                            ${f.docLink ? `<a class="feature-link" href="${f.docLink}" target="_blank">Docs</a>` : ""}
                        </div>
                    `).join("")}
                </div>
            </details>
        `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parser Coverage Report</title>
    <style>
        :root {
            --vscode-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
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
        .header h1 {
            color: var(--vscode-textLink-foreground, #3794ff);
            margin-bottom: 5px;
        }
        .header p {
            color: var(--vscode-descriptionForeground, #858585);
            margin: 0;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: var(--vscode-input-background, #3c3c3c);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .stat-card .number {
            font-size: 2em;
            font-weight: bold;
            color: var(--vscode-textLink-foreground, #3794ff);
        }
        .stat-card .label {
            color: var(--vscode-descriptionForeground, #858585);
            font-size: 0.85em;
        }
        .stat-card.green .number { color: #4caf50; }
        .stat-card.orange .number { color: #ff9800; }
        .stat-card.red .number { color: #f44336; }
        .progress-container {
            background: var(--vscode-input-background, #3c3c3c);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .progress-bar {
            background: var(--vscode-progressBar-background, #0e639c);
            height: 30px;
            border-radius: 15px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            background: linear-gradient(90deg, #4caf50, #8bc34a);
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .category-card {
            background: var(--vscode-input-background, #3c3c3c);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
        }
        .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .category-name { font-weight: bold; }
        .category-progress {
            background: var(--vscode-progressBar-background, #0e639c);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
        }
        .category-progress-fill {
            background: linear-gradient(90deg, #4caf50, #8bc34a);
            height: 100%;
        }
        .category-stats {
            display: flex;
            gap: 15px;
            margin-top: 8px;
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground, #858585);
        }
        .category-details {
            margin-top: 12px;
            background: transparent;
            padding: 0;
        }
        .category-details summary {
            font-size: 0.85em;
            color: var(--vscode-textLink-foreground, #3794ff);
            cursor: pointer;
            padding: 5px 0;
        }
        .category-details summary:hover {
            text-decoration: underline;
        }
        .category-features {
            max-height: 400px;
            overflow-y: auto;
            margin-top: 10px;
            padding: 10px;
            background: var(--vscode-editor-background, #1e1e1e);
            border-radius: 6px;
        }
        .feature-group {
            margin-bottom: 15px;
        }
        .feature-group:last-child {
            margin-bottom: 0;
        }
        .feature-group-header {
            font-weight: 600;
            font-size: 0.9em;
            padding: 5px 0;
            margin-bottom: 5px;
            border-bottom: 1px solid var(--vscode-panel-border, #454545);
        }
        .section-title {
            color: var(--vscode-textLink-foreground, #3794ff);
            margin: 25px 0 15px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid var(--vscode-panel-border, #454545);
        }
        .legend {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 10px;
            background: var(--vscode-input-background, #3c3c3c);
            border-radius: 8px;
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .status-supported { color: #4caf50; }
        .status-partial { color: #ff9800; }
        .status-missing { color: #f44336; }
        details {
            margin-top: 10px;
            background: var(--vscode-input-background, #3c3c3c);
            border-radius: 8px;
            padding: 10px;
        }
        summary {
            cursor: pointer;
            color: var(--vscode-textLink-foreground, #3794ff);
            font-weight: 500;
        }
        .collapsible-content {
            max-height: 300px;
            overflow-y: auto;
            padding: 10px;
            margin-top: 10px;
        }
        .feature-item-compact {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 5px 0;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
        }
        .feature-status { font-size: 1em; }
        .feature-name { font-weight: 500; min-width: 180px; }
        .feature-notes {
            color: var(--vscode-descriptionForeground, #858585);
            font-size: 0.85em;
            flex: 1;
        }
        .feature-link {
            color: var(--vscode-textLink-foreground, #3794ff);
            text-decoration: none;
            font-size: 0.85em;
        }
        .feature-link:hover { text-decoration: underline; }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border, #454545);
            text-align: center;
            color: var(--vscode-descriptionForeground, #858585);
            font-size: 0.85em;
        }
        .footer a {
            color: var(--vscode-textLink-foreground, #3794ff);
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌲 tree-sitter-abl Parser Coverage</h1>
        <p>How much of Progress OpenEdge ABL Reference does the grammar support?</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="number">${overall.percentage}%</div>
            <div class="label">Parser Coverage</div>
        </div>
        <div class="stat-card green">
            <div class="number">${overall.supported}</div>
            <div class="label">Supported</div>
        </div>
        <div class="stat-card orange">
            <div class="number">${overall.partial}</div>
            <div class="label">Partial</div>
        </div>
        <div class="stat-card red">
            <div class="number">${overall.notSupported}</div>
            <div class="label">Not Supported</div>
        </div>
        <div class="stat-card">
            <div class="number">${overall.total}</div>
            <div class="label">Total Features</div>
        </div>
    </div>

    <div class="progress-container">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Overall Parser Coverage</span>
            <span>${overall.percentage}%</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${overall.percentage}%">${overall.percentage}%</div>
        </div>
        <div style="font-size: 0.85em; color: var(--vscode-descriptionForeground, #858585); margin-top: 5px;">
            ${overall.supported} fully supported + ${overall.partial} partial of ${overall.total} documented ABL features
        </div>
    </div>

    <h2 class="section-title">Coverage by Category</h2>
    <div class="legend">
        <div class="legend-item"><span class="status-supported">✓</span> Supported</div>
        <div class="legend-item"><span class="status-partial">◐</span> Partial</div>
        <div class="legend-item"><span class="status-missing">○</span> Not Supported</div>
    </div>

    ${byCategory.map(cat => {
        const supported = cat.features.filter(f => f.parserStatus === ParserCoverage.Supported);
        const partialFeatures = cat.features.filter(f => f.parserStatus === ParserCoverage.Partial);
        const missing = cat.features.filter(f => f.parserStatus === ParserCoverage.NotSupported);
        
        return `
        <div class="category-card">
            <div class="category-header">
                <span class="category-name">${cat.categoryName}</span>
                <span>${cat.stats.percentage}%</span>
            </div>
            <div class="category-progress">
                <div class="category-progress-fill" style="width: ${cat.stats.percentage}%"></div>
            </div>
            <div class="category-stats">
                <span class="status-supported">✓ ${cat.stats.supported} supported</span>
                <span class="status-partial">◐ ${cat.stats.partial} partial</span>
                <span class="status-missing">○ ${cat.stats.notSupported} missing</span>
                <span>Total: ${cat.stats.total}</span>
            </div>
            <details class="category-details">
                <summary>Show ${cat.stats.total} features</summary>
                <div class="category-features">
                    ${supported.length > 0 ? `
                        <div class="feature-group">
                            <div class="feature-group-header status-supported">✓ Supported (${supported.length})</div>
                            ${supported.map(f => `
                                <div class="feature-item-compact">
                                    <span class="feature-status status-supported">✓</span>
                                    <span class="feature-name">${f.name}</span>
                                    ${f.grammarRule ? `<span class="feature-notes">Rule: ${f.grammarRule}</span>` : ""}
                                    ${f.docLink ? `<a class="feature-link" href="${f.docLink}" target="_blank">Docs</a>` : ""}
                                </div>
                            `).join("")}
                        </div>
                    ` : ""}
                    ${partialFeatures.length > 0 ? `
                        <div class="feature-group">
                            <div class="feature-group-header status-partial">◐ Partial (${partialFeatures.length})</div>
                            ${partialFeatures.map(f => `
                                <div class="feature-item-compact">
                                    <span class="feature-status status-partial">◐</span>
                                    <span class="feature-name">${f.name}</span>
                                    ${f.notes ? `<span class="feature-notes">${f.notes}</span>` : ""}
                                    ${f.docLink ? `<a class="feature-link" href="${f.docLink}" target="_blank">Docs</a>` : ""}
                                </div>
                            `).join("")}
                        </div>
                    ` : ""}
                    ${missing.length > 0 ? `
                        <div class="feature-group">
                            <div class="feature-group-header status-missing">○ Not Supported (${missing.length})</div>
                            ${missing.map(f => `
                                <div class="feature-item-compact">
                                    <span class="feature-status status-missing">○</span>
                                    <span class="feature-name">${f.name}</span>
                                    ${f.notes ? `<span class="feature-notes">${f.notes}</span>` : ""}
                                    ${f.docLink ? `<a class="feature-link" href="${f.docLink}" target="_blank">Docs</a>` : ""}
                                </div>
                            `).join("")}
                        </div>
                    ` : ""}
                </div>
            </details>
        </div>
    `;
    }).join("")}

    <h2 class="section-title">Missing from Grammar (${unsupported.length} features)</h2>
    <p style="color: var(--vscode-descriptionForeground, #858585); font-size: 0.9em; margin-bottom: 15px;">
        These ABL features from Progress documentation are not yet supported by tree-sitter-abl grammar.
    </p>
    ${unsupportedHtml}

    ${partial.length > 0 ? `
        <h2 class="section-title">Partially Supported (${partial.length} features)</h2>
        <div class="category-card">
            ${partial.map(f => `
                <div class="feature-item-compact">
                    <span class="feature-status status-partial">◐</span>
                    <span class="feature-name">${f.name}</span>
                    ${f.notes ? `<span class="feature-notes">${f.notes}</span>` : ""}
                    ${f.grammarRule ? `<span class="feature-notes">Rule: ${f.grammarRule}</span>` : ""}
                </div>
            `).join("")}
        </div>
    ` : ""}

    <div class="footer">
        <p>Source: <a href="https://docs.progress.com/bundle/abl-reference/" target="_blank">Progress OpenEdge ABL Reference</a></p>
        <p>Grammar: <a href="https://github.com/eglekaz/tree-sitter-abl" target="_blank">tree-sitter-abl</a></p>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;
}
