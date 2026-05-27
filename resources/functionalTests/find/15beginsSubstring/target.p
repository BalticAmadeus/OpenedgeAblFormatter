/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true}*/

FIND FIRST Orchard WHERE
           s-gables BEGINS SUBSTRING(Orchard.bough,3) AND
           substr(Orchard.bough,3) NE "" NO-LOCK NO-ERROR.
