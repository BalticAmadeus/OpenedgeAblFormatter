/**
 * ABL Parser Coverage Module
 * 
 * This module tracks how much of the official Progress OpenEdge ABL documentation
 * is supported by the tree-sitter-abl grammar.
 * 
 * Coverage levels:
 * - Full: Dedicated grammar rule with comprehensive keyword support
 * - Partial: Dedicated grammar rule but missing some keywords/options
 * - Generic: Parses via abl_statement catch-all (no structural understanding)
 * - None: Cannot be parsed
 * 
 * Question answered: "What percentage of ABL does tree-sitter-abl ACTUALLY parse with structural understanding?"
 */

// Parser coverage data (Progress docs → tree-sitter-abl grammar)
export {
    ParserSupport,
    DocCategory,
    KeywordSupport,
    DocumentedFeature,
    allDocumentedFeatures,
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
    getFeaturesByCategory,
    getFeaturesBySupport,
    getFeaturesWithDedicatedRules,
    getFeaturesWithGenericParsing,
    getUnsupportedFeatures as getUnsupportedFeaturesData,
    countKeywordSupport,
} from "./ParserCoverageData";

// Parser coverage calculator
export {
    ParserCoverageStats,
    DocCategoryCoverage,
    calculateParserCoverage,
    calculateParserCoverageByCategory,
    getFeaturesWithDedicatedRules as getDedicatedRuleFeatures,
    getGenericFeatures,
    getUnsupportedFeatures,
    getUnsupportedKeywords,
    generateTextReport,
    generateHtmlReport,
} from "./ParserCoverageCalculator";
