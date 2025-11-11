/* formatterSettingsOverride */
/*  { "AblFormatter.assignFormatting": true,
    "abl.completion.upperCase": true,
    "AblFormatter.assignFormattingEndDotLocation": "New"}*/
FUNCTION GET_STUFF RETURNS integer (cParam1 AS CHARACTER):
    DEFINE VARIABLE firstNumber  AS INT NO-UNDO.
    DEFINE VARIABLE secondNumber AS INT NO-UNDO.
@AblFormatterExcludeStart.
    ASSIGN
        firstNumber     = IF TRUE THEN 1 ELSE 2
        secondNumber = 2
    .
@AblFormatterExcludeEnd.

    RETURN jsonTableRow.

END FUNCTION.