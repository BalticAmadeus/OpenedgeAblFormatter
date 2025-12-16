/* CASE Statement */
DEFINE VARIABLE s AS CHARACTER NO-UNDO.
CASE s:
    WHEN "A" THEN
        MESSAGE "Letter A".
    WHEN "B" THEN
        MESSAGE "Letter B".
    OTHERWISE
        MESSAGE "Letter not recognized".
END CASE.
