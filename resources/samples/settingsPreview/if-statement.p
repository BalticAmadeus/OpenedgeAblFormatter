/* IF Statement */
IF customerStatus = "Active" THEN
DO:
    MESSAGE "Customer is active." VIEW-AS ALERT-BOX.
    RETURN customerId.
END.
ELSE IF customerStatus = "Inactive" THEN RETURN -1.
