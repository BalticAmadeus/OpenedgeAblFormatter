/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.caseFormattingThenLocation": "Same",
"AblFormatter.caseFormattingStatementLocation": "New",
"AblFormatter.expressionFormatting": false}*/

case weekday():
    when "SATURDAY" then iValue = iValue + 1.
    otherwise undo, throw new AppException("It is not SATURDAY").
end case.