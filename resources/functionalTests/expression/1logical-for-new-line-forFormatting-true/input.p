/* formatterSettingsOverride */
/*  { "AblFormatter.expressionFormatting": true,
      "AblFormatter.expressionFormattingLogicalLocation": "New",
      "AblFormatter.forFormatting": true}*/

FOR EACH enchantedMenu WHERE enchantedMenu.StyleCode = "" OR enchantedMenu.StyleCode = "APPBAR" OR
                enchantedMenu.StyleCode = "EXPLORER" OR
                        enchantedMenu.StyleCode = "TASKBAR":
  
      MESSAGE "Greetings".
END.
  