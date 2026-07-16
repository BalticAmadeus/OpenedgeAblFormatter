/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.ifFormattingThenLocation": "Same",
"AblFormatter.ifFormattingStatementLocation": "New"}*/

if x = 1 then
    assign
        qryPredicate = ?
        joinWith     = ?
        .
else if x = 2 then
    assign
        qryPredicate:Join = joinWith
        .
else
    assign
        qryPredicate = ?
        joinWith     = ?
        .
