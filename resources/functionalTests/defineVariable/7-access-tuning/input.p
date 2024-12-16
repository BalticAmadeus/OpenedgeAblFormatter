/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */


define public variable mPartitionAfterQuery    as   handle   no-undo.
define private variable ValidDefaultLevelList   as   char     no-undo   init "0,1,2".
define protected variable ValidDefaultLevelString as   char    no-undo   init "~"0~" ~"1~" and ~"2~"".