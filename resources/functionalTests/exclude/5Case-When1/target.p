/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.caseFormattingThenLocation": "Same",
"AblFormatter.caseFormattingStatementLocation": "New",
"AblFormatter.expressionFormatting": false}*/

@AblFormatterExcludeStart.
case weekday():
    when "SATURDAY" then iValue = iValue + 1.
    when "SUNDAY" then iValue = iValue + 2.
    when "MONDAY" then iValue = iValue + 3.
    otherwise undo, throw new AppException("It is not a weekday").
end case.
@AblFormatterExcludeEnd.