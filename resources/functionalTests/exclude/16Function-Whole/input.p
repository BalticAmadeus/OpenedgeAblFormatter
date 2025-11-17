/* formatterSettingsOverride */
/*  { "AblFormatter.assignFormatting": true,
    "abl.completion.upperCase": true,
    "AblFormatter.assignFormattingEndDotLocation": "New"}*/
@AblFormatterExcludeStart.
FUNCTION GET_STUFF RETURNS integer (cParam1 AS CHARACTER):
    DEFINE VARIABLE firstNumber AS INT NO-UNDO.
    DEFINE VARIABLE secondNumber AS INT NO-UNDO.
    ASSIGN
        firstNumber     = IF TRUE THEN 1 ELSE 2
        secondNumber = 2
    .

    RETURN jsonTableRow.

END FUNCTION.
@AblFormatterExcludeEnd.