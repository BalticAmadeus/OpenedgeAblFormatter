/* formatterSettingsOverride */
/*  { "AblFormatter.expressionFormatting": true,
      "AblFormatter.expressionFormattingLogicalLocation": "New",
      "AblFormatter.forFormatting": false}*/

FOR EACH customer WHERE (customer.balance > 1000 AND
                        customer.status = "Active") OR
                        (customer.balance <= 1000 AND
                        customer.status = "Inactive") AND
                        customer.country = "USA":
      
    DISPLAY customer.name customer.balance customer.status customer.country.
END.
