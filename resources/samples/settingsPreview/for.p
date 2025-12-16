/* FOR Statement */
FOR FIRST Customer NO-LOCK
    BY Customer.CreditLimit:
            DISPLAY Customer.
END.
