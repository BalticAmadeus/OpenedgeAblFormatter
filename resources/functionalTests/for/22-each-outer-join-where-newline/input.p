/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true, "AblFormatter.forFormattingWhereLocation": "New"}*/

for each Litotes where Litotes.IsUnderstatement = true, each Meiosis of Litotes outer-join where Meiosis.Degree = "mild":
    display Litotes.Expression Meiosis.Nuance.
end.
