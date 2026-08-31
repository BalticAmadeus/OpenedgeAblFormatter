/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true, "AblFormatter.forFormattingWhereLocation": "New"}*/

for each Synecdoche
         where Synecdoche.PartForWhole = "wheels",
    each Metonymy
         where Metonymy.AssociationFor = Synecdoche.WholeFor:
    display Metonymy.SubstitutionTerm.
end.
