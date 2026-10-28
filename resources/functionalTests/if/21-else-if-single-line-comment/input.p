/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.ifFormattingThenLocation": "Same",
"AblFormatter.ifFormattingStatementLocation": "New",
"AblFormatter.ifFormattingDoLocation": "New"}*/

if qryGroup then
                assign qryPredicate = ?
                    joinWith     = ?
                    .
else 
// for NOT cases
if not qryGroup then
                qryGroup = true.
