/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true,
"AblFormatter.caseFormattingThenLocation": "New",
"AblFormatter.caseFormattingDoLocation": "New",
"AblFormatter.caseFormattingStatementLocation": "New",
"AblFormatter.blockFormatting": true}*/

DEFINE VARIABLE s AS CHARACTER NO-UNDO.
s = "B".

CASE s:
    WHEN "A"
    THEN
        MESSAGE "Letter A".
    WHEN "B"
    THEN
        MESSAGE "Letter B".
    WHEN "C"
    THEN
        MESSAGE "Letter C".
    OTHERWISE
        MESSAGE "Letter not recognized".
END CASE.
