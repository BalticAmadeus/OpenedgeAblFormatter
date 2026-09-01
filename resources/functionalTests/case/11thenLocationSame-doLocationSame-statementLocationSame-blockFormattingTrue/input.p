/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true,
"AblFormatter.caseFormattingThenLocation": "Same",
"AblFormatter.caseFormattingDoLocation": "Same",
"AblFormatter.caseFormattingStatementLocation": "Same",
"AblFormatter.blockFormatting": true}*/

PROCEDURE testCase:
    DEFINE VARIABLE i AS INTEGER NO-UNDO.
    i = 2.

    CASE i:
    WHEN 1 
    THEN
    DO: MESSAGE "Case 1".
            END.
    OTHERWISE
    MESSAGE "No match found".
    END CASE.
END PROCEDURE.