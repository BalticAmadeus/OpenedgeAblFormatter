/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true,
      "AblFormatter.blockFormatting": true,
      "AblFormatter.caseFormattingThenLocation": "Same",
      "AblFormatter.caseFormattingStatementLocation": "New"} */

CASE letterGrade:
    WHEN "A" OR "B" THEN
        MESSAGE "Pass with distinction".
    WHEN "C" THEN
        MESSAGE "Pass".
    OTHERWISE
        MESSAGE "Fail".
END CASE.
