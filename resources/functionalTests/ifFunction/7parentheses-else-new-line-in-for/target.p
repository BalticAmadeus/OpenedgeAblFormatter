/* formatterSettingsOverride */
/*  { "AblFormatter.ifFunctionFormatting": true,
      "AblFormatter.ifFunctionFormattingAddParentheses": "Yes",
      "AblFormatter.ifFunctionFormattingElseLocation": "New"}*/

FOR EACH Customer NO-LOCK
         BY (IF Customer.Balance > 10000 THEN 1 
             ELSE (IF Customer.Balance > 1000 THEN 2
             ELSE 3))
         BY Customer.SalesRep:
    DISPLAY Customer.SalesRep Customer.Balance Customer.Name.
END.