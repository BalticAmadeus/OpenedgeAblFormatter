/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true, "AblFormatter.forFormattingWhereLocation": "New"}*/

for each Anaphora
         where Anaphora.Repetition = "beginning" and
         Anaphora.IsEmphasized = true and
         Anaphora.Impact > 5:
    display Anaphora.Phrase Anaphora.Impact.
end.
