/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true,
    "abl.completion.upperCase": true}*/
FOR EACH Customer NO-LOCK 
  WHERE Customer.CustNum < 12: 
      DISPLAY Customer.CustNum Customer.Name Customer.City Customer.State.
  END.