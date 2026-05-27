/* CASE Statement */
CASE s:
    WHEN "A" THEN DO:
    MESSAGE "Letter A".
    MESSAGE "Another line in WHEN A".
    END.
    WHEN "B" THEN
    MESSAGE "Letter B".
    OTHERWISE
    MESSAGE "Letter not recognized".
END CASE.
