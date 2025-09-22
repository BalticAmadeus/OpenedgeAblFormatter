/* formatterSettingsOverride */
/*  { "abl.completion.upperCase": true, 
"AblFormatter.caseFormatting": true,
"AblFormatter.caseFormattingThenLocation": "New",
"AblFormatter.caseFormattingDoLocation": "Same",
"AblFormatter.caseFormattingStatementLocation": "New",
"AblFormatter.blockFormatting": true}*/

PROCEDURE testCase:
    DEFINE VARIABLE i AS INTEGER NO-UNDO.
    i = 2.

    CASE i:
        WHEN 1
        THEN DO:
            MESSAGE "Case 1".
        END.
        OTHERWISE
            MESSAGE "No match found".
    END CASE.
END PROCEDURE.