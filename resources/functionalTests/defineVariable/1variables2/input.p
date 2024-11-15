/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

define variable procHandle  as handle                  no-undo.
define variable procInfoList   as Array                   no-undo.
define variable procAnnotInfo              as ProcedureAnnotationInfo no-undo.
define variable testSuiteList          as TestInfo                no-undo.
define variable i              as integer                   no-undo.
define variable testSuiteCount as integer                 no-undo   init 0.
define variable annotationName as character               no-undo.
define variable testProcInfo   as TestInfo                no-undo.
define variable procTestEntity    as TestProcedure           no-undo.
define variable typeInfo       as TypeInfo                no-undo.
define variable ignoreTest     as logical           no-undo.
define variable isTestProc     as logical                 no-undo   initial no.
define variable testInfo       as TestInfo                no-undo.
