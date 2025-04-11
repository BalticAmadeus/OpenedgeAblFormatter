/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true,
"AblFormatter.blockFormatting": true,
"abl.completion.upperCase": true}*/

FOR EACH Customer NO-LOCK,
    EACH Order OF Customer NO-LOCK,
    EACH OrderLine OF Order NO-LOCK
         BY Order.PromiseDate
         BY Customer.CustNum
         BY OrderLine.LineNum:
    DISPLAY Order.PromiseDate.
END.