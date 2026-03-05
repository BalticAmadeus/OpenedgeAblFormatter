/* formatterSettingsOverride */
/*  { "AblFormatter.expressionFormatting": true,
      "AblFormatter.expressionFormattingLogicalLocation": "New before",
      "AblFormatter.forFormatting": true}*/

FOR EACH ChildTable NO-LOCK
   WHERE ChildTable.Key1 = ParentTable.Key1 AND ChildTable.Key2 = ParentTable.Key2
      OR ChildTable.Key3 = ParentTable.Key3:

      MESSAGE "Greetings".
END.
