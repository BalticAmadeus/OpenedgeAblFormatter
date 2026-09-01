/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true,
      "AblFormatter.blockFormatting": true,
      "AblFormatter.caseFormattingThenLocation": "Same",
      "AblFormatter.caseFormattingDoLocation": "Same",
      "AblFormatter.caseFormattingStatementLocation": "New"} */

CASE status:
    WHEN "active" THEN
        MESSAGE "OK".
    OTHERWISE DO:
        MESSAGE "Not active".
        RETURN.
    END.
END CASE.
