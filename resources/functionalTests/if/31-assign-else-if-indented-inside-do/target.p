/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.ifFormattingThenLocation": "Same",
"AblFormatter.ifFormattingStatementLocation": "New"}*/

do:
    if season = "spring" then
        assign
            avonlea             = "blooming"
            lakeOfShiningWaters = "beautiful"
            .
    else if season = "winter" then
        assign
            avonlea             = "snow"
            lakeOfShiningWaters = "frozen"
            .
    else
        assign
            avonlea             = ?
            lakeOfShiningWaters = ?
            .
end.
