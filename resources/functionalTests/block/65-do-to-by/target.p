/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true}*/

do i = 1 to num-entries(phBuffer:parent-relation:relation-fields) by 2:
    cQuery = cQuery + " " + entry(i, phBuffer:parent-relation:relation-fields).
end.