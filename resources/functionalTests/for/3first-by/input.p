/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true}*/

FOR         FIRST Customer NO-LOCK
    BY Customer.CreditLimit:
            DISPLAY Customer.
        END.