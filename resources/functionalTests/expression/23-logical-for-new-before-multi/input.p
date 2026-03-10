/* formatterSettingsOverride */
/*  {
      "AblFormatter.forFormatting": true,
      "AblFormatter.expressionFormatting": true,
      "AblFormatter.expressionFormattingLogicalLocation": "New before"
    }*/

FOR EACH ChildTable NO-LOCK WHERE
         ChildTable.Key1 = ParentTable.Key1
         AND ChildTable.Key2 = ParentTable.Key2
         OR ChildTable.Key3 = ParentTable.Key3
         AND ChildTable.Key4 = ParentTable.Key4:

      MESSAGE "Greetings".
END.
