/* formatterSettingsOverride */
/*  { "AblFormatter.assignFormatting": true,
"abl.completion.upperCase": true,
"AblFormatter.functionParameterFormatting": false,
"AblFormatter.assignFormattingAssignLocation": "New",
"AblFormatter.assignFormattingAlignRightExpression": "Yes",
"AblFormatter.assignFormattingEndDotLocation": "New aligned",
"AblFormatter.expressionFormatting": false}*/

FUNCTION sumNumbers RETURNS INTEGER (number3 AS INTEGER, number4 AS INTEGER):
    ASSIGN
        number11 = number3
        number2  = number4
        .
    RETURN number11 + number2.
END FUNCTION.