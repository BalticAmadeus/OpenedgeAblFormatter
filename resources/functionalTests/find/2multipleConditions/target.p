/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true}*/

FIND Customer WHERE
     Customer.CustNum = 5 AND
     Customer.CustNum = 6 OR
     Customer.CustNum = 8 no-lock no-error.