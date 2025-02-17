/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": false,
"AblFormatter.forFormatting": true
}*/

for each Customer where
         Customer.var = 1 or
         Customer.var = 2 or
         Customer.var = 3:
    Customer.var += 1.
end.