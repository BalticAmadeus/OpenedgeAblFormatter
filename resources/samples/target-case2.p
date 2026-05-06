/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true}*/
DEFINE VARIABLE pay-stat AS INTEGER NO-UNDO INITIAL 1.

CASE pay-stat:
    WHEN 1 THEN DO:
        MESSAGE "This account is unpaid.".
    END.
    WHEN 2 THEN DO:
        MESSAGE "This account is partially paid.".
    END.
    WHEN 3 THEN
        MESSAGE "This account is paid in full.".
END CASE.