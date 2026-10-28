/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true}*/

FOR EACH Order WHERE
         Order.Amount > 100 OR
         Order.Status = "Pending" NO-LOCK:
    DISPLAY Order.OrderNum.
END.
