/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.ifFormattingThenLocation": "Same",
"AblFormatter.ifFormattingStatementLocation": "New",
"AblFormatter.ifFormattingDoLocation": "New"}*/

if something <> ? and
   something <> 0 then
    oObject:method(something).
else if something <> ? or
        something <> ? then
do:    
    oObject:method(something).      
end.
else
    oObject:method().