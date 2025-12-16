/* FIND Statement */
DEFINE VARIABLE iCount AS INTEGER NO-UNDO.
FIND FIRST Customer NO-LOCK WHERE
    Customer.CustNum = iCount NO-ERROR.
