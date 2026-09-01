/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true}*/

FOR EACH Customer NO-LOCK,
    EACH CustOrder OUTER-JOIN WHERE
         CustOrder.CustNum = Customer.CustNum NO-LOCK:
    DISPLAY Customer.Name CustOrder.OrderNum.
END.
