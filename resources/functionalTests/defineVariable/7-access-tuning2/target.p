/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

define private variable mCreate                      as logical no-undo.
define         variable mPartitionAfterQuery         as handle  no-undo.
define private variable ValidTypeList                as char    no-undo init "Regular,Super".
define private variable ValidTypeString              as char    no-undo init "~"Regular~" or ~"Super~"".
define private variable ValidDefaultAllocationList   as char    no-undo init "Immediate,Delayed,None".
define private variable ValidDefaultAllocationString as char    no-undo init "~"Immediate~", ~"Delayed~" and ~"None~"".