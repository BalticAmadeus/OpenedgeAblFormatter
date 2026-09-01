/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true}*/

FOR   LAST   Customer   WHERE   Customer.Balance > 50000   NO-LOCK:
    DISPLAY Customer.Name.
END.
