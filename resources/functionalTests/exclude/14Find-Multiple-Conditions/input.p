/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true}*/

FIND Customer WHERE 
@AblFormatterExcludeStart.
Customer.CustNum = 5 AND Customer.CustNum = 6 OR Customer.CustNum = 8        no-lock    no-error.
@AblFormatterExcludeEnd.