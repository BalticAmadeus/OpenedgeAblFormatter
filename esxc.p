DO iCount = 1 TO 10:
    IF iCount MOD 2 = 0 THEN DO:
        MESSAGE "Even:" iCount.
    END.

ELSE DO:
        MESSAGE "Odd:" iCount.
    END.
END.