/* formatterSettingsOverride */
/* { 
"AblFormatter.blockFormatting": true,
"AblFormatter.assignFormatting": true
} */
FUNCTION GET_STUFF RETURNS Progress.Json.ObjectModel.JsonObject (cParam1 AS CHARACTER):
    DEFINE VARIABLE jsonTableRow AS INT NO-UNDO.
    DEFINE VARIABLE jsonTableRow2 AS INT NO-UNDO.
    ASSIGN jsonTableRow     = IF TRUE THEN 1 ELSE 2
           jsonTableRow2222 = 2
           .

    ASSIGN jsonTableRow2222 = "1" + "2"
           .
    IF TRUE THEN assign jsonTableRow2222 = "1" + STRING(10000).

    DEFINE buffer vacation for Vacation.

    for each vacation no-lock
             vacation.id > 100:

    end.

    DEFINE buffer aaaa for a.

    IF FALSE THEN DO:
        ASSIGN jsonTableRow     = IF TRUE THEN 1 ELSE 2
               jsonTableRow2222 = 2
               jsonTableRow2223 = "adsasdasdsdsdas"
               .
    END.

    RETURN jsonTableRow.

END FUNCTION.