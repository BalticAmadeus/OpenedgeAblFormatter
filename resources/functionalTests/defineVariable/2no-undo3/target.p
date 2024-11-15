/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

define variable service         as OpenEdge.DataAdmin.IDataAdminService          no-undo.
define variable tableCollection as OpenEdge.DataAdmin.IDataAdminCollection       no-undo.
define variable tableIter       as OpenEdge.DataAdmin.Lang.Collections.IIterator no-undo.
define variable tablepolicy     as OpenEdge.DataAdmin.ICdcTablePolicy            no-undo.   
define variable fieldpolicy     as OpenEdge.DataAdmin.ICdcFieldPolicySet         no-undo.
define variable i               as int                                           no-undo.
define variable polStr          as longchar                                      no-undo.
define variable tblName         as char                                          no-undo.
define variable tblList         as longchar                                      no-undo.
define variable polCnt          as int                                           no-undo.
define variable errMsg          as char                                          no-undo.
define variable j               as int                                           no-undo.
define variable polEntry        as integer                                       no-undo.
