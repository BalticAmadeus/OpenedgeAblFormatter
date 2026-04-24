/* formatterSettingsOverride */
/* {
"AblFormatter.blockFormatting": true,
"AblFormatter.forFormatting": true,
"AblFormatter.caseFormatting": true,
"AblFormatter.assignFormatting": true,
} */
DEFINE VARIABLE pay-stat AS INTEGER NO-UNDO INITIAL 1.

FOR EACH Customer NO-LOCK WHERE 
         Customer.CustNum < 12:
    DISPLAY Customer.CustNum Customer.Name Customer.City Customer.State.
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
    IF FALSE THEN DO:
        ASSIGN
            jsonTableRow     = IF TRUE THEN 1 ELSE 2
            jsonTableRow2222 = 2
            jsonTableRow2223 = "adsasdasdsdsdas"
            .
    END.
END.