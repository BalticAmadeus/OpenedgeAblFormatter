/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.assignFormatting": true,
"AblFormatter.ifFormattingThenLocation": "Same",
"AblFormatter.ifFormattingStatementLocation": "New",
"AblFormatter.assignFormattingEndDotLocation": "New aligned"}*/

if kindred = true then
    assign
        rachel    = "Lynde"
        josephine = "Barry"
        muriel    = "Stacy"
        .
else if kindred = false then
    assign
        rachel    = "gossip"
        josephine = "wealthy"
        muriel    = "teacher"
        .
else
    assign
        rachel    = ?
        josephine = ?
        muriel    = ?
        .
