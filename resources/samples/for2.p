/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true,
    "abl.completion.upperCase": false}*/
for each eCustomer no-lock where eCustomer.CustNum >= 10 and eCustomer.Price = 100 by eCustomer.Name:
  update eCustomer.Name.
  display Customer.CustNum.
end.