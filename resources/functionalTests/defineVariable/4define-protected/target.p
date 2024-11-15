/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

define protected variable mBuffer                     as handle no-undo.
	
define protected variable ValidRecordsPerBlockNumbers as char   no-undo init "1,2,4,8,16,32,64,128,256".
define protected variable ValidRecordsPerBlockString  as char   no-undo init "1, 2, 4, 8, 16, 32, 64, 128 and 256".
/* area type names */
define protected variable AreaTypeNames               as char   no-undo extent 7 init ["Undefined","Undefined","Recovery","Transaction log","Event log","Data","Rollforward recovery"].

