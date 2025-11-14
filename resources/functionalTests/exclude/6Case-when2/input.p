/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.caseFormattingThenLocation": "Same",
"AblFormatter.caseFormattingStatementLocation": "New",
"AblFormatter.expressionFormatting": false}*/

case weekday():
@AblFormatterExcludeStart.
    when "SATURDAY" then iValue = iValue + 1.
    when "MONDAY" then iValue = iValue + 3.
    when "WEDNESDAY" then iValue = iValue + 6.
    otherwise undo, throw new AppException("It is not a valid weekday").
@AblFormatterExcludeEnd.
    end case.