/* formatterSettingsOverride */
/*  { "abl.completion.upperCase": true, 
"AblFormatter.caseFormatting": true,
"AblFormatter.blockFormatting": true}*/

PROCEDURE testCase:
    DEFINE VARIABLE i AS INTEGER NO-UNDO.
    DEFINE VARIABLE j AS INTEGER NO-UNDO.
    
    i = 1.
    j = 2.

    CASE i:
        WHEN 1 THEN DO:
            CASE j:
                WHEN 1 THEN
                    MESSAGE "i=1, j=1".
                WHEN 2 THEN
                    MESSAGE "i=1, j=2".
                OTHERWISE
                    MESSAGE "i=1, j=Other".
            END CASE.
        END.
        WHEN 2 THEN
            MESSAGE "i=2".
        OTHERWISE
            MESSAGE "i=Other".
    END CASE.
END PROCEDURE.