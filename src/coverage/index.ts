/**
 * ABL Parser Coverage Module
 * 
 * This module tracks how much of the official Progress OpenEdge ABL documentation
 * is supported by the tree-sitter-abl grammar.
 * 
 * Question answered: "What percentage of ABL does tree-sitter-abl parse?"
 */

// Parser coverage data (Progress docs → tree-sitter-abl grammar)
export {
    ParserCoverage,
    DocCategory,
    DocumentedFeature,
    allDocumentedFeatures,
    documentedStatements,
    documentedDataTypes,
    documentedOperators,
    documentedPreprocessor,
    documentedOOFeatures,
    documentedErrorHandling,
    getDocFeaturesByCategory,
    getDocFeaturesByStatus,
    getApplicableDocFeatures,
    getMissingDocFeatures,
} from "./ParserCoverageData";

// Parser coverage calculator
export {
    ParserCoverageStats,
    DocCategoryCoverage,
    calculateParserCoverage,
    calculateParserCoverageByCategory,
    getUnsupportedFeatures,
    getPartiallySupportedFeatures,
    generateTextReport,
    generateHtmlReport,
} from "./ParserCoverageCalculator";
