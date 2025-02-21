/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true}*/

FOR EACH Customer NO-LOCK WHERE
         (Customer.Balance > 10000 AND
         Customer.Region = "North") OR
         (Customer.Region = "South" AND
         Customer.Status = "Active")
         BY Customer.LastName
         BY Customer.FirstName
         BREAK BY Customer.City
         BY Customer.State:
    DISPLAY Customer.CustomerID 
            Customer.Name 
            Customer.Balance 
            Customer.Region 
            Customer.Status 
            Customer.City 
            Customer.State 
            Customer.LastOrderDate 
            Customer.CreditLimit 
            Customer.SalesRep.
END.
