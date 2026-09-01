/* FOR Statement */
FOR EACH Customer WHERE
         Customer.var = 1 OR
         Customer.var = 2:
    Customer.var += 1.
END.
