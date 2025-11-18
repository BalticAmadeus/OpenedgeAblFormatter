/* formatterSettingsOverride */
/*  { "abl.completion.upperCase": true, 
"AblFormatter.caseFormatting": true,
"AblFormatter.blockFormatting": true}*/

PROCEDURE testCase:
    DEFINE VARIABLE i 
    AS INTEGER NO-UNDO.
    DEFINE VARIABLE j 
    AS INTEGER NO-UNDO.

    i = 5.
    j = 10.

@AblFormatterExcludeStart.
    CASE TRUE:
        WHEN i = 5 AND j = 10 THEN
                    MESSAGE "i=5 and j=10".
                WHEN i = 6 AND j = 15 THEN
                MESSAGE "i=6 and j=15".
            OTHERWISE
            MESSAGE "Other condition".
    END CASE.
@AblFormatterExcludeEnd.
END PROCEDURE.