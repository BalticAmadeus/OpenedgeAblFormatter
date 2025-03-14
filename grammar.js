const PREC = {
  UNARY: 8,
  EXP: 7,
  MULTI: 6,
  ADD: 5,
  COMPARE: 4,
  LOGICAL: 3,
  ASSIGN: 2,
  EXTRA: -1
};

module.exports = grammar({
  name: "abl",

  externals: ($) => [
    $._namedot,
    $._namecolon,
    $._namedoublecolon,
    $._or_operator,
    $._and_operator,
    $._augmented_assignment,
    $._escaped_string,
    $._input_keyword,
    $._output_keyword,
    $._new_keyword,
    $._old_keyword,
    $._for_keyword,
    $._def_keyword,
    $._special_character
  ],
  extras: ($) => [$.comment, $.include, /[\s\f\uFEFF\u2060\u200B]|\\\r?\n/],
  word: ($) => $.identifier,
  supertypes: ($) => [$._expression, $._statement],
  conflicts: ($) => [
    // [$.input_expression],
    [$.record_phrase],
    [$.sort_clause],
    [$.string_literal],
    ...combinations([$._statement, $.if_statement]),
    // DEFINE * conflicts
    ...combinations([
      $.abl_statement,
      $.variable_definition,
      $.buffer_definition,
      $.query_definition,
      $.temp_table_definition,
      $.workfile_definition,
      $.property_definition,
      $.data_source_definition,
      $.event_definition,
      $.dataset_definition,
      $.stream_definition,
      $.image_definition
    ])
  ],

  rules: {
    source_code: ($) => repeat($._statement),

    body: ($) => seq(":", repeat($._statement)),
    dot_body: ($) => seq(choice(":", "."), repeat($._statement)),

    file_name: ($) => /[A-z-_|0-9|\/]+\.[i]/i,
    comment: ($) =>
      choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
    constant: ($) =>
      seq("{", optional("&"), choice($.identifier, $._integer_literal), "}"),

    identifier: ($) => /[A-Z|a-z|\-|\\_]{1}[A-Z|a-z|\-|\\_|0-9]*/i,
    qualified_name: ($) =>
      seq(
        $.identifier,
        repeat1(seq(alias($._namedot, "."), choice($.identifier, "*")))
      ),

    _terminator: ($) => /\s*\./i,
    _block_terminator: ($) => seq(kw("END"), "."),

    null_statement: ($) => seq(choice($.object_access), $._terminator),

    null_expression: ($) => /\?/,
    boolean_literal: ($) =>
      choice(kw("TRUE"), kw("FALSE"), kw("YES"), kw("NO")),
    _integer_literal: ($) => /[0-9]+/,
    _decimal_literal: ($) =>
      seq($._integer_literal, alias($._namedot, "."), $._integer_literal),

    number_literal: ($) => choice($._integer_literal, $._decimal_literal),
    string_literal: ($) => seq($._escaped_string, optional(seq(":", $.string_literal_attribute))),

    string_literal_attribute: ($) =>
      repeat1(
        choice(
          seq("R", $._integer_literal),
          seq("L", $._integer_literal),
          seq("C", $._integer_literal),
          seq("T", $._integer_literal),
          "U"
        )
      ),

    date_literal: ($) => /\d{1,2}\/\d{1,2}\/\d{4}|\d{2}/,
    array_literal: ($) => seq("[", optional(choice($.range_notation, _list($._expression, ","))), "]"),

    single_quoted_string: ($) =>
      seq("'", repeat(choice(/[^'\\]+/, /\\./, $._special_character)), "'"),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    _logical_operator: ($) =>
      prec.left(
        choice(alias($._and_operator, "AND"), alias($._or_operator, "OR"))
      ),
    logical_expression: ($) =>
      prec.right(
        PREC.LOGICAL,
        seq($._expression, $._logical_operator, $._expression)
      ),

    type_tuning: ($) =>
      choice(
        seq(kw("AS"), field("type", $._type)),
        seq(kw("LIKE"), field("type", $._type))
      ),

    assignment_operator: ($) => choice("=", $._augmented_assignment),

    _unary_minus_expressions: ($) =>
      choice(
        $.identifier,
        $.number_literal,
        $.function_call,
        $.qualified_name,
        $.object_access,
        $.member_access,
        $.parenthesized_expression
      ),

    unary_expression: ($) =>
      choice(
        prec.left(
          PREC.UNARY,
          seq(kw("-"), prec.left($._unary_minus_expressions))
        ),
        prec.left(
          PREC.LOGICAL,
          seq(kw("NOT"), prec.left(PREC.LOGICAL, $._expression))
        )
      ),

    ambiguous_expression: ($) => seq(kw("AMBIGUOUS"), $._expression),
    temp_table_expression: ($) =>
      seq(kw("TEMP-TABLE"), field("table", choice($._expression))),
    current_changed_expression: ($) =>
      seq(kw("CURRENT-CHANGED"), $._expression),
    locked_expression: ($) => seq(kw("LOCKED"), $._expression),
    dataset_expression: ($) => seq(prec.left(kw("DATASET")), $._expression),
    input_expression: ($) =>
      seq(
        alias($._input_keyword, "INPUT"),
        optional(seq(kw("FRAME"), field("frame", $.identifier))),
        field("field", choice($.identifier, $.qualified_name))
      ),

    _additive_operator: ($) => choice("+", "-"),
    additive_expression: ($) =>
      prec.left(
        PREC.ADD,
        choice(seq($._expression, $._additive_operator, $._expression))
      ),

    _multiplicative_operator: ($) => choice("*", "/", kw("MODULO"), kw("MOD")),
    multiplicative_expression: ($) =>
      prec.left(
        PREC.MULTI,
        choice(seq($._expression, $._multiplicative_operator, $._expression))
      ),

    _comparison_operator: ($) =>
      choice(
        "<",
        "<=",
        "<>",
        "=",
        ">",
        ">=",
        kw("LT"),
        kw("LE"),
        kw("NE"),
        kw("EQ"),
        kw("GT"),
        kw("GE"),
        kw("BEGINS"),
        kw("MATCHES"),
        kw("CONTAINS")
      ),
    comparison_expression: ($) =>
      prec.right(
        PREC.COMPARE,
        seq($._expression, $._comparison_operator, $._expression)
      ),

    _binary_expression: ($) =>
      choice(
        $.additive_expression,
        $.multiplicative_expression,
        $.comparison_expression,
        $.logical_expression
      ),

    range_notation: ($) => seq($._expression, alias($._for_keyword, "FOR"), $._expression),
    array_access: ($) =>
      prec.right(
        1,
        seq(
          field("array", choice($.identifier, $.object_access)),
          $.array_literal,
        )
      ),

    /// Includes
    include_argument: ($) =>
      choice(
        seq(
          /\&/,
          field("name", $.identifier),
          "=",
          field("value", $._expression)
        ),
        field("name", $.identifier),
        field("value", $.string_literal),
        $.constant
      ),
    include: ($) =>
      seq(
        "{",
        repeat($.constant),
        $.file_name,
        optional(repeat($.include_argument)),
        "}"
      ),

    primitive_type: ($) =>
      choice(
        kw("VOID"),
        kw("LOGICAL"),
        kw("INTEGER"),
        kw("INT"),
        kw("CHARACTER"),
        kw("CHAR"),
        kw("DECIMAL"),
        kw("DATE"),
        kw("DATETIME"),
        kw("DATETIME-TZ"),
        kw("INT64"),
        kw("LONGCHAR"),
        kw("MEMPTR"),
        kw("RAW"),
        kw("RECID"),
        kw("ROWID"),
        kw("HANDLE"),
        kw("COM-HANDLE")
      ),

    class_type: ($) => seq(kw("CLASS"), choice($.identifier, $.qualified_name)),
    generic_parameter: ($) => seq($.identifier, $.type_tuning),
    generic_expression: ($) =>
      seq(
        "<",
        _list(choice($.identifier, $.qualified_name, $.generic_parameter), ","),
        ">"
      ),
    generic_type: ($) =>
      seq(choice($.identifier, $.qualified_name), $.generic_expression),
    _type: ($) =>
      choice(
        $.primitive_type,
        $.identifier,
        $.qualified_name,
        $.class_type,
        $.generic_type
      ),

    when_expression: ($) => seq(kw("WHEN"), $._expression),
    assignment: ($) =>
      prec.right(
        PREC.ASSIGN,
        seq(
          prec.left(
            field(
              "name",
              choice(
                $.identifier,
                $.qualified_name,
                $.object_access,
                $.member_access,
                $.function_call,
                $.array_access
              )
            )
          ),
          $.assignment_operator,
          prec.right($._expression),
          optional($.when_expression)
        )
      ),
    variable_assignment: ($) => seq($.assignment, $._terminator),

    _define: ($) =>
      choice(
        kw("DEFINE"),
        alias($._def_keyword, "DEF"),
      ),

    variable_tuning: ($) =>
      seq(
        choice(
          seq(choice(kw("INITIAL"), kw("INIT")), $._expression),
          seq(kw("FORMAT"), $._expression),
          seq(kw("LABEL"), $._expression),
          seq(kw("COLUMN-LABEL"), $._expression),
          seq(kw("DECIMALS"), $._expression),
          seq(kw("EXTENT"), $.number_literal),
          kw("NO-UNDO")
        )
      ),

    scope_tuning: ($) =>
      choice(alias($._new_keyword, "NEW"), kw("GLOBAL"), kw("SHARED"), kw("STATIC")),
    access_tuning: ($) =>
      choice(
        kw("PRIVATE"),
        kw("PROTECTED"),
        kw("PUBLIC"),
        kw("PACKAGE-PRIVATE"),
        kw("PACKAGE-PROTECTED")
      ),
    serialization_tuning: ($) =>
      choice(kw("SERIALIZABLE"), kw("NON-SERIALIZABLE")),

    variable_definition: ($) =>
      seq(
        $._define,
        repeat(choice($.scope_tuning, $.access_tuning, $.serialization_tuning)),
        choice(kw("VARIABLE"), kw("VAR")),
        field("name", $.identifier),
        $.type_tuning,
        repeat($.variable_tuning),
        $._terminator
      ),

    buffer_definition: ($) =>
      seq(
        $._define,
        repeat(choice($.scope_tuning, $.access_tuning)),
        kw("BUFFER"),
        field("name", $.identifier),
        alias($._for_keyword, "FOR"),
        optional(kw("TEMP-TABLE")),
        field("table", choice($.identifier, $.qualified_name)),
        $._terminator
      ),

    query_definition_tuning: ($) =>
      choice(
        seq(kw("CACHE"), $.number_literal),
        "SCROLLING",
        kw("RCODE-INFORMATION")
      ),
    query_fields: ($) => seq("(", repeat($.identifier), ")"),
    query_definition: ($) =>
      seq(
        $._define,
        repeat(choice($.scope_tuning, $.access_tuning)),
        kw("QUERY"),
        field("name", $.identifier),
        alias($._for_keyword, "FOR"),
        $.identifier,
        optional(seq(kw("FIELDS"), $.query_fields)),
        optional(seq(kw("EXCEPT"), $.query_fields)),
        repeat($.query_definition_tuning),
        $._terminator
      ),

    return_tuning: ($) => seq(kw("EXTENT"), $.number_literal),
    return_type: ($) =>
      seq(choice(kw("RETURNS"), kw("RETURN")), field("type", $._type)),

    function_call_statement: ($) => seq($.function_call, $._terminator),

    argument_mode: ($) =>
      prec.right(
        choice(alias($._input_keyword, "INPUT"), alias($._output_keyword, "OUTPUT"), kw("INPUT-OUTPUT"), kw("DATA-SOURCE"))
      ),

    argument_tuning: ($) =>
      choice(kw("BY-VALUE"), kw("BY-REFERENCE"), kw("BIND"), kw("APPEND")),
    function_call_argument: ($) =>
      prec.right(
        1,
        seq(
          optional($.argument_mode),
          choice(
            seq(
              choice($.identifier, $.object_access, $.qualified_name),
              optional($.type_tuning)
            ),
            seq(
              optional(
                choice(
                  kw("TABLE"),
                  kw("TABLE-HANDLE"),
                  kw("DATASET"),
                  kw("DATASET-HANDLE")
                )
              ),
              $._expression
            )
          ),
          optional($.argument_tuning)
        )
      ),

    function_arguments: ($) =>
      seq(
        "(",
        optional(_list(alias($.function_call_argument, $.argument), ",")),
        ")"
      ),
    function_call: ($) =>
      prec.right(
        1,
        seq(
          field(
            "function",
            choice($.identifier, prec.right(2, $.object_access))
          ),
          alias($.function_arguments, $.arguments),
          optional(kw("NO-ERROR"))
        )
      ),

    if_statement: ($) =>
      seq(
        kw("IF"),
        field("condition", $._expression),
        kw("THEN"),
        choice($.do_block, prec(2, $._statement)),
        repeat(choice($.else_statement))
      ),

    else_statement: ($) =>
      prec(
        1,
        seq(
          kw("ELSE"),
          optional(
            seq(kw("IF"), field("condition", $._expression), kw("THEN"))
          ),
          choice($.do_block, $._statement)
        )
      ),

    ternary_expression: ($) =>
      prec.right(
        seq(
          kw("IF"),
          field("condition", $._expression),
          kw("THEN"),
          field("then", $._expression),
          kw("ELSE"),
          field("else", $._expression)
        )
      ),

    label: ($) => seq($.identifier, ":"),

    while_phrase: ($) => seq(kw("WHILE"), field("condition", $._expression)),

    repeat_tuning: ($) => choice(seq(kw("WITH"), kw("FRAME"), $.identifier)),

    repeat_statement: ($) =>
      seq(
        optional($.label),
        kw("REPEAT"),
        optional($.preselect_phrase),
        optional($.to_phrase),
        optional($.while_phrase),
        repeat(
          choice(
            $.on_error_phrase,
            $.on_quit_phrase,
            $.on_stop_phrase,
            $.on_endkey_phrase
          )
        ),
        repeat($.repeat_tuning),
        $.body,
        $._block_terminator
      ),

    _procedure_terminator: ($) => seq(kw("END"), kw("PROCEDURE"), "."),
    procedure_statement: ($) =>
      seq(
        kw("PROCEDURE"),
        $.identifier,
        optional(kw("PRIVATE")),
        optional(alias($.dot_body, $.body)),
        choice($._block_terminator, $._procedure_terminator)
      ),

    procedure_parameter_tuning: ($) =>
      choice(kw("APPEND"), kw("BIND"), kw("BY-VALUE")),

    procedure_parameter_definition: ($) =>
      seq(
        $._define,
        optional(
          choice(alias($._input_keyword, "INPUT"), alias($._output_keyword, "OUTPUT"), kw("INPUT-OUTPUT"), kw("RETURN"))
        ),
        choice(kw("PARAMETER"), kw("PARAM")),
        optional(
          choice(
            seq(kw("BUFFER"), field("buffer", $.identifier)),
            choice(
              kw("TABLE"),
              kw("TABLE-HANDLE"),
              seq(kw("DATASET"), optional(token.immediate(kw("-HANDLE"))))
            )
          )
        ),
        optional(alias($._for_keyword, "FOR")),
        field("name", $.identifier),
        choice(
          seq($.type_tuning, repeat($.variable_tuning)),
          repeat($.procedure_parameter_tuning)
        ),
        $._terminator
      ),

    _function_terminator: ($) =>
      choice(
        $._block_terminator,
        seq(kw("END"), kw("FUNCTION"), $._terminator)
      ),
    function_parameter_mode: ($) =>
      choice(alias($._input_keyword, "INPUT"), alias($._output_keyword, "OUTPUT"), kw("INPUT-OUTPUT")),
    function_parameter_tuning: ($) =>
      choice(
        kw("APPEND"),
        kw("BIND"),
        kw("BY-VALUE"),
        seq(kw("EXTENT"), optional($.number_literal))
      ),
    function_parameter: ($) =>
      seq(
        optional(kw("TABLE-HANDLE")),
        optional($.function_parameter_mode),
        optional(
          choice(
            kw("TABLE "),
            kw("TABLE-HANDLE"),
            kw("DATASET-HANDLE"),
            kw("DATASET ")
          )
        ),
        field("name", $.identifier),
        optional($.type_tuning),
        repeat($.function_parameter_tuning)
      ),

    function_parameters: ($) =>
      seq("(", optional(_list($.function_parameter, ",")), ")"),

    function_statement: ($) =>
      seq(
        kw("FUNCTION"),
        field("name", $.identifier),
        $.return_type,
        optional($.return_tuning),
        optional(alias($.function_parameters, $.parameters)),
        optional(alias($.dot_body, $.body)),
        $._function_terminator
      ),

    return_statement: ($) =>
      seq(kw("RETURN"), optional($._expression), $._terminator),

    interface_body: ($) =>
      seq(
        ":",
        repeat(
          choice(
            $.property_definition,
            $.temp_table_definition,
            $.event_definition,
            $.method_definition,
            $.dataset_definition
          )
        )
      ),

    interface_tuning: ($) => choice($.inherits),
    interface_statement: ($) =>
      seq(
        kw("INTERFACE"),
        field("name", choice($.string_literal, $.identifier, $.qualified_name)),
        repeat($.interface_tuning),
        alias($.interface_body, $.body),
        kw("END"),
        optional(kw("INTERFACE")),
        $._terminator
      ),

    property_type: ($) => choice(kw("ABSTRACT"), kw("OVERRIDE")),
    property_tuning: ($) =>
      choice(
        seq(choice(kw("INITIAL"), kw("INIT")), $._expression),
        seq(kw("DECIMALS"), $._expression),
        seq(kw("EXTENT"), $.number_literal),
        kw("NO-UNDO")
      ),

    getter: ($) =>
      seq(
        optional($.access_tuning),
        kw("GET"),
        optional(
          seq(
            optional(alias($.function_parameters, $.parameters)),
            $.body,
            kw("END"),
            optional(kw("GET"))
          )
        ),
        $._terminator
      ),

    setter: ($) =>
      seq(
        optional($.access_tuning),
        kw("SET"),
        optional(alias($.function_parameters, $.parameters)),
        optional(seq($.body, kw("END"), optional(kw("SET")))),
        $._terminator
      ),

    property_definition: ($) =>
      seq(
        $._define,
        repeat(
          choice(
            $.access_tuning,
            $.scope_tuning,
            $.property_type,
            $.serialization_tuning
          )
        ),
        kw("PROPERTY"),
        field("name", $.identifier),
        $.type_tuning,
        repeat($.property_tuning),
        choice(repeat1(choice($.getter, $.setter)), $._terminator)
      ),

    event_definition: ($) =>
      seq(
        $._define,
        repeat(choice($.access_tuning, $.scope_tuning, $.property_type)),
        kw("EVENT"),
        $.identifier,
        optional(kw("SIGNATURE")),
        kw("VOID"),
        alias($.function_parameters, $.parameters),
        $._terminator
      ),

    method_tuning: ($) => choice(kw("ABSTRACT"), kw("OVERRIDE"), kw("FINAL")),
    method_definition: ($) =>
      seq(
        kw("METHOD"),
        repeat(choice($.access_tuning, $.scope_tuning, $.method_tuning)),
        alias($._type, $.return_type),
        optional($.return_tuning),
        field("name", $.identifier),
        alias($.function_parameters, $.parameters),
        optional(seq($.body, kw("END"), optional(kw("METHOD")))),
        $._terminator
      ),

    data_relation: ($) =>
      seq(
        kw("DATA-RELATION"),
        alias($._for_keyword, "FOR"),
        _list(choice($.identifier, $.qualified_name), ","),
        kw("RELATION-FIELDS"),
        seq(
          "(",
          optional(_list(choice($.identifier, $.qualified_name), ",")),
          ")"
        )
      ),
    dataset_definition: ($) =>
      seq(
        $._define,
        repeat(choice($.scope_tuning, $.access_tuning)),
        kw("DATASET"),
        field("name", $.identifier),
        alias($._for_keyword, "FOR"),
        _list(choice($.identifier, $.qualified_name), ","),
        optional($.data_relation),
        $._terminator
      ),

    using_statement: ($) =>
      seq(
        kw("USING"),
        choice($.identifier, $.qualified_name),
        optional(seq(kw("FROM"), choice(kw("ASSEMBLY"), kw("PROPATH")))),
        $._terminator
      ),

    class_body: ($) =>
      seq(
        ":",
        repeat(
          choice(
            $.property_definition,
            $.temp_table_definition,
            $.event_definition,
            $.method_definition,
            $.dataset_definition,
            $.constructor_definition,
            $.destructor_definition,
            $.variable_definition,
            $.query_definition,
            $.buffer_definition,
            $.data_source_definition,
            $.stream_definition
          )
        )
      ),

    constructor_definition: ($) =>
      seq(
        kw("CONSTRUCTOR"),
        repeat(choice($.scope_tuning, $.access_tuning)),
        $.identifier,
        alias($.function_parameters, $.parameters),
        $.body,
        kw("END"),
        optional(choice(kw("CONSTRUCTOR"), kw("METHOD"))),
        $._terminator
      ),

    destructor_definition: ($) =>
      seq(
        kw("DESTRUCTOR"),
        repeat($.access_tuning),
        $.identifier,
        seq("(", ")"),
        $.body,
        kw("END"),
        optional(kw("DESTRUCTOR")),
        $._terminator
      ),

    class_tuning: ($) =>
      choice(
        $.inherits,
        $.implements,
        $.use_widget_pool,
        $.abstract,
        $.final,
        $.serializable
      ),

    class_statement: ($) =>
      seq(
        kw("CLASS"),
        field("name", choice($.string_literal, $.identifier, $.qualified_name)),
        repeat($.class_tuning),
        alias($.class_body, $.body),
        kw("END"),
        optional(kw("CLASS")),
        $._terminator
      ),

    inherits: ($) =>
      seq(
        kw("INHERITS"),
        _list(choice($.string_literal, $.identifier, $.qualified_name), ",")
      ),

    implements: ($) =>
      seq(
        kw("IMPLEMENTS"),
        _list(choice($.string_literal, $.identifier, $.qualified_name), ",")
      ),

    use_widget_pool: ($) => kw("USE-WIDGET-POOL"),
    abstract: ($) => kw("ABSTRACT"),
    final: ($) => kw("FINAL"),
    serializable: ($) => kw("SERIALIZABLE"),

    new_expression: ($) =>
      prec.right(
        seq(
          alias($._new_keyword, "NEW"),
          choice($.identifier, $.qualified_name),
          alias($.function_arguments, $.arguments),
          optional("NO-ERROR")
        )
      ),

    object_access: ($) =>
      seq(
        field(
          "object",
          choice($.identifier, $.new_expression, $.function_call)
        ),
        repeat1(seq(alias($._namecolon, ":"), field("property", $.identifier)))
      ),

    member_access: ($) =>
      seq(
        field("object", $.identifier),
        repeat1(
          seq(alias($._namedoublecolon, "::"), field("property", $.identifier))
        )
      ),

    stream_definition: ($) =>
      seq(
        $._define,
        repeat(choice($.scope_tuning, $.access_tuning, $.serialization_tuning)),
        kw("STREAM"),
        field("name", $.identifier),
        $._terminator
      ),

    input_close_statement: ($) =>
      seq(
        alias($._input_keyword, "INPUT"),
        optional(
          choice(
            seq(kw("STREAM"), field("stream", $.identifier)),
            seq(kw("STREAM-HANDLE"), field("stream_handle", $.identifier))
          )
        ),
        kw("CLOSE"),
        $._terminator
      ),

    output_close_statement: ($) =>
      seq(
        alias($._output_keyword, "OUTPUT"),
        optional(
          choice(
            seq(kw("STREAM"), field("stream", $.identifier)),
            seq(kw("STREAM-HANDLE"), field("stream_handle", $.identifier))
          )
        ),
        kw("CLOSE"),
        $._terminator
      ),

    _stream_statement: ($) =>
      choice($.input_stream_statement, $.output_stream_statement),

    input_stream_tuning: ($) =>
      choice(
        seq(kw("LOB-DIR"), $._expression),
        kw("BINARY"),
        kw("ECHO"),
        kw("NO-ECHO"),
        choice(seq(kw("MAP"), $._expression), kw("NO-MAP")),
        kw("UNBUFFERED"),
        kw("NO-CONVERT"),
        seq(
          kw("CONVERT"),
          optional(seq(kw("TARGET"), $._expression)),
          optional(seq(kw("SOURCE"), $._expression))
        )
      ),
    input_stream_statement: ($) =>
      seq(
        alias($._input_keyword, "INPUT"),
        optional(
          seq(
            choice(kw("STREAM"), kw("STREAM-HANDLE")),
            field("source", $.identifier)
          )
        ),
        kw("FROM"),
        field("target", $._expression),
        repeat($.input_stream_tuning),
        $._terminator
      ),

    output_stream_tuning: ($) =>
      choice(
        choice(
          seq(kw("LOB-DIR"), $._expression),
          seq(kw("NUM-COPIES"), $._expression),
          kw("COLLATE"),
          kw("BINARY"),
          choice(kw("LANDSCAPE"), kw("PORTRAIT")),
          kw("APPEND"),
          kw("ECHO"),
          kw("NO-ECHO"),
          kw("KEEP-MESSAGES"),
          choice(seq(kw("MAP"), $._expression), kw("NO-MAP")),
          kw("PAGED"),
          seq(kw("PAGE-SIZE"), $._expression),
          kw("UNBUFFERED"),
          kw("NO-CONVERT"),
          seq(
            kw("CONVERT"),
            optional(seq(kw("TARGET"), $._expression)),
            optional(seq(kw("SOURCE"), $._expression))
          )
        )
      ),
    output_stream_statement: ($) =>
      seq(
        alias($._output_keyword, "OUTPUT"),
        optional(
          seq(
            choice(kw("STREAM"), kw("STREAM-HANDLE")),
            field("source", $.identifier)
          )
        ),
        kw("TO"),
        field("target", $._expression),
        repeat($.output_stream_tuning),
        $._terminator
      ),

    on_error_phrase: ($) =>
      seq(
        kw("ON"),
        kw("ERROR"),
        kw("UNDO"),
        field("label", optional($.identifier)),
        ",",
        choice(
          seq(kw("LEAVE"), field("label", optional($.identifier))),
          seq(kw("NEXT"), field("label", optional($.identifier))),
          seq(kw("RETRY"), field("label", optional($.identifier))),
          seq(
            kw("RETURN"),
            choice(seq(kw("ERROR")), kw("NO-APPLY"), $.string_literal)
          ),
          kw("THROW")
        )
      ),

    on_stop_phrase: ($) =>
      seq(
        kw("ON"),
        kw("STOP"),
        kw("UNDO"),
        field("label", optional($.identifier)),
        ",",
        choice(
          seq(kw("LEAVE"), field("label", optional($.identifier))),
          seq(kw("NEXT"), field("label", optional($.identifier))),
          seq(kw("RETRY"), field("label", optional($.identifier))),
          seq(kw("RETURN"), choice(seq(kw("ERROR")), kw("NO-APPLY")))
        )
      ),

    on_quit_phrase: ($) =>
      seq(
        kw("ON"),
        kw("QUIT"),
        optional(seq(kw("UNDO"), optional($.identifier))),
        ",",
        choice(
          seq(kw("LEAVE"), field("label", optional($.identifier))),
          seq(kw("NEXT"), field("label", optional($.identifier))),
          seq(kw("RETRY"), field("label", optional($.identifier))),
          seq(kw("RETURN"), choice(seq(kw("ERROR")), kw("NO-APPLY")))
        )
      ),

    on_endkey_phrase: ($) =>
      seq(
        kw("ON"),
        kw("ENDKEY"),
        optional(seq(kw("UNDO"), optional($.identifier))),
        ",",
        choice(
          seq(kw("LEAVE"), field("label", optional($.identifier))),
          seq(kw("NEXT"), field("label", optional($.identifier))),
          seq(kw("RETRY"), field("label", optional($.identifier))),
          seq(kw("RETURN"), choice(seq(kw("ERROR")), kw("NO-APPLY")))
        )
      ),

    stop_after_phrase: ($) => seq(kw("STOP-AFTER"), $._expression),

    do_tuning: ($) => choice(kw("TRANSACTION")),
    to_phrase: ($) =>
      seq(
        $.assignment,
        kw("TO"),
        $._expression,
        optional(seq(kw("BY"), $.number_literal))
      ),

    do_block: ($) =>
      seq(
        optional($.label),
        kw("DO"),
        optional($.preselect_phrase),
        optional($.to_phrase),
        optional($.do_tuning),
        optional($.while_phrase),
        optional($.stop_after_phrase),
        repeat(
          choice(
            $.on_error_phrase,
            $.on_quit_phrase,
            $.on_stop_phrase,
            $.on_endkey_phrase
          )
        ),
        $.body,
        $._block_terminator
      ),

    _case_terminator: ($) =>
      choice($._block_terminator, seq(kw("END"), kw("CASE"), $._terminator)),

    _case_branch_body: ($) =>
      prec(1, choice($.do_block, field("statement", $._statement))),

    case_condition: ($) =>
      seq(optional(seq(kw("OR"), kw("WHEN"))), $._expression),

    case_when_branch: ($) =>
      seq(kw("WHEN"), repeat($.case_condition), kw("THEN"), $._case_branch_body),
    case_otherwise_branch: ($) => seq(kw("OTHERWISE"), $._case_branch_body),

    case_body: ($) =>
      seq(":", repeat1($.case_when_branch), optional($.case_otherwise_branch)),

    case_statement: ($) =>
      seq(
        kw("CASE"),
        $._expression,
        alias($.case_body, $.body),
        $._case_terminator
      ),

    where_clause: ($) => seq(kw("WHERE"), field("condition", $._expression)),

    // HACK: progress spaghetti allows to define tuning order before where clause
    _pre_tuning: ($) => prec.right(1, $.query_tuning),

    query_tuning: ($) =>
      choice(
        kw("NO-LOCK"),
        kw("SHARE-LOCK"),
        kw("EXCLUSIVE-LOCK"),
        kw("NO-WAIT"),
        kw("NO-ERROR"),
        kw("NO-PREFETCH"),
        seq(kw("USE-INDEX"), $.identifier),
        $.using
      ),

    sort_order: ($) =>
      choice(kw("ASCENDING"), kw("DESCENDING"), kw("DESC"), kw("ASC")),
    sort_column: ($) =>
      seq(field("column", $._expression), optional($.sort_order)),

    sort_clause: ($) =>
      seq(optional(kw("BREAK")), seq(kw("BY"), repeat1($.sort_column))),

    for_phrase: ($) =>
      seq(
        optional(field("type", choice(kw("EACH"), kw("FIRST"), kw("LAST")))),
        field("table", choice($.identifier, $.qualified_name)),
        optional($.of),
        optional($._pre_tuning),
        optional($.where_clause),
        repeat($.query_tuning),
        optional(repeat($.sort_clause)),
        repeat(
          choice(
            $.on_error_phrase,
            $.on_quit_phrase,
            $.on_stop_phrase,
            $.on_endkey_phrase
          )
        )
      ),

    for_statement: ($) =>
      seq(
        optional($.label),
        alias($._for_keyword, "FOR"),
        field("type", choice(kw("EACH"), kw("FIRST"), kw("LAST"))),
        field("table", choice($.identifier, $.qualified_name)),
        optional($.of),
        optional($._pre_tuning),
        optional($.where_clause),
        repeat($.query_tuning),
        repeat($.sort_clause),
        repeat(
          choice(
            $.on_error_phrase,
            $.on_quit_phrase,
            $.on_stop_phrase,
            $.on_endkey_phrase
          )
        ),
        repeat(seq(",", $.for_phrase)),
        $.body,
        $._block_terminator
      ),

    _find_type: ($) =>
      choice(kw("FIRST"), kw("LAST"), kw("NEXT"), kw("PREV"), kw("CURRENT")),

    find_statement: ($) =>
      seq(
        kw("FIND"),
        field("type", optional($._find_type)),
        field("table", choice($.identifier, $.qualified_name)),
        optional($.of),
        optional($._pre_tuning),
        optional($.where_clause),
        repeat($.query_tuning),
        $._terminator
      ),

    can_find_expression: ($) =>
      seq(
        kw("CAN-FIND"),
        "(",
        optional(choice(kw("FIRST"), kw("LAST"))),
        field("table", choice($.identifier, $.qualified_name)),
        optional(field("constant", $._expression)),
        repeat(choice($.query_tuning, $.of, $.where_clause)),
        ")"
      ),

    of: ($) => seq(kw("OF"), choice($.identifier, $.qualified_name)),
    using: ($) =>
      seq(
        kw("USING"),
        seq($.using_field, repeat(seq(kw("AND"), $.using_field)))
      ),
    using_field: ($) =>
      seq(
        optional(seq(kw("FRAME"), field("frame", $.identifier))),
        field("field", choice($.identifier, $.qualified_name))
      ),

    abl_statement: ($) =>
      seq(
        field("statement", $.identifier),
        repeat(prec(-1, $._expression)),
        $._terminator
      ),

    assign_statement: ($) =>
      seq(
        kw("ASSIGN"),
        repeat(choice($.assignment)),
        optional("NO-ERROR"),
        $._terminator
      ),

    catch_statement: ($) =>
      seq(
        kw("CATCH"),
        field("variable", $.identifier),
        kw("AS"),
        field(
          "type",
          seq(optional(kw("CLASS")), choice($.identifier, $.qualified_name))
        ),
        $.body,
        kw("END"),
        optional(kw("CATCH")),
        $._terminator
      ),

    finally_statement: ($) =>
      seq(
        kw("FINALLY"),
        $.body,
        kw("END"),
        optional(kw("FINALLY")),
        $._terminator
      ),

    accumulate_aggregate: ($) =>
      choice(
        kw("AVERAGE"),
        kw("COUNT"),
        kw("MAXIMUM"),
        kw("MINIMUM"),
        kw("TOTAL"),
        kw("SUB-AVERAGE"),
        kw("SUB-COUNT"),
        kw("SUB-MAXIMUM"),
        kw("SUB-MINIMUM"),
        kw("SUB-TOTAL")
      ),

    accumulate_statement: ($) =>
      seq(
        kw("ACCUMULATE"),
        choice($._expression, $.identifier),
        seq(
          "(",
          seq($.accumulate_aggregate, repeat(seq(" ", $.accumulate_aggregate))),
          ")"
        ),
        $._terminator
      ),

    accumulate_expression: ($) =>
      seq(kw("ACCUM"), $.accumulate_aggregate, prec.left($._expression)),

    available_expression: ($) =>
      seq(
        choice(kw("AVAIL"), kw("AVAILABLE")),
        choice($.parenthesized_expression, $.identifier)
      ),

    undo_statement: ($) =>
      seq(
        kw("UNDO"),
        field("label", optional($.identifier)),
        ",",
        choice(
          seq(kw("LEAVE"), field("label", optional($.identifier))),
          seq(kw("NEXT"), field("label", optional($.identifier))),
          seq(kw("RETRY"), field("label", optional($.identifier))),
          seq(kw("RETURN"), choice(seq(kw("ERROR")), kw("NO-APPLY"))),
          seq(kw("THROW"), $._expression)
        ),
        $._terminator
      ),

    error_scope_statement: ($) =>
      seq(
        choice(kw("ROUTINE-LEVEL"), kw("BLOCK-LEVEL")),
        $.on_error_phrase,
        $._terminator
      ),

    temp_table_tuning: ($) => choice(kw("NO-UNDO"), kw("REFERENCE-ONLY")),
    field_option: ($) =>
      choice(
        seq(kw("COLUMN-LABEL"), $.string_literal),
        seq(kw("LABEL"), $.string_literal),
        seq(kw("FORMAT"), $.string_literal),
        seq(kw("DECIMALS"), $.number_literal),
        seq(kw("EXTENT"), $.number_literal),
        seq(choice(kw("INITIAL"), kw("INIT")), $._expression),
        kw("SERIALIZE-HIDDEN"),
        seq(kw("SERIALIZE-NAME"), $.string_literal),
        seq(kw("XML-DATA-TYPE"), $.string_literal),
        seq(kw("XML-NODE-TYPE"), $.string_literal),
        seq(kw("XML-NODE-NAME"), $.string_literal),
        seq(kw("HELP"), $.string_literal),
        seq(kw("NOT"), kw("CASE-SENSITIVE"))
      ),
    field_definition: ($) =>
      seq(kw("FIELD"), $.identifier, $.type_tuning, repeat($.field_option)),
    index_tuning: ($) =>
      choice(
        seq(choice(kw("IS"), kw("AS")), kw("PRIMARY")),
        seq(choice(kw("IS"), kw("AS")), kw("UNIQUE")),
        seq(choice(kw("IS"), kw("AS")), kw("WORD-INDEX"))
      ),
    index_definition: ($) =>
      prec.left(
        seq(
          kw("INDEX"),
          $.identifier,
          repeat($.index_tuning),
          repeat($.sort_column)
        )
      ),

    workfile_tuning: ($) => kw("NO-UNDO"),
    workfile_definition: ($) =>
      seq(
        $._define,
        repeat(choice($.access_tuning, $.scope_tuning)),
        choice(kw("WORKFILE"), kw("WORK-TABLE")),
        field("name", $.identifier),
        repeat($.workfile_tuning),
        optional($.type_tuning),
        repeat($.field_definition),
        $._terminator
      ),

    temp_table_definition: ($) =>
      seq(
        $._define,
        repeat(choice($.scope_tuning, $.access_tuning, $.serialization_tuning, $.constant)),
        kw("TEMP-TABLE"),
        choice($.identifier, $.constant),
        repeat($.temp_table_tuning),
        optional($.type_tuning),
        repeat(choice($.field_definition, $.index_definition)),
        $._terminator
      ),

    widget_field: ($) =>
      seq(
        optional(kw("FIELD")),
        $.identifier,
        optional(seq(kw("IN"), kw("FRAME"), $.identifier))
      ),

    widget_phrase: ($) =>
      prec.left(seq(kw("FRAME"), $.identifier, repeat($.widget_field))),

    of_phrase: ($) =>
      seq(
        kw("OF"),
        seq($._expression, repeat(seq(",", $._expression))),
        optional(
          seq(
            alias($._new_keyword, "NEW"),
            seq($._expression, repeat(seq(",", $._expression))),
            alias($._old_keyword, "OLD"),
            seq($._expression, repeat(seq(",", $._expression)))
          )
        ),
        optional(kw("ANYWHERE"))
      ),
    on_statement: ($) =>
      seq(
        kw("ON"),
        _list($._expression, ","),
        choice(kw("ANYWHERE"), $.of_phrase),
        optional(kw("IN")),
        repeat($.widget_phrase),
        $.do_block
      ),

    data_source_definition: ($) =>
      seq(
        $._define,
        optional($.access_tuning),
        optional($.scope_tuning),
        kw("DATA-SOURCE"),
        $.identifier,
        alias($._for_keyword, "FOR"),
        optional(seq(kw("QUERY"), $.identifier)),
        choice(
          seq(
            _list(choice($.identifier, $.qualified_name), ","),
            $._terminator
          ),
          $._terminator
        )
      ),

    prompt_for_statement: ($) =>
      seq(
        kw("PROMPT-FOR"),
        choice($.identifier, $.qualified_name),
        optional(seq(kw("FRAME"), field("frame", $.identifier))),
        choice(seq(kw("EDITING"), $.body, $._block_terminator), $._terminator)
      ),

    variable: ($) => choice(field("name", $.identifier), $.assignment),
    var_statement: ($) =>
      seq(
        // FIXME: hack to avoid breaking assignments where identifier begins with var
        kw("VAR "),
        optional(
          choice($.scope_tuning, $.access_tuning, $.serialization_tuning)
        ),
        alias(choice($._type, $.string_literal), $.type_tuning),
        optional(field("size", $.array_literal)),
        repeat(seq($.variable, optional(","))),
        $._terminator
      ),

    image_phrase: ($) =>
      seq(
        choice(kw("IMAGE"), kw("IMAGE-UP")),
        seq(kw("FILE"), $.string_literal),
        optional(
          seq(
            choice(
              kw("IMAGE-SIZE"),
              kw("IMAGE-SIZE-CHARS"),
              kw("IMAGE-SIZE-PIXELS")
            ),
            field("width", $.number_literal),
            kw("BY"),
            field("height", $.number_literal)
          )
        ),
        optional(
          seq(
            kw("FROM"),
            choice(
              seq(kw("X"), $.number_literal, kw("Y"), $.number_literal),
              seq(kw("ROW"), $.number_literal, kw("COLUMN"), $.number_literal)
            )
          )
        )
      ),

    size_phrase: ($) =>
      seq(
        choice(kw("SIZE"), kw("SIZE-CHARS"), kw("SIZE-PIXELS")),
        field("width", $.number_literal),
        kw("BY"),
        field("height", $.number_literal)
      ),

    button_tuning: ($) =>
      choice(
        seq(kw("AUTO-GO"), optional(kw("AUTO-ENDKEY"))),
        kw("DEFAULT"),
        seq(kw("BGCOLOR"), $._expression),
        seq(kw("CONTEXT-HELP-ID"), $._expression),
        seq(kw("DCOLOR"), $._expression),
        kw("DROP-TARGET"),
        seq(kw("FGCOLOR"), $._expression),
        seq(kw("FONT"), $.number_literal),
        seq(kw("IMAGE-DOWN"), $.image_phrase),
        seq(kw("IMAGE"), $.image_phrase),
        seq(kw("IMAGE-UP"), $.image_phrase),
        seq(kw("IMAGE-INSENSITIVE"), $.image_phrase),
        seq(kw("MOUSE-POINTER"), $.identifier),
        seq(kw("LABEL"), $.string_literal),
        seq(kw("LIKE"), $.identifier),
        seq(kw("PFCOLOR"), $._expression),
        seq(kw("NO-FOCUS"), optional(kw("FLAT-BUTTON"))),
        kw("NO-CONVERT-3D-COLORS"),
        seq(kw("TOOLTIP"), $.string_literal),
        $.size_phrase
      ),

    button_definition: ($) =>
      seq(
        $._define,
        optional($.access_tuning),
        kw("BUTTON"),
        field("name", $.identifier),
        repeat($.button_tuning),
        $._terminator
      ),

    image_tuning: ($) =>
      choice(
        seq(kw("BGCOLOR"), $._expression),
        seq(kw("FGCOLOR"), $._expression),
        kw("CONVERT-3D-COLORS"),
        seq(kw("TOOLTIP"), $.identifier),
        seq(kw("STRETCH-TO-FIT"), optional(kw("RETAIN-SHAPE"))),
        kw("TRANSPARENT")
      ),

    image_definition: ($) =>
      seq(
        $._define,
        optional($.access_tuning),
        kw("IMAGE"),
        field("name", $.identifier),
        choice($.size_phrase, $.image_phrase, seq(kw("LIKE"), $.identifier)),
        repeat($.image_tuning),
        $._terminator
      ),

    run_tuning: ($) =>
      choice(
        kw("PERSISTENT"),
        kw("SINGLE-RUN"),
        kw("SINGLETON"),
        kw("ASYNCHRONOUS"),
        seq(kw("SET"), $.identifier),
        seq(kw("ON"), kw("SERVER"), $.identifier),
        seq(kw("IN"), choice(kw("THIS-PROCEDURE"), $.identifier)),
        seq(kw("EVENT-PROCEDURE"), $.string_literal)
      ),
    run_statement: ($) =>
      seq(
        kw("RUN"),
        field(
          "procedure",
          choice($.identifier, $.qualified_name, $.function_call)
        ),
        repeat($.run_tuning),
        optional(alias($.function_arguments, $.arguments)),
        optional(kw("NO-ERROR")),
        $._terminator
      ),

    enum_body: ($) => seq(":", repeat($.enum_definition)),
    enum_member: ($) =>
      seq(
        field("name", $.identifier),
        field(
          "value",
          optional(
            seq(
              kw("="),
              _list(
                choice($.identifier, $.number_literal, $.string_literal),
                ","
              )
            )
          )
        )
      ),
    enum_definition: ($) =>
      seq(
        $._define,
        kw("ENUM"),
        repeat($.enum_member),
        $._terminator
      ),

    enum_tuning: ($) => choice(kw("FLAGS")),
    enum_statement: ($) =>
      seq(
        kw("ENUM"),
        field("name", $.identifier),
        repeat($.enum_tuning),
        alias($.enum_body, $.body),
        kw("END"),
        optional(kw("ENUM")),
        $._terminator
      ),

    record_phrase: ($) =>
      seq(
        optional(field("type", choice(kw("EACH"), kw("FIRST"), kw("LAST")))),
        _list(choice($.identifier, $.qualified_name), ","),
        optional($.of)
      ),
    preselect_phrase: ($) =>
      seq(
        kw("PRESELECT"),
        _list($.record_phrase, ","),
        optional($._pre_tuning),
        optional($.where_clause),
        repeat($.query_tuning),
        optional(repeat($.sort_clause))
      ),

    preprocessor_directive: $ =>
      seq(
        "&",
        token(
          choice(
            seq(
              /[^\n~]+/,
              repeat(seq("~", /\s*\n/, /[^\n~]*/))
            ),
            seq(
              kw("IF"),
              /[^\n]*/,
              repeat(seq(/\n/, /[^\n]*/)),
              /\n\s*/,
              "&", kw("ENDIF")
            )
          ),
        )
      ),

    // Supertypes
    _expression: ($) =>
      choice(
        $.parenthesized_expression,
        $.unary_expression,
        $.null_expression,
        $._binary_expression,
        $.ternary_expression,
        $.available_expression,
        $.accumulate_expression,
        $.ambiguous_expression,
        $.temp_table_expression,
        $.current_changed_expression,
        $.locked_expression,
        $.dataset_expression,
        $.input_expression,
        $.can_find_expression,
        $.new_expression,

        $.boolean_literal,
        $.string_literal,
        $.date_literal,
        $.number_literal,
        $.array_literal,

        $.object_access,
        $.member_access,
        $.array_access,
        $.function_call,

        $.qualified_name,
        $.identifier,
        $.constant
      ),

    _statement: ($) =>
      choice(
        $.var_statement,
        $.null_statement,
        $.procedure_statement,
        $.function_statement,
        $.function_call_statement,
        $.return_statement,
        $.if_statement,
        $.for_statement,
        $.repeat_statement,
        $.find_statement,
        $._stream_statement,
        $.case_statement,
        $.input_close_statement,
        $.output_close_statement,
        $.assign_statement,
        $.catch_statement,
        $.finally_statement,
        $.accumulate_statement,
        $.undo_statement,
        $.error_scope_statement,
        $.using_statement,
        $.class_statement,
        $.interface_statement,
        $.on_statement,
        $.prompt_for_statement,
        $.run_statement,
        $.enum_statement,
        $.abl_statement,

        $.variable_definition,
        $.buffer_definition,
        $.query_definition,
        $.stream_definition,
        $.procedure_parameter_definition,
        $.temp_table_definition,
        $.workfile_definition,
        $.dataset_definition,
        $.button_definition,
        $.image_definition,

        $.variable_assignment,
        $.do_block,
        $.preprocessor_directive
      )
  }
});

function _list(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function kw(keyword) {
  if (keyword.toUpperCase() != keyword) {
    throw new Error(`Expected upper case keyword got ${keyword}`);
  }

  return alias(reserved(createCaseInsensitiveRegex(keyword)), keyword);
}

function reserved(regex) {
  return token(prec(1, new RegExp(regex)));
}

function createCaseInsensitiveRegex(word) {
  return new RegExp(
    word
      .split("")
      .map((letter) => `[${letter.toLowerCase()}${letter.toUpperCase()}]`)
      .join("")
  );
}

function combinations(arr) {
  let result = [];

  // Helper function to generate combinations
  function generateCombination(start, combination) {
    for (let i = start; i < arr.length; i++) {
      combination.push(arr[i]);
      result.push([...combination]);
      generateCombination(i + 1, combination);
      combination.pop();
    }
  }

  generateCombination(0, []);
  return result;
}
