/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true}*/
for each IambicMeter no-lock,
    each PoeticLine where
         PoeticLine.line_num = IambicMeter.meter_num no-lock,
    each Syllable where
         Syllable.syllable_num = PoeticLine.line_num
         break by IambicMeter.meter_num
         by PoeticLine.line_num:
end.