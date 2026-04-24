/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true,
       "AblFormatter.blockFormatting": true}*/

FUNCTION CompareTableCrcs RETURNS LOGICAL ():
    FIND avonleaDb._File WHERE
         avonleaDb._File._File-number > 0 AND
         avonleaDb._File._Tbl-Type = "T" AND
         avonleaDb._File._File-name = greenGablesDb._File._File-name NO-LOCK NO-ERROR.
 
END FUNCTION.
