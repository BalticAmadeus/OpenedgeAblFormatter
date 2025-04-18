/* formatterSettingsOverride */
/*  { "AblFormatter.ifFunctionFormatting": true,
      "AblFormatter.ifFunctionFormattingAddParentheses": "Yes",
      "AblFormatter.ifFunctionFormattingElseLocation": "New"}*/

FOR EACH Customer NO-LOCK
         BY (IF Customer.Balance > 10000 THEN 1 
             ELSE (IF Customer.Balance > 5000 THEN 1.5
             ELSE (IF Customer.Balance > 1000 THEN 2
             ELSE (IF Customer.Balance > 500 THEN 2.5
             ELSE 3))))
         BY (IF Customer.SalesRep = "John" THEN 1 
             ELSE (IF Customer.SalesRep = "Jane" THEN 2
             ELSE (IF Customer.SalesRep = "Doe" THEN 3
             ELSE 4))):
    DISPLAY Customer.SalesRep Customer.Balance Customer.Name.
END.
  