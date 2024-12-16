/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

define VARIABLE lAutoCommit     AS LOGICAL   NO-UNDO.
// hi
define VARIABLE hDataQuery      AS HANDLE    NO-UNDO.
define VARIABLE lQueryContainer AS LOGICAL   NO-UNDO.
// yes
define VARIABLE lBrowsed        AS LOGICAL   NO-UNDO.
define VARIABLE hMsgSource      AS HANDLE    NO-UNDO.
define variable candidatePath   as character no-undo extent 2.
define variable candidateName   as character no-undo extent 2.
define variable matchedFiles    as Array     no-undo.
define variable iLoop           as integer   no-undo.
define variable iMatchScore     as integer   no-undo extent.
define variable iBestScore      as integer   no-undo initial 0.