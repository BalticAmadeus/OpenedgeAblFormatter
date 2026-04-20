/**
 * Progress OpenEdge ABL Language Reference - Parser Coverage
 * 
 * This file contains the comprehensive list of ABL language features
 * from official Progress OpenEdge documentation, mapped to whether
 * tree-sitter-abl grammar supports parsing them.
 * 
 * Source: Progress OpenEdge ABL Reference
 * https://docs.progress.com/bundle/abl-reference/
 * 
 * Purpose: Track how complete the tree-sitter-abl parser is compared
 * to the official language specification.
 */

export enum ParserCoverage {
    /** Grammar fully supports this feature */
    Supported = "supported",
    /** Grammar partially supports this feature */
    Partial = "partial",
    /** Grammar does not support this feature */
    NotSupported = "not-supported",
    /** Not applicable for parsing (runtime-only, deprecated, etc.) */
    NotApplicable = "not-applicable",
}

export enum DocCategory {
    /** Statements from ABL Reference */
    Statement = "statement",
    /** Built-in functions */
    BuiltInFunction = "built-in-function",
    /** Data types */
    DataType = "data-type",
    /** Operators */
    Operator = "operator",
    /** Preprocessor directives */
    Preprocessor = "preprocessor",
    /** Object-oriented constructs */
    ObjectOriented = "object-oriented",
    /** Widgets and UI */
    Widget = "widget",
    /** Database operations */
    Database = "database",
    /** Error handling */
    ErrorHandling = "error-handling",
    /** System handles and attributes */
    SystemHandle = "system-handle",
    /** Events */
    Event = "event",
    /** Other language elements */
    Other = "other",
}

export interface DocumentedFeature {
    /** Feature name as in Progress documentation */
    name: string;
    /** Category of the feature */
    category: DocCategory;
    /** Parser support status */
    parserStatus: ParserCoverage;
    /** Grammar rule that handles this (if supported) */
    grammarRule?: string;
    /** Notes about support level or limitations */
    notes?: string;
    /** Link to Progress documentation */
    docLink?: string;
}

// =============================================================================
// STATEMENTS (from ABL Reference - Statements section)
// =============================================================================
export const documentedStatements: DocumentedFeature[] = [
    // A
    {
        name: "ACCUMULATE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "accumulate_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ACCUMULATE-statement.html",
    },
    {
        name: "APPLY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Event application to widgets",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/APPLY-statement.html",
    },
    {
        name: "ASSIGN",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "assign_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ASSIGN-statement.html",
    },

    // B
    {
        name: "BELL",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Terminal bell",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/BELL-statement.html",
    },
    {
        name: "BLOCK-LEVEL ON ERROR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "error_scope_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/BLOCK-LEVEL-statement.html",
    },
    {
        name: "BUFFER-COMPARE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/BUFFER-COMPARE-statement.html",
    },
    {
        name: "BUFFER-COPY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/BUFFER-COPY-statement.html",
    },

    // C
    {
        name: "CALL",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "External procedure call (legacy)",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CALL-statement.html",
    },
    {
        name: "CASE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "case_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CASE-statement.html",
    },
    {
        name: "CATCH",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "catch_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CATCH-statement.html",
    },
    {
        name: "CHOOSE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Menu selection",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CHOOSE-statement.html",
    },
    {
        name: "CLASS",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "class_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CLASS-statement.html",
    },
    {
        name: "CLEAR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Clear frame fields",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CLEAR-statement.html",
    },
    {
        name: "CLOSE QUERY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CLOSE-QUERY-statement.html",
    },
    {
        name: "CLOSE STORED-PROCEDURE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "DataServer feature",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CLOSE-STORED-PROCEDURE-statement.html",
    },
    {
        name: "COLOR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Terminal colors",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/COLOR-statement.html",
    },
    {
        name: "COMPILE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Runtime compilation",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/COMPILE-statement.html",
    },
    {
        name: "CONNECT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Database connection",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CONNECT-statement.html",
    },
    {
        name: "CONSTRUCTOR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "constructor_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CONSTRUCTOR-statement.html",
    },
    {
        name: "COPY-LOB",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/COPY-LOB-statement.html",
    },
    {
        name: "CREATE (record)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Create database record",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-statement.html",
    },
    {
        name: "CREATE (widget)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Dynamic widget creation",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-widget-statement.html",
    },
    {
        name: "CREATE ALIAS",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-ALIAS-statement.html",
    },
    {
        name: "CREATE BROWSE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-BROWSE-statement.html",
    },
    {
        name: "CREATE BUFFER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-BUFFER-statement.html",
    },
    {
        name: "CREATE CALL",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-CALL-statement.html",
    },
    {
        name: "CREATE CLIENT-PRINCIPAL",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-CLIENT-PRINCIPAL-statement.html",
    },
    {
        name: "CREATE DATABASE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-DATABASE-statement.html",
    },
    {
        name: "CREATE DATASET",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-DATASET-statement.html",
    },
    {
        name: "CREATE DATA-SOURCE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-DATA-SOURCE-statement.html",
    },
    {
        name: "CREATE QUERY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-QUERY-statement.html",
    },
    {
        name: "CREATE SAX-ATTRIBUTES",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-SAX-ATTRIBUTES-statement.html",
    },
    {
        name: "CREATE SAX-READER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-SAX-READER-statement.html",
    },
    {
        name: "CREATE SAX-WRITER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-SAX-WRITER-statement.html",
    },
    {
        name: "CREATE SERVER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-SERVER-statement.html",
    },
    {
        name: "CREATE SERVER-SOCKET",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-SERVER-SOCKET-statement.html",
    },
    {
        name: "CREATE SOAP-HEADER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-SOAP-HEADER-statement.html",
    },
    {
        name: "CREATE SOAP-HEADER-ENTRYREF",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-SOAP-HEADER-ENTRYREF-statement.html",
    },
    {
        name: "CREATE SOCKET",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-SOCKET-statement.html",
    },
    {
        name: "CREATE TEMP-TABLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Dynamic temp-table creation (runtime)",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-TEMP-TABLE-statement.html",
    },
    {
        name: "CREATE X-DOCUMENT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-X-DOCUMENT-statement.html",
    },
    {
        name: "CREATE X-NODEREF",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-X-NODEREF-statement.html",
    },

    // D
    {
        name: "DEFINE BROWSE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "browse_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-BROWSE-statement.html",
    },
    {
        name: "DEFINE BUFFER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "buffer_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-BUFFER-statement.html",
    },
    {
        name: "DEFINE BUTTON",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Button widget definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-BUTTON-statement.html",
    },
    {
        name: "DEFINE DATASET",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "dataset_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-DATASET-statement.html",
    },
    {
        name: "DEFINE DATA-SOURCE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "data_source_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-DATA-SOURCE-statement.html",
    },
    {
        name: "DEFINE EVENT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "event_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-EVENT-statement.html",
    },
    {
        name: "DEFINE FRAME",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "frame_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-FRAME-statement.html",
    },
    {
        name: "DEFINE IMAGE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Image widget definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-IMAGE-statement.html",
    },
    {
        name: "DEFINE MENU",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Menu definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-MENU-statement.html",
    },
    {
        name: "DEFINE PARAMETER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "parameter_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-PARAMETER-statement.html",
    },
    {
        name: "DEFINE PROPERTY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "property_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-PROPERTY-statement.html",
    },
    {
        name: "DEFINE QUERY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "query_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-QUERY-statement.html",
    },
    {
        name: "DEFINE RECTANGLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "rectangle_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-RECTANGLE-statement.html",
    },
    {
        name: "DEFINE STREAM",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "stream_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-STREAM-statement.html",
    },
    {
        name: "DEFINE SUB-MENU",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Sub-menu definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-SUB-MENU-statement.html",
    },
    {
        name: "DEFINE TEMP-TABLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "temp_table_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-TEMP-TABLE-statement.html",
    },
    {
        name: "DEFINE VARIABLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "variable_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-VARIABLE-statement.html",
    },
    {
        name: "DEFINE WORK-TABLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "workfile_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-WORK-TABLE-statement.html",
    },
    {
        name: "DELETE (record)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Partial,
        grammarRule: "abl_statement",
        notes: "Parsed as generic abl_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DELETE-statement.html",
    },
    {
        name: "DELETE ALIAS",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DELETE-ALIAS-statement.html",
    },
    {
        name: "DELETE OBJECT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DELETE-OBJECT-statement.html",
    },
    {
        name: "DELETE PROCEDURE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DELETE-PROCEDURE-statement.html",
    },
    {
        name: "DELETE WIDGET",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DELETE-WIDGET-statement.html",
    },
    {
        name: "DELETE WIDGET-POOL",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DELETE-WIDGET-POOL-statement.html",
    },
    {
        name: "DESTRUCTOR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "destructor_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DESTRUCTOR-statement.html",
    },
    {
        name: "DISABLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Disable widgets/triggers",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DISABLE-statement.html",
    },
    {
        name: "DISABLE TRIGGERS",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DISABLE-TRIGGERS-statement.html",
    },
    {
        name: "DISCONNECT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Database disconnect",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DISCONNECT-statement.html",
    },
    {
        name: "DISPLAY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Display data in frame",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DISPLAY-statement.html",
    },
    {
        name: "DO",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "do_block",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DO-statement.html",
    },
    {
        name: "DOWN",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Move cursor down in frame",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DOWN-statement.html",
    },

    // E
    {
        name: "EMPTY TEMP-TABLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/EMPTY-TEMP-TABLE-statement.html",
    },
    {
        name: "ENABLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Enable widgets",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ENABLE-statement.html",
    },
    {
        name: "ENTRY (function)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotApplicable,
        notes: "Built-in function, not statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ENTRY-function.html",
    },
    {
        name: "ENUM",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "enum_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ENUM-statement.html",
    },
    {
        name: "EXPORT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Export data to stream",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/EXPORT-statement.html",
    },

    // F
    {
        name: "FINALLY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "finally_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FINALLY-statement.html",
    },
    {
        name: "FIND",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "find_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FIND-statement.html",
    },
    {
        name: "FIX-CODEPAGE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FIX-CODEPAGE-statement.html",
    },
    {
        name: "FOR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "for_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FOR-statement.html",
    },
    {
        name: "FORM",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Form definition for frames",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FORM-statement.html",
    },
    {
        name: "FORMAT (phrase)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_format",
        notes: "Supported as phrase within definitions",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FORMAT-phrase.html",
    },
    {
        name: "FUNCTION",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "function_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FUNCTION-statement.html",
    },
    {
        name: "FUNCTION (FORWARD)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "function_statement",
        notes: "FORWARD option supported",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FUNCTION-statement.html",
    },

    // G
    {
        name: "GET",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Get record from query",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/GET-statement.html",
    },
    {
        name: "GET-KEY-VALUE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/GET-KEY-VALUE-statement.html",
    },

    // H
    {
        name: "HIDE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Hide widget/frame",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/HIDE-statement.html",
    },

    // I
    {
        name: "IF...THEN...ELSE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "if_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/IF...THEN...ELSE-statement.html",
    },
    {
        name: "IMPORT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Import data from stream",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/IMPORT-statement.html",
    },
    {
        name: "INPUT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "input_output_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INPUT-statement.html",
    },
    {
        name: "INPUT-OUTPUT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "input_output_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INPUT-OUTPUT-statement.html",
    },
    {
        name: "INSERT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Insert record with UI",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INSERT-statement.html",
    },
    {
        name: "INTERFACE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "interface_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INTERFACE-statement.html",
    },

    // L
    {
        name: "LEAVE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "action_phrase",
        notes: "Part of UNDO statement or standalone",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/LEAVE-statement.html",
    },
    {
        name: "LENGTH (function)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotApplicable,
        notes: "Built-in function, not statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/LENGTH-function.html",
    },
    {
        name: "LOAD",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Load INI file settings",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/LOAD-statement.html",
    },
    {
        name: "LOAD-PICTURE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/LOAD-PICTURE-statement.html",
    },
    {
        name: "LOG-MANAGER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Logging configuration",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/LOG-MANAGER-statement.html",
    },

    // M
    {
        name: "MESSAGE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "message_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/MESSAGE-statement.html",
    },
    {
        name: "METHOD",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "method_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/METHOD-statement.html",
    },

    // N
    {
        name: "NEXT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "action_phrase",
        notes: "Part of UNDO statement or standalone",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/NEXT-statement.html",
    },
    {
        name: "NEXT-PROMPT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Set next input field",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/NEXT-PROMPT-statement.html",
    },

    // O
    {
        name: "ON",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "on_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ON-statement.html",
    },
    {
        name: "OPEN QUERY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OPEN-QUERY-statement.html",
    },
    {
        name: "OS-APPEND",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OS-APPEND-statement.html",
    },
    {
        name: "OS-COMMAND",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OS-COMMAND-statement.html",
    },
    {
        name: "OS-COPY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OS-COPY-statement.html",
    },
    {
        name: "OS-CREATE-DIR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OS-CREATE-DIR-statement.html",
    },
    {
        name: "OS-DELETE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OS-DELETE-statement.html",
    },
    {
        name: "OS-RENAME",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OS-RENAME-statement.html",
    },
    {
        name: "OUTPUT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "input_output_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OUTPUT-statement.html",
    },
    {
        name: "OVERLAY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "String overlay assignment",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/OVERLAY-statement.html",
    },

    // P
    {
        name: "PAGE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Page break in stream",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PAGE-statement.html",
    },
    {
        name: "PAUSE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PAUSE-statement.html",
    },
    {
        name: "PROCEDURE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "procedure_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PROCEDURE-statement.html",
    },
    {
        name: "PROCESS EVENTS",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PROCESS-EVENTS-statement.html",
    },
    {
        name: "PROMPT-FOR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "prompt_for_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PROMPT-FOR-statement.html",
    },
    {
        name: "PUBLISH",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Publish event",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PUBLISH-statement.html",
    },
    {
        name: "PUT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Write to stream",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PUT-statement.html",
    },
    {
        name: "PUT CURSOR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PUT-CURSOR-statement.html",
    },
    {
        name: "PUT-KEY-VALUE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PUT-KEY-VALUE-statement.html",
    },

    // Q
    {
        name: "QUIT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/QUIT-statement.html",
    },

    // R
    {
        name: "RAW-TRANSFER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RAW-TRANSFER-statement.html",
    },
    {
        name: "READKEY",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/READKEY-statement.html",
    },
    {
        name: "RELEASE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "release_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RELEASE-statement.html",
    },
    {
        name: "RELEASE EXTERNAL",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RELEASE-EXTERNAL-statement.html",
    },
    {
        name: "RELEASE OBJECT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RELEASE-OBJECT-statement.html",
    },
    {
        name: "REPEAT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "repeat_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/REPEAT-statement.html",
    },
    {
        name: "REPOSITION",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/REPOSITION-statement.html",
    },
    {
        name: "RETURN",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "return_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RETURN-statement.html",
    },
    {
        name: "REVERT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "on_statement",
        notes: "Supported as part of ON statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/REVERT-statement.html",
    },
    {
        name: "ROUTINE-LEVEL ON ERROR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "error_scope_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ROUTINE-LEVEL-statement.html",
    },
    {
        name: "RUN",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "run_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RUN-statement.html",
    },
    {
        name: "RUN STORED-PROCEDURE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "DataServer feature",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RUN-STORED-PROCEDURE-statement.html",
    },
    {
        name: "RUN SUPER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "run_statement",
        notes: "Supported via run_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RUN-SUPER-statement.html",
    },

    // S
    {
        name: "SAVE CACHE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SAVE-CACHE-statement.html",
    },
    {
        name: "SCROLL",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Scroll frame",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SCROLL-statement.html",
    },
    {
        name: "SEEK",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Seek position in stream",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SEEK-statement.html",
    },
    {
        name: "SET",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Set variable from user input",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SET-statement.html",
    },
    {
        name: "SET-BREAK-TABLE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SET-BREAK-TABLE-statement.html",
    },
    {
        name: "STOP",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/STOP-statement.html",
    },
    {
        name: "STATUS",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Set status line",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/STATUS-statement.html",
    },
    {
        name: "SUBSCRIBE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Subscribe to event",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SUBSCRIBE-statement.html",
    },
    {
        name: "SUBSTRING (statement)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Substring assignment",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SUBSTRING-statement.html",
    },
    {
        name: "SUPER",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "function_call",
        notes: "Parsed as function call",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SUPER-statement.html",
    },
    {
        name: "SYSTEM-DIALOG COLOR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SYSTEM-DIALOG-COLOR-statement.html",
    },
    {
        name: "SYSTEM-DIALOG FONT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SYSTEM-DIALOG-FONT-statement.html",
    },
    {
        name: "SYSTEM-DIALOG GET-DIR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SYSTEM-DIALOG-GET-DIR-statement.html",
    },
    {
        name: "SYSTEM-DIALOG GET-FILE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SYSTEM-DIALOG-GET-FILE-statement.html",
    },
    {
        name: "SYSTEM-DIALOG PRINTER-SETUP",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SYSTEM-DIALOG-PRINTER-SETUP-statement.html",
    },

    // T
    {
        name: "THIS-OBJECT",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "function_call",
        notes: "Parsed as identifier/function call",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/THIS-OBJECT-statement.html",
    },
    {
        name: "THROW",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "undo_statement",
        notes: "Supported as part of UNDO...THROW",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/THROW-statement.html",
    },
    {
        name: "TRIGGERS (phrase/block)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "TRIGGERS block for browse",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/TRIGGERS-phrase.html",
    },

    // U
    {
        name: "UNDO",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "undo_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UNDO-statement.html",
    },
    {
        name: "UNDERLINE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Underline output",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UNDERLINE-statement.html",
    },
    {
        name: "UNLOAD",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Unload INI settings",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UNLOAD-statement.html",
    },
    {
        name: "UNSUBSCRIBE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Unsubscribe from event",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UNSUBSCRIBE-statement.html",
    },
    {
        name: "UP",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Move cursor up in frame",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UP-statement.html",
    },
    {
        name: "UPDATE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "update_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UPDATE-statement.html",
    },
    {
        name: "USE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Use index for query",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/USE-statement.html",
    },
    {
        name: "USING",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "using_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/USING-statement.html",
    },

    // V
    {
        name: "VALIDATE",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Validate record",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/VALIDATE-statement.html",
    },
    {
        name: "VIEW",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "View frame/widget",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/VIEW-statement.html",
    },

    // W
    {
        name: "WAIT-FOR",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Wait for event",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/WAIT-FOR-statement.html",
    },

    // Assignment shorthand
    {
        name: "Variable Assignment (=)",
        category: DocCategory.Statement,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "variable_assignment",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/Assignment-statement.html",
    },
];

// =============================================================================
// DATA TYPES (from ABL Reference)
// =============================================================================
export const documentedDataTypes: DocumentedFeature[] = [
    {
        name: "CHARACTER",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CHARACTER.html",
    },
    {
        name: "COM-HANDLE",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/COM-HANDLE.html",
    },
    {
        name: "DATE",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DATE.html",
    },
    {
        name: "DATETIME",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DATETIME.html",
    },
    {
        name: "DATETIME-TZ",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DATETIME-TZ.html",
    },
    {
        name: "DECIMAL",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DECIMAL.html",
    },
    {
        name: "HANDLE",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/HANDLE.html",
    },
    {
        name: "INT64",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INT64.html",
    },
    {
        name: "INTEGER",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INTEGER.html",
    },
    {
        name: "LOGICAL",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/LOGICAL.html",
    },
    {
        name: "LONGCHAR",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/LONGCHAR.html",
    },
    {
        name: "MEMPTR",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/MEMPTR.html",
    },
    {
        name: "RAW",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RAW.html",
    },
    {
        name: "RECID",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RECID.html",
    },
    {
        name: "ROWID",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "primitive_type",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ROWID.html",
    },
    {
        name: "Class types",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "class_type",
        notes: "User-defined class types",
    },
    {
        name: "BLOB",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Partial,
        notes: "Recognized in field definitions",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/BLOB.html",
    },
    {
        name: "CLOB",
        category: DocCategory.DataType,
        parserStatus: ParserCoverage.Partial,
        notes: "Recognized in field definitions",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CLOB.html",
    },
];

// =============================================================================
// OPERATORS (from ABL Reference)
// =============================================================================
export const documentedOperators: DocumentedFeature[] = [
    // Arithmetic
    {
        name: "+ (addition)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_additive_operator",
    },
    {
        name: "- (subtraction)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_additive_operator",
    },
    {
        name: "* (multiplication)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_multiplicative_operator",
    },
    {
        name: "/ (division)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_multiplicative_operator",
    },
    {
        name: "MODULO",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_multiplicative_operator",
    },

    // Comparison
    {
        name: "= (equals)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "<> (not equals)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "< (less than)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "> (greater than)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "<= (less or equal)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: ">= (greater or equal)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "EQ",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "NE",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "LT",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "GT",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "LE",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "GE",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "BEGINS",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "MATCHES",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },
    {
        name: "CONTAINS",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_comparison_operator",
    },

    // Logical
    {
        name: "AND",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_logical_operator",
    },
    {
        name: "OR",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_logical_operator",
    },
    {
        name: "NOT",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "unary_expression",
    },

    // String
    {
        name: "+ (string concat)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "additive_expression",
        notes: "Same as arithmetic +",
    },

    // Assignment
    {
        name: "= (assignment)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "assignment_operator",
    },
    {
        name: "+= (add assign)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_augmented_assignment",
    },
    {
        name: "-= (subtract assign)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_augmented_assignment",
    },
    {
        name: "*= (multiply assign)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_augmented_assignment",
    },
    {
        name: "/= (divide assign)",
        category: DocCategory.Operator,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "_augmented_assignment",
    },
];

// =============================================================================
// PREPROCESSOR DIRECTIVES
// =============================================================================
export const documentedPreprocessor: DocumentedFeature[] = [
    {
        name: "&GLOBAL-DEFINE",
        category: DocCategory.Preprocessor,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "preprocessor_directive",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/GLOBAL-DEFINE-preprocessor-directive.html",
    },
    {
        name: "&SCOPED-DEFINE",
        category: DocCategory.Preprocessor,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "preprocessor_directive",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/SCOPED-DEFINE-preprocessor-directive.html",
    },
    {
        name: "&UNDEFINE",
        category: DocCategory.Preprocessor,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "preprocessor_directive",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UNDEFINE-preprocessor-directive.html",
    },
    {
        name: "&IF...&THEN...&ELSE...&ENDIF",
        category: DocCategory.Preprocessor,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "preprocessor_directive",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/IF-preprocessor-directive.html",
    },
    {
        name: "&MESSAGE",
        category: DocCategory.Preprocessor,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "preprocessor_directive",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/MESSAGE-preprocessor-directive.html",
    },
    {
        name: "&ANALYZE-SUSPEND/RESUME",
        category: DocCategory.Preprocessor,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "preprocessor_directive",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ANALYZE-SUSPEND-preprocessor-directive.html",
    },
    {
        name: "{ } Include",
        category: DocCategory.Preprocessor,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "include",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/Include-file-reference.html",
    },
    {
        name: "{ } Named arguments",
        category: DocCategory.Preprocessor,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "include_argument",
        notes: "{&name} style references",
    },
];

// =============================================================================
// OBJECT-ORIENTED FEATURES
// =============================================================================
export const documentedOOFeatures: DocumentedFeature[] = [
    {
        name: "CLASS",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "class_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CLASS-statement.html",
    },
    {
        name: "INTERFACE",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "interface_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INTERFACE-statement.html",
    },
    {
        name: "ENUM",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "enum_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ENUM-statement.html",
    },
    {
        name: "INHERITS",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "inherits",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INHERITS-option.html",
    },
    {
        name: "IMPLEMENTS",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "implements",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/IMPLEMENTS-option.html",
    },
    {
        name: "METHOD",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "method_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/METHOD-statement.html",
    },
    {
        name: "CONSTRUCTOR",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "constructor_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CONSTRUCTOR-statement.html",
    },
    {
        name: "DESTRUCTOR",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "destructor_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DESTRUCTOR-statement.html",
    },
    {
        name: "PROPERTY (GET/SET)",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "property_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-PROPERTY-statement.html",
    },
    {
        name: "NEW (object creation)",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "new_expression",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/NEW-function.html",
    },
    {
        name: "DYNAMIC-NEW",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "new_expression",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DYNAMIC-NEW-statement.html",
    },
    {
        name: "CAST",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.NotSupported,
        notes: "Type casting",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CAST-function.html",
    },
    {
        name: ": (object access)",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "object_access",
        notes: "obj:property syntax",
    },
    {
        name: ":: (static access)",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "member_access",
        notes: "Class::member syntax",
    },
    {
        name: "THIS-OBJECT",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "identifier",
        notes: "Keyword recognized",
    },
    {
        name: "SUPER",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "function_call",
        notes: "Parsed as identifier",
    },
    {
        name: "ABSTRACT",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "member_modifier",
    },
    {
        name: "OVERRIDE",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "member_modifier",
    },
    {
        name: "FINAL",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "member_modifier",
    },
    {
        name: "STATIC",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "scope_tuning",
    },
    {
        name: "Access modifiers (PUBLIC/PRIVATE/PROTECTED)",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "access_tuning",
    },
    {
        name: "SERIALIZABLE",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "serialization_tuning",
    },
    {
        name: "Generic types (<T>)",
        category: DocCategory.ObjectOriented,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "generic_type",
        notes: "Progress.Collections.List<T>",
    },
];

// =============================================================================
// ERROR HANDLING
// =============================================================================
export const documentedErrorHandling: DocumentedFeature[] = [
    {
        name: "CATCH",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "catch_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CATCH-statement.html",
    },
    {
        name: "FINALLY",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "finally_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FINALLY-statement.html",
    },
    {
        name: "THROW",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "undo_statement",
        notes: "Part of UNDO...THROW",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/THROW-statement.html",
    },
    {
        name: "UNDO",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "undo_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UNDO-statement.html",
    },
    {
        name: "ROUTINE-LEVEL ON ERROR",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "error_scope_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ROUTINE-LEVEL-statement.html",
    },
    {
        name: "BLOCK-LEVEL ON ERROR",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "error_scope_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/BLOCK-LEVEL-statement.html",
    },
    {
        name: "ON ERROR phrase",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "on_error_phrase",
    },
    {
        name: "ON STOP phrase",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "on_stop_phrase",
    },
    {
        name: "ON QUIT phrase",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "on_quit_phrase",
    },
    {
        name: "ON ENDKEY phrase",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "on_endkey_phrase",
    },
    {
        name: "NO-ERROR option",
        category: DocCategory.ErrorHandling,
        parserStatus: ParserCoverage.Supported,
        grammarRule: "query_tuning",
        notes: "Supported in various contexts",
    },
];

// =============================================================================
// ALL DOCUMENTED FEATURES
// =============================================================================
export const allDocumentedFeatures: DocumentedFeature[] = [
    ...documentedStatements,
    ...documentedDataTypes,
    ...documentedOperators,
    ...documentedPreprocessor,
    ...documentedOOFeatures,
    ...documentedErrorHandling,
];

/**
 * Get features by category
 */
export function getDocFeaturesByCategory(category: DocCategory): DocumentedFeature[] {
    return allDocumentedFeatures.filter((f) => f.category === category);
}

/**
 * Get features by parser status
 */
export function getDocFeaturesByStatus(status: ParserCoverage): DocumentedFeature[] {
    return allDocumentedFeatures.filter((f) => f.parserStatus === status);
}

/**
 * Get applicable features (excludes NotApplicable)
 */
export function getApplicableDocFeatures(): DocumentedFeature[] {
    return allDocumentedFeatures.filter((f) => f.parserStatus !== ParserCoverage.NotApplicable);
}

/**
 * Get missing features from documentation
 */
export function getMissingDocFeatures(): DocumentedFeature[] {
    return allDocumentedFeatures.filter((f) => f.parserStatus === ParserCoverage.NotSupported);
}
