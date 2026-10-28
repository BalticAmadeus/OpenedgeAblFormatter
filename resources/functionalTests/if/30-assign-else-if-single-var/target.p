/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.ifFormattingThenLocation": "Same",
"AblFormatter.ifFormattingStatementLocation": "New"}*/

if age = "child" then
    assign
        anne = "orphan"
        .
else if age = "teen" then
    assign
        anne = "student"
        .
else if age = "adult" then
    assign
        anne = "teacher"
        .
else
    assign
        anne = ?
        .
