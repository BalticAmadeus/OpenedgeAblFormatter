/**
 * Progress OpenEdge ABL Language Reference - Parser Coverage
 * 
 * This file contains detailed coverage tracking of ABL language features
 * from official Progress OpenEdge documentation, showing:
 * 1. Whether tree-sitter-abl has a dedicated grammar rule
 * 2. Which keywords/options within each statement are supported
 * 3. What falls through to the generic abl_statement catch-all
 * 
 * Source: Progress OpenEdge ABL Reference
 * https://docs.progress.com/bundle/abl-reference/
 */

export enum ParserSupport {
    /** Has dedicated grammar rule with full/most keyword support */
    Full = "full",
    /** Has dedicated grammar rule but missing some keywords/options */
    Partial = "partial",
    /** Parses via generic abl_statement (no structural understanding) */
    Generic = "generic",
    /** Cannot be parsed at all */
    None = "none",
    /** Not applicable for parsing (runtime-only, deprecated, etc.) */
    NotApplicable = "not-applicable",
}

export enum DocCategory {
    Statement = "statement",
    Definition = "definition",
    Block = "block",
    DataType = "data-type",
    Operator = "operator",
    Preprocessor = "preprocessor",
    ObjectOriented = "object-oriented",
    ErrorHandling = "error-handling",
    Expression = "expression",
    Other = "other",
}

export interface KeywordSupport {
    keyword: string;
    supported: boolean;
    grammarRule?: string;
    notes?: string;
}

export interface DocumentedFeature {
    name: string;
    category: DocCategory;
    support: ParserSupport;
    grammarRule?: string;
    supportedKeywords?: KeywordSupport[];
    notes?: string;
    docLink?: string;
}

// =============================================================================
// STATEMENTS WITH DEDICATED GRAMMAR RULES (Full or Partial support)
// =============================================================================

export const statementsWithDedicatedRules: DocumentedFeature[] = [
    {
        name: "ACCUMULATE",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "accumulate_statement",
        supportedKeywords: [
            { keyword: "AVERAGE", supported: true },
            { keyword: "COUNT", supported: true },
            { keyword: "MAXIMUM", supported: true },
            { keyword: "MINIMUM", supported: true },
            { keyword: "TOTAL", supported: true },
            { keyword: "SUB-AVERAGE", supported: true },
            { keyword: "SUB-COUNT", supported: true },
            { keyword: "SUB-MAXIMUM", supported: true },
            { keyword: "SUB-MINIMUM", supported: true },
            { keyword: "SUB-TOTAL", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ACCUMULATE-statement.html",
    },
    {
        name: "ASSIGN",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "assign_statement",
        supportedKeywords: [
            { keyword: "NO-ERROR", supported: true },
            { keyword: "Multiple assignments", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ASSIGN-statement.html",
    },
    {
        name: "CASE",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "case_statement",
        supportedKeywords: [
            { keyword: "WHEN", supported: true },
            { keyword: "OR WHEN", supported: true },
            { keyword: "THEN", supported: true },
            { keyword: "OTHERWISE", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CASE-statement.html",
    },
    {
        name: "CATCH",
        category: DocCategory.ErrorHandling,
        support: ParserSupport.Full,
        grammarRule: "catch_statement",
        supportedKeywords: [
            { keyword: "AS", supported: true },
            { keyword: "CLASS", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CATCH-statement.html",
    },
    {
        name: "DO",
        category: DocCategory.Block,
        support: ParserSupport.Full,
        grammarRule: "do_block",
        supportedKeywords: [
            { keyword: "FOR", supported: true },
            { keyword: "PRESELECT", supported: true },
            { keyword: "TO/BY", supported: true },
            { keyword: "WHILE", supported: true },
            { keyword: "STOP-AFTER", supported: true },
            { keyword: "TRANSACTION", supported: true },
            { keyword: "ON ERROR", supported: true },
            { keyword: "ON STOP", supported: true },
            { keyword: "ON QUIT", supported: true },
            { keyword: "ON ENDKEY", supported: true },
            { keyword: "WITH FRAME", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DO-statement.html",
    },
    {
        name: "FINALLY",
        category: DocCategory.ErrorHandling,
        support: ParserSupport.Full,
        grammarRule: "finally_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FINALLY-statement.html",
    },
    {
        name: "FIND",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "find_statement",
        supportedKeywords: [
            { keyword: "FIRST", supported: true },
            { keyword: "LAST", supported: true },
            { keyword: "NEXT", supported: true },
            { keyword: "PREV", supported: true },
            { keyword: "CURRENT", supported: true },
            { keyword: "WHERE", supported: true },
            { keyword: "OF", supported: true },
            { keyword: "NO-LOCK", supported: true },
            { keyword: "SHARE-LOCK", supported: true },
            { keyword: "EXCLUSIVE-LOCK", supported: true },
            { keyword: "NO-WAIT", supported: true },
            { keyword: "NO-ERROR", supported: true },
            { keyword: "USE-INDEX", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FIND-statement.html",
    },
    {
        name: "FOR",
        category: DocCategory.Block,
        support: ParserSupport.Full,
        grammarRule: "for_statement",
        supportedKeywords: [
            { keyword: "EACH/FIRST/LAST", supported: true },
            { keyword: "WHERE", supported: true },
            { keyword: "BY (sort)", supported: true },
            { keyword: "BREAK BY", supported: true },
            { keyword: "WHILE", supported: true },
            { keyword: "ON ERROR/STOP/QUIT/ENDKEY", supported: true },
            { keyword: "WITH FRAME", supported: true },
            { keyword: "Query tuning (locks)", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FOR-statement.html",
    },
    {
        name: "FUNCTION",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "function_statement",
        supportedKeywords: [
            { keyword: "RETURNS/RETURN", supported: true },
            { keyword: "FORWARD", supported: true },
            { keyword: "IN <procedure>", supported: true },
            { keyword: "EXTENT", supported: true },
            { keyword: "Parameters", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/FUNCTION-statement.html",
    },
    {
        name: "IF...THEN...ELSE",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "if_statement",
        supportedKeywords: [
            { keyword: "IF", supported: true },
            { keyword: "THEN", supported: true },
            { keyword: "ELSE", supported: true },
            { keyword: "ELSE IF", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/IF...THEN...ELSE-statement.html",
    },
    {
        name: "INPUT/OUTPUT",
        category: DocCategory.Statement,
        support: ParserSupport.Partial,
        grammarRule: "input_output_statement",
        supportedKeywords: [
            { keyword: "STREAM", supported: true },
            { keyword: "STREAM-HANDLE", supported: true },
            { keyword: "CLOSE", supported: true },
            { keyword: "FROM/TO", supported: true },
            { keyword: "APPEND", supported: true },
            { keyword: "BINARY", supported: true },
            { keyword: "PAGED", supported: true },
            { keyword: "THROUGH", supported: false, notes: "Piping not supported" },
            { keyword: "TERMINAL", supported: false },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INPUT-statement.html",
    },
    {
        name: "MESSAGE",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "message_statement",
        supportedKeywords: [
            { keyword: "SKIP", supported: true },
            { keyword: "VIEW-AS ALERT-BOX", supported: true },
            { keyword: "BUTTONS", supported: true },
            { keyword: "TITLE", supported: true },
            { keyword: "UPDATE/SET", supported: true },
            { keyword: "IN WINDOW", supported: true },
            { keyword: "NO-ERROR", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/MESSAGE-statement.html",
    },
    {
        name: "ON",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "on_statement",
        supportedKeywords: [
            { keyword: "Widget events", supported: true },
            { keyword: "Database triggers", supported: true },
            { keyword: "CREATE/DELETE/FIND/WRITE/ASSIGN OF", supported: true },
            { keyword: "REFERENCING NEW/OLD", supported: true },
            { keyword: "OVERRIDE", supported: true },
            { keyword: "REVERT", supported: true },
            { keyword: "PERSISTENT RUN", supported: true },
            { keyword: "ANYWHERE", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ON-statement.html",
    },
    {
        name: "PROCEDURE",
        category: DocCategory.Statement,
        support: ParserSupport.Partial,
        grammarRule: "procedure_statement",
        supportedKeywords: [
            { keyword: "PRIVATE", supported: true },
            { keyword: "EXTERNAL", supported: false, notes: "DLL calls not supported" },
            { keyword: "IN SUPER", supported: false },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/PROCEDURE-statement.html",
    },
    {
        name: "RELEASE",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "release_statement",
        supportedKeywords: [
            { keyword: "NO-ERROR", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RELEASE-statement.html",
    },
    {
        name: "REPEAT",
        category: DocCategory.Block,
        support: ParserSupport.Full,
        grammarRule: "repeat_statement",
        supportedKeywords: [
            { keyword: "TO/BY", supported: true },
            { keyword: "WHILE", supported: true },
            { keyword: "PRESELECT", supported: true },
            { keyword: "WITH FRAME", supported: true },
            { keyword: "ON ERROR/STOP/QUIT/ENDKEY", supported: true },
            { keyword: "Label:", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/REPEAT-statement.html",
    },
    {
        name: "RETURN",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "return_statement",
        supportedKeywords: [
            { keyword: "ERROR", supported: true },
            { keyword: "NO-APPLY", supported: true },
            { keyword: "Return value (all types)", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RETURN-statement.html",
    },
    {
        name: "RUN",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "run_statement",
        supportedKeywords: [
            { keyword: "Arguments", supported: true },
            { keyword: "PERSISTENT", supported: true },
            { keyword: "SINGLE-RUN", supported: true },
            { keyword: "SINGLETON", supported: true },
            { keyword: "ASYNCHRONOUS", supported: true },
            { keyword: "SET <handle>", supported: true },
            { keyword: "ON SERVER", supported: true },
            { keyword: "IN <procedure>", supported: true },
            { keyword: "EVENT-PROCEDURE", supported: true },
            { keyword: "NO-ERROR", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/RUN-statement.html",
    },
    {
        name: "UNDO",
        category: DocCategory.ErrorHandling,
        support: ParserSupport.Full,
        grammarRule: "undo_statement",
        supportedKeywords: [
            { keyword: "LEAVE", supported: true },
            { keyword: "NEXT", supported: true },
            { keyword: "RETRY", supported: true },
            { keyword: "RETURN", supported: true },
            { keyword: "THROW", supported: true },
            { keyword: "Label reference", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/UNDO-statement.html",
    },
    {
        name: "USING",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "using_statement",
        supportedKeywords: [
            { keyword: "FROM ASSEMBLY", supported: true },
            { keyword: "FROM PROPATH", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/USING-statement.html",
    },
    {
        name: "Variable Assignment (=)",
        category: DocCategory.Statement,
        support: ParserSupport.Full,
        grammarRule: "variable_assignment",
        supportedKeywords: [
            { keyword: "= (equals)", supported: true },
            { keyword: "+= -= *= /=", supported: true },
            { keyword: "WHEN", supported: true },
            { keyword: "IN FRAME", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/Assignment-statement.html",
    },
];

// =============================================================================
// DEFINITIONS WITH DEDICATED GRAMMAR RULES
// =============================================================================

export const definitionsWithDedicatedRules: DocumentedFeature[] = [
    {
        name: "DEFINE BROWSE",
        category: DocCategory.Definition,
        support: ParserSupport.Partial,
        grammarRule: "browse_definition",
        supportedKeywords: [
            { keyword: "QUERY", supported: true },
            { keyword: "DISPLAY", supported: true },
            { keyword: "WITH options", supported: true },
            { keyword: "ENABLE", supported: false },
            { keyword: "Columns definition", supported: false, notes: "Limited column options" },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-BROWSE-statement.html",
    },
    {
        name: "DEFINE BUFFER",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "buffer_definition",
        supportedKeywords: [
            { keyword: "FOR", supported: true },
            { keyword: "TEMP-TABLE", supported: true },
            { keyword: "Access tuning", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-BUFFER-statement.html",
    },
    {
        name: "DEFINE DATASET",
        category: DocCategory.Definition,
        support: ParserSupport.Partial,
        grammarRule: "dataset_definition",
        supportedKeywords: [
            { keyword: "FOR", supported: true },
            { keyword: "DATA-RELATION", supported: true },
            { keyword: "RELATION-FIELDS", supported: true },
            { keyword: "NAMESPACE-URI", supported: false },
            { keyword: "NAMESPACE-PREFIX", supported: false },
            { keyword: "PARENT-ID-RELATION", supported: false },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-DATASET-statement.html",
    },
    {
        name: "DEFINE DATA-SOURCE",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "data_source_definition",
        supportedKeywords: [
            { keyword: "FOR", supported: true },
            { keyword: "QUERY", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-DATA-SOURCE-statement.html",
    },
    {
        name: "DEFINE EVENT",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "event_definition",
        supportedKeywords: [
            { keyword: "SIGNATURE VOID", supported: true },
            { keyword: "DELEGATE", supported: true },
            { keyword: "Parameters", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-EVENT-statement.html",
    },
    {
        name: "DEFINE FRAME",
        category: DocCategory.Definition,
        support: ParserSupport.Partial,
        grammarRule: "frame_definition",
        supportedKeywords: [
            { keyword: "WITH SIZE", supported: true },
            { keyword: "SIZE-PIXELS", supported: true },
            { keyword: "NO-BOX", supported: true },
            { keyword: "FONT/BGCOLOR/FGCOLOR", supported: true },
            { keyword: "AT COLUMN/ROW", supported: true },
            { keyword: "Field definitions", supported: false, notes: "Limited field layout" },
            { keyword: "Header/footer", supported: false },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-FRAME-statement.html",
    },
    {
        name: "DEFINE PARAMETER",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "parameter_definition",
        supportedKeywords: [
            { keyword: "INPUT/OUTPUT/INPUT-OUTPUT/RETURN", supported: true },
            { keyword: "AS/LIKE", supported: true },
            { keyword: "BUFFER", supported: true },
            { keyword: "TABLE/TABLE-HANDLE", supported: true },
            { keyword: "DATASET/DATASET-HANDLE", supported: true },
            { keyword: "APPEND/BIND/BY-VALUE/BY-REFERENCE", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-PARAMETER-statement.html",
    },
    {
        name: "DEFINE PROPERTY",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "property_definition",
        supportedKeywords: [
            { keyword: "AS/LIKE", supported: true },
            { keyword: "GET", supported: true },
            { keyword: "SET", supported: true },
            { keyword: "Access modifiers", supported: true },
            { keyword: "INITIAL", supported: true },
            { keyword: "EXTENT", supported: true },
            { keyword: "NO-UNDO", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-PROPERTY-statement.html",
    },
    {
        name: "DEFINE QUERY",
        category: DocCategory.Definition,
        support: ParserSupport.Partial,
        grammarRule: "query_definition",
        supportedKeywords: [
            { keyword: "FOR", supported: true },
            { keyword: "FIELDS/EXCEPT", supported: true },
            { keyword: "CACHE", supported: true },
            { keyword: "SCROLLING", supported: true },
            { keyword: "PRESELECT", supported: false },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-QUERY-statement.html",
    },
    {
        name: "DEFINE STREAM",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "stream_definition",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-STREAM-statement.html",
    },
    {
        name: "DEFINE TEMP-TABLE",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "temp_table_definition",
        supportedKeywords: [
            { keyword: "NO-UNDO", supported: true },
            { keyword: "SERIALIZE-NAME", supported: true },
            { keyword: "REFERENCE-ONLY", supported: true },
            { keyword: "LIKE", supported: true },
            { keyword: "LIKE-SEQUENTIAL", supported: true },
            { keyword: "USE-INDEX", supported: true },
            { keyword: "BEFORE-TABLE", supported: true },
            { keyword: "FIELD", supported: true },
            { keyword: "INDEX", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-TEMP-TABLE-statement.html",
    },
    {
        name: "DEFINE VARIABLE",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "variable_definition",
        supportedKeywords: [
            { keyword: "AS/LIKE", supported: true },
            { keyword: "INITIAL/INIT", supported: true },
            { keyword: "EXTENT", supported: true },
            { keyword: "NO-UNDO", supported: true },
            { keyword: "FORMAT", supported: true },
            { keyword: "LABEL/COLUMN-LABEL", supported: true },
            { keyword: "SERIALIZE-HIDDEN", supported: true },
            { keyword: "SERIALIZE-NAME", supported: true },
            { keyword: "VIEW-AS widgets", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-VARIABLE-statement.html",
    },
    {
        name: "DEFINE WORK-TABLE",
        category: DocCategory.Definition,
        support: ParserSupport.Full,
        grammarRule: "workfile_definition",
        supportedKeywords: [
            { keyword: "FIELD", supported: true },
            { keyword: "AS/LIKE", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-WORK-TABLE-statement.html",
    },
];

// =============================================================================
// OBJECT-ORIENTED WITH DEDICATED GRAMMAR RULES
// =============================================================================

export const ooWithDedicatedRules: DocumentedFeature[] = [
    {
        name: "CLASS",
        category: DocCategory.ObjectOriented,
        support: ParserSupport.Full,
        grammarRule: "class_statement",
        supportedKeywords: [
            { keyword: "INHERITS", supported: true },
            { keyword: "IMPLEMENTS", supported: true },
            { keyword: "USE-WIDGET-POOL", supported: true },
            { keyword: "ABSTRACT", supported: true },
            { keyword: "FINAL", supported: true },
            { keyword: "SERIALIZABLE", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CLASS-statement.html",
    },
    {
        name: "CONSTRUCTOR",
        category: DocCategory.ObjectOriented,
        support: ParserSupport.Full,
        grammarRule: "constructor_statement",
        supportedKeywords: [
            { keyword: "PUBLIC/PRIVATE/PROTECTED", supported: true },
            { keyword: "STATIC", supported: true },
            { keyword: "Parameters", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/CONSTRUCTOR-statement.html",
    },
    {
        name: "DESTRUCTOR",
        category: DocCategory.ObjectOriented,
        support: ParserSupport.Full,
        grammarRule: "destructor_statement",
        supportedKeywords: [
            { keyword: "PUBLIC", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/DESTRUCTOR-statement.html",
    },
    {
        name: "ENUM",
        category: DocCategory.ObjectOriented,
        support: ParserSupport.Full,
        grammarRule: "enum_statement",
        supportedKeywords: [
            { keyword: "FLAGS", supported: true },
            { keyword: "DEFINE ENUM members", supported: true },
            { keyword: "Member values (=)", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ENUM-statement.html",
    },
    {
        name: "INTERFACE",
        category: DocCategory.ObjectOriented,
        support: ParserSupport.Full,
        grammarRule: "interface_statement",
        supportedKeywords: [
            { keyword: "INHERITS", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/INTERFACE-statement.html",
    },
    {
        name: "METHOD",
        category: DocCategory.ObjectOriented,
        support: ParserSupport.Full,
        grammarRule: "method_statement",
        supportedKeywords: [
            { keyword: "PUBLIC/PRIVATE/PROTECTED", supported: true },
            { keyword: "STATIC", supported: true },
            { keyword: "ABSTRACT", supported: true },
            { keyword: "OVERRIDE", supported: true },
            { keyword: "FINAL", supported: true },
            { keyword: "EXTENT", supported: true },
            { keyword: "Return type", supported: true },
            { keyword: "Parameters", supported: true },
        ],
        docLink: "https://docs.progress.com/bundle/abl-reference/page/METHOD-statement.html",
    },
    {
        name: "VAR statement",
        category: DocCategory.ObjectOriented,
        support: ParserSupport.Full,
        grammarRule: "var_statement",
        supportedKeywords: [
            { keyword: "NEW/GLOBAL/SHARED/STATIC", supported: true },
            { keyword: "PUBLIC/PRIVATE/PROTECTED", supported: true },
            { keyword: "SERIALIZABLE", supported: true },
            { keyword: "Array extents", supported: true },
            { keyword: "Multiple variables", supported: true },
        ],
        notes: "Modern ABL variable declaration syntax",
    },
];

// =============================================================================
// ERROR HANDLING WITH DEDICATED RULES
// =============================================================================

export const errorHandlingWithRules: DocumentedFeature[] = [
    {
        name: "BLOCK-LEVEL ON ERROR",
        category: DocCategory.ErrorHandling,
        support: ParserSupport.Full,
        grammarRule: "error_scope_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/BLOCK-LEVEL-statement.html",
    },
    {
        name: "ROUTINE-LEVEL ON ERROR",
        category: DocCategory.ErrorHandling,
        support: ParserSupport.Full,
        grammarRule: "error_scope_statement",
        docLink: "https://docs.progress.com/bundle/abl-reference/page/ROUTINE-LEVEL-statement.html",
    },
];

// =============================================================================
// STATEMENTS THAT FALL THROUGH TO abl_statement (Generic parsing)
// =============================================================================

export const statementsWithGenericParsing: DocumentedFeature[] = [
    { name: "APPLY", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Event application", docLink: "https://docs.progress.com/bundle/abl-reference/page/APPLY-statement.html" },
    { name: "BELL", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Terminal bell", docLink: "https://docs.progress.com/bundle/abl-reference/page/BELL-statement.html" },
    { name: "BUFFER-COMPARE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/BUFFER-COMPARE-statement.html" },
    { name: "BUFFER-COPY", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/BUFFER-COPY-statement.html" },
    { name: "CALL", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Legacy external call", docLink: "https://docs.progress.com/bundle/abl-reference/page/CALL-statement.html" },
    { name: "CHOOSE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Menu selection", docLink: "https://docs.progress.com/bundle/abl-reference/page/CHOOSE-statement.html" },
    { name: "CLEAR", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/CLEAR-statement.html" },
    { name: "CLOSE QUERY", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/CLOSE-QUERY-statement.html" },
    { name: "COLOR", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/COLOR-statement.html" },
    { name: "COMPILE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Runtime compilation", docLink: "https://docs.progress.com/bundle/abl-reference/page/COMPILE-statement.html" },
    { name: "CONNECT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/CONNECT-statement.html" },
    { name: "COPY-LOB", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/COPY-LOB-statement.html" },
    { name: "CREATE (record)", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Database record creation", docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-statement.html" },
    { name: "CREATE (widget/object)", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Dynamic widget creation", docLink: "https://docs.progress.com/bundle/abl-reference/page/CREATE-widget-statement.html" },
    { name: "DELETE (record)", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/DELETE-statement.html" },
    { name: "DELETE OBJECT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/DELETE-OBJECT-statement.html" },
    { name: "DISABLE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/DISABLE-statement.html" },
    { name: "DISABLE TRIGGERS", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/DISABLE-TRIGGERS-statement.html" },
    { name: "DISCONNECT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/DISCONNECT-statement.html" },
    { name: "DISPLAY", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Major UI statement - no frame structure", docLink: "https://docs.progress.com/bundle/abl-reference/page/DISPLAY-statement.html" },
    { name: "DOWN", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/DOWN-statement.html" },
    { name: "EMPTY TEMP-TABLE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/EMPTY-TEMP-TABLE-statement.html" },
    { name: "ENABLE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/ENABLE-statement.html" },
    { name: "EXPORT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/EXPORT-statement.html" },
    { name: "FIX-CODEPAGE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/FIX-CODEPAGE-statement.html" },
    { name: "FORM", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Form definition", docLink: "https://docs.progress.com/bundle/abl-reference/page/FORM-statement.html" },
    { name: "GET", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Query cursor movement", docLink: "https://docs.progress.com/bundle/abl-reference/page/GET-statement.html" },
    { name: "GET-KEY-VALUE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/GET-KEY-VALUE-statement.html" },
    { name: "HIDE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/HIDE-statement.html" },
    { name: "IMPORT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/IMPORT-statement.html" },
    { name: "INSERT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/INSERT-statement.html" },
    { name: "LOAD", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/LOAD-statement.html" },
    { name: "NEXT-PROMPT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/NEXT-PROMPT-statement.html" },
    { name: "OPEN QUERY", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/OPEN-QUERY-statement.html" },
    { name: "OS-* statements", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "OS-COMMAND, OS-COPY, etc.", docLink: "https://docs.progress.com/bundle/abl-reference/page/OS-COMMAND-statement.html" },
    { name: "OVERLAY", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/OVERLAY-statement.html" },
    { name: "PAGE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/PAGE-statement.html" },
    { name: "PAUSE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/PAUSE-statement.html" },
    { name: "PROCESS EVENTS", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/PROCESS-EVENTS-statement.html" },
    { name: "PUBLISH", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/PUBLISH-statement.html" },
    { name: "PUT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/PUT-statement.html" },
    { name: "PUT-KEY-VALUE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/PUT-KEY-VALUE-statement.html" },
    { name: "QUIT", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/QUIT-statement.html" },
    { name: "RAW-TRANSFER", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/RAW-TRANSFER-statement.html" },
    { name: "READKEY", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/READKEY-statement.html" },
    { name: "REPOSITION", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/REPOSITION-statement.html" },
    { name: "SCROLL", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/SCROLL-statement.html" },
    { name: "SEEK", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/SEEK-statement.html" },
    { name: "SET", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/SET-statement.html" },
    { name: "STATUS", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/STATUS-statement.html" },
    { name: "STOP", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/STOP-statement.html" },
    { name: "SUBSCRIBE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/SUBSCRIBE-statement.html" },
    { name: "SUBSTRING (statement)", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/SUBSTRING-statement.html" },
    { name: "SYSTEM-DIALOG (all)", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "COLOR, FONT, GET-DIR, GET-FILE", docLink: "https://docs.progress.com/bundle/abl-reference/page/SYSTEM-DIALOG-GET-FILE-statement.html" },
    { name: "UNLOAD", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/UNLOAD-statement.html" },
    { name: "UNSUBSCRIBE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/UNSUBSCRIBE-statement.html" },
    { name: "UP", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/UP-statement.html" },
    { name: "UPDATE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "UI record update", docLink: "https://docs.progress.com/bundle/abl-reference/page/UPDATE-statement.html" },
    { name: "VALIDATE", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/VALIDATE-statement.html" },
    { name: "VIEW", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", docLink: "https://docs.progress.com/bundle/abl-reference/page/VIEW-statement.html" },
    { name: "WAIT-FOR", category: DocCategory.Statement, support: ParserSupport.Generic, grammarRule: "abl_statement", notes: "Event loop", docLink: "https://docs.progress.com/bundle/abl-reference/page/WAIT-FOR-statement.html" },
];

// =============================================================================
// DATA TYPES
// =============================================================================

export const dataTypes: DocumentedFeature[] = [
    { name: "CHARACTER/CHAR", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "COM-HANDLE", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "DATE", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "DATETIME", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "DATETIME-TZ", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "DECIMAL", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "HANDLE", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "INT64", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "INTEGER/INT", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "LOGICAL", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "LONGCHAR", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "MEMPTR", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "RAW", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "RECID", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "ROWID", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "VOID", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "primitive_type" },
    { name: "Class types", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "class_type" },
    { name: "Generic types (<T>)", category: DocCategory.DataType, support: ParserSupport.Full, grammarRule: "generic_type" },
];

// =============================================================================
// OPERATORS
// =============================================================================

export const operators: DocumentedFeature[] = [
    { name: "+ (addition)", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_additive_operator" },
    { name: "- (subtraction)", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_additive_operator" },
    { name: "* (multiplication)", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_multiplicative_operator" },
    { name: "/ (division)", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_multiplicative_operator" },
    { name: "MODULO/MOD", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_multiplicative_operator" },
    { name: "= < > <> <= >=", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_comparison_operator" },
    { name: "EQ NE LT GT LE GE", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_comparison_operator" },
    { name: "BEGINS", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_comparison_operator" },
    { name: "MATCHES", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_comparison_operator" },
    { name: "CONTAINS", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_comparison_operator" },
    { name: "AND", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_logical_operator" },
    { name: "OR", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_logical_operator" },
    { name: "NOT", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "unary_expression" },
    { name: "= (assignment)", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "assignment_operator" },
    { name: "+= -= *= /=", category: DocCategory.Operator, support: ParserSupport.Full, grammarRule: "_augmented_assignment" },
];

// =============================================================================
// PREPROCESSOR
// =============================================================================

export const preprocessor: DocumentedFeature[] = [
    { name: "&GLOBAL-DEFINE", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "preprocessor_directive" },
    { name: "&SCOPED-DEFINE", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "preprocessor_directive" },
    { name: "&UNDEFINE", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "preprocessor_directive" },
    { name: "&IF...&THEN...&ELSE...&ENDIF", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "preprocessor_directive" },
    { name: "&MESSAGE", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "preprocessor_directive" },
    { name: "&ANALYZE-SUSPEND/RESUME", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "preprocessor_directive" },
    { name: "{ } Include files", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "include" },
    { name: "{&name} Named arguments", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "include_argument" },
    { name: "{{ }} Constants", category: DocCategory.Preprocessor, support: ParserSupport.Full, grammarRule: "constant" },
];

// =============================================================================
// EXPRESSIONS
// =============================================================================

export const expressions: DocumentedFeature[] = [
    { name: "Ternary (IF...THEN...ELSE)", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "ternary_expression" },
    { name: "CAN-FIND", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "can_find_expression" },
    { name: "AVAILABLE/AVAIL", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "available_expression" },
    { name: "NEW (object creation)", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "new_expression" },
    { name: "DYNAMIC-NEW", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "new_expression" },
    { name: "AMBIGUOUS", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "ambiguous_expression" },
    { name: "CURRENT-CHANGED", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "current_changed_expression" },
    { name: "LOCKED", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "locked_expression" },
    { name: "ACCUM (accumulate)", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "accumulate_expression" },
    { name: "INPUT expression", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "input_expression" },
    { name: "Object access (: colon)", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "object_access" },
    { name: "Static access (::)", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "member_access" },
    { name: "Array access [n]", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "array_access" },
    { name: "Function calls", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "function_call" },
    { name: "Parenthesized", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "parenthesized_expression" },
    { name: "TEMP-TABLE expression", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "temp_table_expression" },
    { name: "DATASET expression", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "dataset_expression" },
    { name: "QUERY expression", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "query_expression" },
    { name: "STREAM expression", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "stream_expression" },
    { name: "BUFFER expression", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "buffer_expression" },
    { name: "CAST", category: DocCategory.Expression, support: ParserSupport.Generic, notes: "Parses as function call" },
    { name: "THIS-OBJECT", category: DocCategory.Expression, support: ParserSupport.Full, grammarRule: "identifier" },
];

// =============================================================================
// DEFINITIONS NOT SUPPORTED
// =============================================================================

export const definitionsNotSupported: DocumentedFeature[] = [
    { name: "DEFINE BUTTON", category: DocCategory.Definition, support: ParserSupport.None, notes: "Button widget not implemented", docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-BUTTON-statement.html" },
    { name: "DEFINE IMAGE", category: DocCategory.Definition, support: ParserSupport.None, notes: "Image widget not implemented", docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-IMAGE-statement.html" },
    { name: "DEFINE MENU", category: DocCategory.Definition, support: ParserSupport.None, notes: "Menu not implemented", docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-MENU-statement.html" },
    { name: "DEFINE SUB-MENU", category: DocCategory.Definition, support: ParserSupport.None, notes: "Sub-menu not implemented", docLink: "https://docs.progress.com/bundle/abl-reference/page/DEFINE-SUB-MENU-statement.html" },
];

// =============================================================================
// ALL DOCUMENTED FEATURES
// =============================================================================

export const allDocumentedFeatures: DocumentedFeature[] = [
    ...statementsWithDedicatedRules,
    ...definitionsWithDedicatedRules,
    ...ooWithDedicatedRules,
    ...errorHandlingWithRules,
    ...statementsWithGenericParsing,
    ...dataTypes,
    ...operators,
    ...preprocessor,
    ...expressions,
    ...definitionsNotSupported,
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getFeaturesByCategory(category: DocCategory): DocumentedFeature[] {
    return allDocumentedFeatures.filter(f => f.category === category);
}

export function getFeaturesBySupport(support: ParserSupport): DocumentedFeature[] {
    return allDocumentedFeatures.filter(f => f.support === support);
}

export function getFeaturesWithDedicatedRules(): DocumentedFeature[] {
    return allDocumentedFeatures.filter(f => 
        f.support === ParserSupport.Full || f.support === ParserSupport.Partial
    );
}

export function getFeaturesWithGenericParsing(): DocumentedFeature[] {
    return allDocumentedFeatures.filter(f => f.support === ParserSupport.Generic);
}

export function getUnsupportedFeatures(): DocumentedFeature[] {
    return allDocumentedFeatures.filter(f => f.support === ParserSupport.None);
}

export function countKeywordSupport(feature: DocumentedFeature): { supported: number; total: number } {
    if (!feature.supportedKeywords) {
        return { supported: 0, total: 0 };
    }
    const supported = feature.supportedKeywords.filter(k => k.supported).length;
    return { supported, total: feature.supportedKeywords.length };
}
