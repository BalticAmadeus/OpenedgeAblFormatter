/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.ifFormattingThenLocation": "Same",
"AblFormatter.ifFormattingStatementLocation": "New"}*/

if a = b then message a.
else if b = 1 then message 1.
else if b = 2   then message 2.
else if b = 3 then      message 3.
@AblFormatterExcludeStart.
else if b = 4 then     message 4.
else     if b = 5 then message 5.
@AblFormatterExcludeEnd.
else message 10.