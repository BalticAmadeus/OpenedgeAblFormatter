/**
 * Formatter Coverage Approximation
 *
 * Maps each formatter to the ABL documentation features it is responsible for,
 * and provides an approximated coverage score based on:
 * - Which SyntaxNodeTypes the formatter handles
 * - Which documented keywords/options are properly formatted
 * - Which options fall through to the default (pass-through) behavior
 *
 * NOTE: Scores are manual approximations based on code inspection.
 * "Covered" means the formatter actively reformats/aligns that construct.
 * "Partial" means it passes through but does not actively format.
 * "Missing" means the construct is not handled and may be malformatted.
 */

// =============================================================================
// ENUMS & INTERFACES
// =============================================================================

export enum FormatterCoverage {
    /** Formatter actively handles and formats the construct correctly */
    Covered = "covered",
    /** Formatter passes through but does not actively restructure */
    PassThrough = "pass-through",
    /** Construct is not handled — formatting is not applied */
    Missing = "missing",
}

export interface FormatterOption {
    /** Name of the keyword / option / clause from ABL docs */
    name: string;
    /** Whether this option is properly formatted */
    coverage: FormatterCoverage;
    notes?: string;
}

export interface FormatterEntry {
    /** Human-readable formatter name */
    formatterName: string;
    /** Source directory under src/formatters/ */
    formatterDir: string;
    /** SyntaxNodeType names that match() returns true for */
    handlesNodeTypes: string[];
    /** Related ABL doc feature names (from ParserCoverageData) */
    relatedDocFeatures: string[];
    /** Options / keywords this formatter is responsible for */
    options: FormatterOption[];
    /** Overall approximate coverage score (0–100) */
    approximateScore: number;
    notes?: string;
}

// =============================================================================
// FORMATTER ENTRIES
// =============================================================================

export const formatterEntries: FormatterEntry[] = [
    {
        formatterName: "AssignFormatter",
        formatterDir: "assign",
        handlesNodeTypes: ["AssignStatement"],
        relatedDocFeatures: ["ASSIGN"],
        options: [
            { name: "ASSIGN keyword", coverage: FormatterCoverage.Covered },
            { name: "Multiple assignments (pairs)", coverage: FormatterCoverage.Covered },
            { name: "Right-side expression alignment", coverage: FormatterCoverage.Covered },
            { name: "New line after ASSIGN", coverage: FormatterCoverage.Covered },
            { name: "End-dot placement", coverage: FormatterCoverage.Covered },
            { name: "NO-ERROR clause", coverage: FormatterCoverage.PassThrough },
            { name: "WHEN conditional assignment", coverage: FormatterCoverage.PassThrough },
            { name: "Inline comment preservation", coverage: FormatterCoverage.Covered },
        ],
        approximateScore: 82,
        notes: "Strong coverage for core ASSIGN patterns; WHEN clause and NO-ERROR are passed through without special formatting.",
    },
    {
        formatterName: "BlockFormatter",
        formatterDir: "block",
        handlesNodeTypes: ["DoBlock", "EndKeyword"],
        relatedDocFeatures: ["DO"],
        options: [
            { name: "Body indentation", coverage: FormatterCoverage.Covered },
            { name: "END keyword placement", coverage: FormatterCoverage.Covered },
            { name: "DO: colon syntax", coverage: FormatterCoverage.Covered },
            { name: "DO ON ERROR/STOP/QUIT/LEAVE", coverage: FormatterCoverage.PassThrough },
            { name: "DO WHILE phrase", coverage: FormatterCoverage.PassThrough },
            { name: "DO TRANSACTION", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 65,
        notes: "Handles indentation and END keyword. Clause options inside DO header are passed through.",
    },
    {
        formatterName: "BodyFormatter",
        formatterDir: "body",
        handlesNodeTypes: ["DoBlock"],
        relatedDocFeatures: ["FOR"],
        options: [
            { name: "FOR body indentation", coverage: FormatterCoverage.Covered },
            { name: "Excluded range preservation", coverage: FormatterCoverage.Covered },
            { name: "Multi-level indentation adjustment", coverage: FormatterCoverage.Covered },
        ],
        approximateScore: 75,
        notes: "Specifically handles indentation of the body block inside FOR statements.",
    },
    {
        formatterName: "CaseFormatter",
        formatterDir: "case",
        handlesNodeTypes: ["CaseWhenBranch", "CaseOtherwiseBranch"],
        relatedDocFeatures: ["CASE"],
        options: [
            { name: "WHEN branch formatting", coverage: FormatterCoverage.Covered },
            { name: "OR WHEN formatting", coverage: FormatterCoverage.Covered },
            { name: "THEN clause", coverage: FormatterCoverage.Covered },
            { name: "OTHERWISE branch", coverage: FormatterCoverage.Covered },
            { name: "Nested DO blocks in branches", coverage: FormatterCoverage.Covered },
            { name: "Inline vs new-line DO", coverage: FormatterCoverage.Covered },
        ],
        approximateScore: 88,
        notes: "Good coverage for CASE branches; CASE header itself and expression handled by default/expression formatter.",
    },
    {
        formatterName: "EnumFormatter",
        formatterDir: "enum",
        handlesNodeTypes: ["EnumDefinition"],
        relatedDocFeatures: ["ENUM"],
        options: [
            { name: "ENUM keyword", coverage: FormatterCoverage.Covered },
            { name: "ENUM member definitions", coverage: FormatterCoverage.Covered },
            { name: "FLAGS attribute", coverage: FormatterCoverage.PassThrough },
            { name: "ACCESS-LEVEL modifiers", coverage: FormatterCoverage.PassThrough },
            { name: "END ENUM", coverage: FormatterCoverage.Covered },
        ],
        approximateScore: 70,
        notes: "Handles ENUM structure; access modifiers and FLAGS are passed through.",
    },
    {
        formatterName: "ExpressionFormatter",
        formatterDir: "expression",
        handlesNodeTypes: [
            "LogicalExpression",
            "ComparisonExpression",
            "ParenthesizedExpression",
            "AdditiveExpression",
            "MultiplicativeExpression",
            "UnaryExpression",
        ],
        relatedDocFeatures: ["Expressions", "AND/OR operators", "Comparison operators"],
        options: [
            { name: "AND / OR logical operators", coverage: FormatterCoverage.Covered },
            { name: "New line after logical operators", coverage: FormatterCoverage.Covered },
            { name: "Comparison operators (=, <>, <, >, <=, >=)", coverage: FormatterCoverage.Covered },
            { name: "Arithmetic operators (+, -, *, /)", coverage: FormatterCoverage.Covered },
            { name: "NOT unary operator", coverage: FormatterCoverage.Covered },
            { name: "Parenthesized sub-expressions", coverage: FormatterCoverage.Covered },
            { name: "MATCHES / BEGINS / CONTAINS", coverage: FormatterCoverage.PassThrough },
            { name: "New expression types (GE, LE, etc.)", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 78,
        notes: "Solid coverage for common expressions. Some ABL-specific operators handled by pass-through.",
    },
    {
        formatterName: "FindFormatter",
        formatterDir: "find",
        handlesNodeTypes: ["FindStatement"],
        relatedDocFeatures: ["FIND"],
        options: [
            { name: "FIND FIRST / LAST / NEXT / PREV", coverage: FormatterCoverage.Covered },
            { name: "Table reference", coverage: FormatterCoverage.Covered },
            { name: "WHERE clause", coverage: FormatterCoverage.Covered },
            { name: "USING phrase", coverage: FormatterCoverage.PassThrough },
            { name: "LOCK modes (SHARE-LOCK, EXCLUSIVE-LOCK, NO-LOCK)", coverage: FormatterCoverage.PassThrough },
            { name: "NO-WAIT", coverage: FormatterCoverage.PassThrough },
            { name: "NO-ERROR", coverage: FormatterCoverage.PassThrough },
            { name: "OF phrase", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 60,
        notes: "Core FIND structure handled; optional clauses are passed through without specific formatting.",
    },
    {
        formatterName: "ForFormatter",
        formatterDir: "for",
        handlesNodeTypes: ["ForStatement"],
        relatedDocFeatures: ["FOR"],
        options: [
            { name: "FOR EACH / FIRST / LAST", coverage: FormatterCoverage.Covered },
            { name: "Table reference", coverage: FormatterCoverage.Covered },
            { name: "WHERE clause", coverage: FormatterCoverage.Covered },
            { name: "BY phrase", coverage: FormatterCoverage.Covered },
            { name: "WHILE phrase", coverage: FormatterCoverage.Covered },
            { name: "WITH FRAME phrase", coverage: FormatterCoverage.PassThrough },
            { name: "BREAK BY", coverage: FormatterCoverage.PassThrough },
            { name: "LOCK modes", coverage: FormatterCoverage.PassThrough },
            { name: "QUERY phrase", coverage: FormatterCoverage.PassThrough },
            { name: "OF phrase", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 65,
        notes: "Core iteration constructs formatted; advanced phrases (BREAK BY, WITH FRAME, QUERY) are passed through.",
    },
    {
        formatterName: "FunctionParameterFormatter",
        formatterDir: "functionParameter",
        handlesNodeTypes: ["Parameters"],
        relatedDocFeatures: ["FUNCTION", "METHOD"],
        options: [
            { name: "INPUT / OUTPUT / INPUT-OUTPUT", coverage: FormatterCoverage.Covered },
            { name: "Parameter type declaration", coverage: FormatterCoverage.Covered },
            { name: "Parameter alignment", coverage: FormatterCoverage.Covered },
            { name: "TABLE parameter", coverage: FormatterCoverage.Covered },
            { name: "TABLE-HANDLE parameter", coverage: FormatterCoverage.Covered },
            { name: "DATASET parameter", coverage: FormatterCoverage.PassThrough },
            { name: "BIND option", coverage: FormatterCoverage.PassThrough },
            { name: "APPEND option", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 72,
        notes: "Handles most parameter types with alignment; DATASET, BIND, and APPEND options are passed through.",
    },
    {
        formatterName: "IfFormatter",
        formatterDir: "if",
        handlesNodeTypes: ["IfStatement", "ElseIfStatement"],
        relatedDocFeatures: ["IF"],
        options: [
            { name: "IF condition", coverage: FormatterCoverage.Covered },
            { name: "THEN keyword placement", coverage: FormatterCoverage.Covered },
            { name: "DO block placement", coverage: FormatterCoverage.Covered },
            { name: "ELSE branch", coverage: FormatterCoverage.Covered },
            { name: "ELSE IF branch", coverage: FormatterCoverage.Covered },
            { name: "Inline vs new-line statement after THEN", coverage: FormatterCoverage.Covered },
            { name: "Comment preservation inside IF", coverage: FormatterCoverage.Covered },
            { name: "Nested IF expressions for complex conditions", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 85,
        notes: "Excellent coverage for IF/ELSE/ELSE-IF structures.",
    },
    {
        formatterName: "IfFunctionFormatter",
        formatterDir: "ifFunction",
        handlesNodeTypes: ["TernaryExpression"],
        relatedDocFeatures: ["IF function (ternary)"],
        options: [
            { name: "IF <expr> THEN <expr> ELSE <expr>", coverage: FormatterCoverage.Covered },
            { name: "Nested ternary expressions", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 65,
        notes: "Basic ternary IF function handled; deeply nested cases may not format optimally.",
    },
    {
        formatterName: "ProcedureParameterFormatter",
        formatterDir: "procedureParameter",
        handlesNodeTypes: ["ParameterDefinition"],
        relatedDocFeatures: ["PROCEDURE parameter definitions"],
        options: [
            { name: "INPUT / OUTPUT / INPUT-OUTPUT", coverage: FormatterCoverage.Covered },
            { name: "Parameter type declaration", coverage: FormatterCoverage.Covered },
            { name: "TABLE parameter", coverage: FormatterCoverage.Covered },
            { name: "TABLE-HANDLE parameter", coverage: FormatterCoverage.Covered },
            { name: "DATASET parameter", coverage: FormatterCoverage.PassThrough },
            { name: "BIND option", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 72,
        notes: "Similar to FunctionParameterFormatter; handles core parameter types with alignment.",
    },
    {
        formatterName: "PropertyFormatter",
        formatterDir: "property",
        handlesNodeTypes: ["PropertyDefinition"],
        relatedDocFeatures: ["DEFINE PROPERTY"],
        options: [
            { name: "DEFINE PROPERTY keyword", coverage: FormatterCoverage.Covered },
            { name: "Property type declaration", coverage: FormatterCoverage.Covered },
            { name: "GET / SET accessors", coverage: FormatterCoverage.Covered },
            { name: "Access modifiers (PUBLIC, PRIVATE, etc.)", coverage: FormatterCoverage.Covered },
            { name: "INITIAL value", coverage: FormatterCoverage.PassThrough },
            { name: "NO-UNDO option", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 75,
        notes: "Core property definition handled; INITIAL and NO-UNDO are passed through.",
    },
    {
        formatterName: "StatementFormatter",
        formatterDir: "statement",
        handlesNodeTypes: [
            "AblStatement",
            "DeleteStatement",
            "InputOutputStatement",
            "MessageStatement",
            "ReleaseStatement",
            "ReturnStatement",
            "UpdateStatement",
        ],
        relatedDocFeatures: ["DELETE", "INPUT / OUTPUT", "MESSAGE", "RELEASE", "RETURN", "UPDATE"],
        options: [
            { name: "Generic ABL statement spacing", coverage: FormatterCoverage.Covered },
            { name: "DELETE statement", coverage: FormatterCoverage.Covered },
            { name: "MESSAGE statement basics", coverage: FormatterCoverage.Covered },
            { name: "RETURN statement", coverage: FormatterCoverage.Covered },
            { name: "RETURN ERROR", coverage: FormatterCoverage.Covered },
            { name: "UPDATE statement basics", coverage: FormatterCoverage.Covered },
            { name: "MESSAGE VIEW-AS ALERT-BOX", coverage: FormatterCoverage.PassThrough },
            { name: "INPUT / OUTPUT stream options", coverage: FormatterCoverage.PassThrough },
            { name: "UPDATE WITH FRAME options", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 58,
        notes: "Covers several common statements at basic level; complex options and clauses pass through.",
    },
    {
        formatterName: "TempTableFormatter",
        formatterDir: "tempTable",
        handlesNodeTypes: ["TemptableDefinition"],
        relatedDocFeatures: ["DEFINE TEMP-TABLE"],
        options: [
            { name: "DEFINE TEMP-TABLE keyword", coverage: FormatterCoverage.Covered },
            { name: "FIELD definitions", coverage: FormatterCoverage.Covered },
            { name: "Field type alignment", coverage: FormatterCoverage.Covered },
            { name: "INDEX definitions", coverage: FormatterCoverage.Covered },
            { name: "BEFORE-TABLE phrase", coverage: FormatterCoverage.PassThrough },
            { name: "NAMESPACE-PREFIX", coverage: FormatterCoverage.PassThrough },
            { name: "XML-NODE-NAME", coverage: FormatterCoverage.PassThrough },
            { name: "LIKE table-name / LIKE-SEQUENTIAL", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 70,
        notes: "Covers core TEMP-TABLE structure; advanced XML/namespace options passed through.",
    },
    {
        formatterName: "UsingFormatter",
        formatterDir: "using",
        handlesNodeTypes: ["UsingStatement"],
        relatedDocFeatures: ["USING"],
        options: [
            { name: "USING class-name", coverage: FormatterCoverage.Covered },
            { name: "Sort and group USING statements", coverage: FormatterCoverage.Covered },
            { name: "Remove duplicate USING statements", coverage: FormatterCoverage.Covered },
            { name: "FROM ASSEMBLY", coverage: FormatterCoverage.PassThrough },
            { name: "FROM PROPATH", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 80,
        notes: "Strong coverage including deduplication and sorting; FROM qualifiers passed through.",
    },
    {
        formatterName: "VariableAssignmentFormatter",
        formatterDir: "variableAssignment",
        handlesNodeTypes: ["Assignment"],
        relatedDocFeatures: ["Single assignment (=)"],
        options: [
            { name: "Simple assignment (var = expr)", coverage: FormatterCoverage.Covered },
            { name: "Compound operators (+=, -=, etc.)", coverage: FormatterCoverage.PassThrough },
            { name: "Object property assignment", coverage: FormatterCoverage.Covered },
        ],
        approximateScore: 70,
        notes: "Handles single assignment nodes; compound assignment operators pass through.",
    },
    {
        formatterName: "VariableDefinitionFormatter",
        formatterDir: "variableDefinition",
        handlesNodeTypes: ["VariableDefinition"],
        relatedDocFeatures: ["DEFINE VARIABLE"],
        options: [
            { name: "DEFINE VARIABLE keyword", coverage: FormatterCoverage.Covered },
            { name: "Type declaration and alignment", coverage: FormatterCoverage.Covered },
            { name: "AS data-type", coverage: FormatterCoverage.Covered },
            { name: "INITIAL value", coverage: FormatterCoverage.Covered },
            { name: "NO-UNDO option", coverage: FormatterCoverage.Covered },
            { name: "ACCESS modifiers (PUBLIC, PRIVATE, etc.)", coverage: FormatterCoverage.Covered },
            { name: "EXTENT option", coverage: FormatterCoverage.Covered },
            { name: "SCOPE modifier alignment", coverage: FormatterCoverage.Covered },
            { name: "FORMAT option", coverage: FormatterCoverage.PassThrough },
            { name: "LABEL option", coverage: FormatterCoverage.PassThrough },
            { name: "COLUMN-LABEL option", coverage: FormatterCoverage.PassThrough },
        ],
        approximateScore: 80,
        notes: "Comprehensive coverage for variable definitions including alignment across groups; display options pass through.",
    },
    {
        formatterName: "ArrayAccessFormatter",
        formatterDir: "arrayAccess",
        handlesNodeTypes: ["ArrayAccess", "ArrayLiteral"],
        relatedDocFeatures: ["Array access / EXTENT"],
        options: [
            { name: "Array subscript [index]", coverage: FormatterCoverage.Covered },
            { name: "Array literal {a, b, c}", coverage: FormatterCoverage.Covered },
            { name: "Multi-dimensional array access", coverage: FormatterCoverage.Covered },
            { name: "Comma spacing in arrays", coverage: FormatterCoverage.Covered },
        ],
        approximateScore: 85,
        notes: "Good coverage for array access and literals.",
    },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export interface FormatterCoverageStats {
    formatterDir: string;
    formatterName: string;
    approximateScore: number;
    coveredCount: number;
    passThroughCount: number;
    missingCount: number;
    totalOptions: number;
}

export function calculateFormatterStats(): FormatterCoverageStats[] {
    return formatterEntries.map((entry) => {
        const coveredCount = entry.options.filter(
            (o) => o.coverage === FormatterCoverage.Covered
        ).length;
        const passThroughCount = entry.options.filter(
            (o) => o.coverage === FormatterCoverage.PassThrough
        ).length;
        const missingCount = entry.options.filter(
            (o) => o.coverage === FormatterCoverage.Missing
        ).length;
        return {
            formatterDir: entry.formatterDir,
            formatterName: entry.formatterName,
            approximateScore: entry.approximateScore,
            coveredCount,
            passThroughCount,
            missingCount,
            totalOptions: entry.options.length,
        };
    });
}

export function getOverallFormatterCoverage(): number {
    if (formatterEntries.length === 0) {
        return 0;
    }
    const total = formatterEntries.reduce(
        (sum, e) => sum + e.approximateScore,
        0
    );
    return Math.round(total / formatterEntries.length);
}
