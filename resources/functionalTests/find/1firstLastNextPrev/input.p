/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true}*/

FIND   FIRST   Customer WHERE Customer.CustNum = 5 NO-LOCK NO-ERROR.
FIND LAST Customer     WHERE Customer.CustNum = 5 NO-LOCK NO-ERROR.
FIND      NEXT Customer WHERE Customer.CustNum = 5 NO-LOCK       NO-ERROR.
FIND PREV Customer WHERE      Customer.CustNum = 5 NO-LOCK NO-ERROR.