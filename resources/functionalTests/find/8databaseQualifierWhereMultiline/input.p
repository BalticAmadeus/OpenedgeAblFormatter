/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true,
       "AblFormatter.blockFormatting": true}*/

FUNCTION CompareTableCrcs RETURNS LOGICAL ():
   FIND FIRST sourcedb._File NO-LOCK WHERE
              sourcedb._File._File-number > 0 AND
              sourcedb._File._Tbl-Type = "T" AND
              sourcedb._File._File-name = compiledb._File._File-name NO-ERROR.

END FUNCTION.