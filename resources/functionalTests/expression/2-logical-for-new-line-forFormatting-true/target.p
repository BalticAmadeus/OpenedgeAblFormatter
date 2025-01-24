/* formatterSettingsOverride */
/*  { "AblFormatter.expressionFormatting": true,
      "AblFormatter.expressionFormattingLogicalLocation": "New",
      "AblFormatter.forFormatting": true}*/

FOR EACH enchantedAttribute WHERE
         enchantedAttribute.MagicValueGuid = sourceBuffer::MagicValueGuid OR
         (enchantedAttribute.MagicInstanceGuid = sourceBuffer::MagicInstanceGuid AND
         enchantedAttribute.MagicLabel = sourceBuffer::MagicLabel):
    delete enchantedAttribute.
end.
      