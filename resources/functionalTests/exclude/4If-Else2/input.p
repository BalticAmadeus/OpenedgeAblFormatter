/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
"AblFormatter.ifFormattingThenLocation": "Same",
"AblFormatter.ifFormattingStatementLocation": "New"}*/

if a = b then message a.
@AblFormatterExcludeStart.
else return b.
@AblFormatterExcludeEnd.
