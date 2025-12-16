/* FOR EACH with WHERE */
FOR EACH Customer NO-LOCK WHERE
    Customer.CustNum > 100 AND
    Customer.Country = "USA":
    DISPLAY Customer.Name Customer.City.
END.
