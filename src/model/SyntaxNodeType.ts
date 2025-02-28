import { MyFancySet } from "../utils/MyFancySet";

export enum SyntaxNodeType {
    Error = "ERROR",

    AvailableExpression = "available_expression",
    CaseStatement = "case_statement",
    CaseCondition = "case_condition",
    CaseBody = "case_body",
    CaseWhenBranch = "case_when_branch",
    CaseOtherwiseBranch = "case_otherwise_branch",
    DoBlock = "do_block",
    Body = "body",
    ClassBody = "class_body",
    InterfaceBody = "interface_body",
    IfStatement = "if_statement",
    ElseStatement = "else_statement",
    AblStatement = "abl_statement",
    LogicalExpression = "logical_expression",
    WhenExpression = "when_expression",
    TemptableDefinition = "temp_table_definition",
    PropertyDefinition = "property_definition",
    FieldDefinition = "field_definition",
    IndexDefinition = "index_definition",
    InputStreamStatement = "input_stream_statement",
    OutputStreamStatement = "output_stream_statement",
    OutputCloseStatement = "output_close_statement",
    VariableDefinition = "variable_definition",
    ProcedureParameterDefinition = "procedure_parameter_definition",
    ConstructorDefinition = "constructor_definition",
    DestructorDefinition = "destructor_definition",
    MethodDefinition = "method_definition",
    FindStatement = "find_statement",
    WhereClause = "where_clause",
    UndoStatement = "undo_statement",
    AssignStatement = "assign_statement",
    Assignment = "assignment",
    VariableAssignment = "variable_assignment",
    VariableTuning = "variable_tuning",
    Identifier = "identifier",
    SourceCode = "source_code",
    Argument = "argument",
    Arguments = "arguments",
    ForPhrase = "for_phrase",
    ForStatement = "for_statement",
    QueryTuning = "query_tuning",
    SortClause = "sort_clause",
    SortColumn = "sort_column",
    WhilePhrase = "while_phrase",
    ComparisonExpression = "comparison_expression",
    TernaryExpression = "ternary_expression",
    ParenthesizedExpression = "parenthesized_expression",
    AdditiveExpression = "additive_expression",
    MultiplicativeExpression = "multiplicative_expression",
    UnaryExpression = "unary_expression",
    NewExpression = "new_expression",
    BooleanLiteral = "boolean_literal",
    ElseIfStatement = "else_if_statement",
    ReturnStatement = "return_statement",
    FunctionCallStatement = "function_call_statement",
    FunctionalCallArgument = "functional_call_argument",
    UsingStatement = "using_statement",
    ClassStatement = "class_statement",
    FinallyStatement = "finally_statement",
    FunctionStatement = "function_statement",
    CatchStatement = "catch_statement",
    ProcedureStatement = "procedure_statement",
    RepeatStatement = "repeat_statement",
    OnStatement = "on_statement",
    EnumStatement = "enum_statement",
    EnumMember = "enum_member",
    EnumDefinition = "enum_definition",
    TypeTuning = "type_tuning",
    AccessTuning = "access_tuning",
    ArrayAccess = "array_access",
    ArrayLiteral = "array_literal",
    ToPhrase = "to_phrase",
    Comment = "comment",
    Getter = "getter",
    Setter = "setter",
    LeftParenthesis = "(",
    RightParenthesis = ")",
    LeftBracket = "[",
    RightBracket = "]",
    Label = "label",
    Parameters = "parameters",
    FunctionParameter = "function_parameter",
    FunctionParameterMode = "function_parameter_mode",
    // arithmetic operators
    Add = "+",
    Subtract = "-",
    Multiply = "*",
    Divide = "/",
    Modulus = "%",
    EqualsSign = "=",
    // comparison operators
    EqualTo = "EQ",
    NotEqualTo = "NE",
    GreaterThan = "GT",
    LessThan = "LT",
    GreaterThanOrEqualTo = "GE",
    LessThanOrEqualTo = "LE",
    // assignment operators
    AssignmentOperator = "assignment_operator",

    // keywords
    WhenKeyword = "WHEN",
    ByKeyword = "BY",
    ThenKeyword = "THEN",
    ElseKeyword = "ELSE",
    AndKeyword = "AND",
    OrKeyword = "OR",
    OtherwiseKeyword = "OTHERWISE",
    FieldKeyword = "FIELD",
    IndexKeyword = "INDEX",
    LikeKeyword = "LIKE",
    FirstKeyword = "FIRST",
    LastKeyword = "LAST",
    NextKeyword = "NEXT",
    PrevKeyword = "PREV",
    WhereKeyword = "WHERE",
    ShareLockKeyword = "SHARE-LOCK",
    ExclLockKeyword = "EXCLUSIVE-LOCK",
    NoLockKeyword = "NO-LOCK",
    NoWaitKeyword = "NO-WAIT",
    NoPrefetchKeyword = "NO-PREFETCH",
    NoErrorKeyword = "NO-ERROR",
    AssignKeyword = "ASSIGN",
    EachKeyword = "EACH",
    EndKeyword = "END",
    ExtentKeyword = "EXTENT",
    IfKeyword = "IF",
    FindKeyword = "FIND",
    ForKeyword = "FOR",
    DotKeyword = ".",
    ColonKeyword = ":",
    CommaKeyword = ",",
    DefineKeyword = "DEFINE",
    DefiKeyword = "DEFI",
    DefKeyword = "DEF",
    NoUndoKeyword = "NO-UNDO",
    InputKeyword = "INPUT",
    OutputKeyword = "OUTPUT",
    InputOutputKeyword = "INPUT-OUTPUT",
    ReturnKeyword = "RETURN",
    ParameterKeyword = "PARAMETER",
    VariableKeyword = "VARIABLE",
    TableKeyword = "TABLE",
    TableHandleKeyword = "TABLE-HANDLE",
    DatasetKeyword = "DATASET",
    DatasetHandleKeyword = "DATASET-HANDLE",
}

export const afterThenStatements = new MyFancySet<string>([
    SyntaxNodeType.ReturnStatement,
    SyntaxNodeType.AblStatement,
    SyntaxNodeType.FunctionCallStatement,
    SyntaxNodeType.AssignStatement,
    SyntaxNodeType.VariableAssignment,
    SyntaxNodeType.UndoStatement,
]);

export const definitionKeywords = new MyFancySet<string>([
    SyntaxNodeType.DefineKeyword,
    SyntaxNodeType.DefiKeyword,
    SyntaxNodeType.DefKeyword,
]);

export const dataStructureKeywords = new MyFancySet<string>([
    SyntaxNodeType.TableKeyword,
    SyntaxNodeType.TableHandleKeyword,
    SyntaxNodeType.DatasetKeyword,
    SyntaxNodeType.DatasetHandleKeyword,
]);

export const bodyBlockKeywords = new MyFancySet<string>([
    SyntaxNodeType.Body,
    SyntaxNodeType.CaseBody,
    SyntaxNodeType.ClassBody,
    SyntaxNodeType.InterfaceBody,
]);

export const parameterTypes = new MyFancySet<string>([
    SyntaxNodeType.InputKeyword,
    SyntaxNodeType.OutputKeyword,
    SyntaxNodeType.InputOutputKeyword,
    SyntaxNodeType.ReturnKeyword,
]);

export const parentheses = new MyFancySet<string>([
    SyntaxNodeType.LeftParenthesis,
    SyntaxNodeType.RightParenthesis,
]);

export const logicalKeywords = new MyFancySet<string>([
    SyntaxNodeType.AndKeyword,
    SyntaxNodeType.OrKeyword,
]);
