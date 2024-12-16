/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

define VARIABLE hRowBefore         AS HANDLE    NO-UNDO.
define VARIABLE cUpdColumnsByTable AS CHARACTER NO-UNDO.
define VARIABLE hRowUpdFld         AS HANDLE    NO-UNDO.
define VARIABLE hRowOldFld         AS HANDLE    NO-UNDO.
define VARIABLE hDBField           AS HANDLE    NO-UNDO.
define VARIABLE iField             AS INTEGER   NO-UNDO.
define VARIABLE iTable             AS INTEGER   NO-UNDO.
define VARIABLE cFromField         AS CHARACTER NO-UNDO.
define VARIABLE cToField           AS CHARACTER NO-UNDO.
define VARIABLE lColumnChanged     AS LOGICAL   NO-UNDO.
define VARIABLE iBracket           AS INTEGER   NO-UNDO.
define VARIABLE iExtent            AS INTEGER   NO-UNDO.
define VARIABLE cRowIdent          AS CHARACTER NO-UNDO.
define VARIABLE cRowid             AS CHARACTER NO-UNDO.
define VARIABLE cExclude           AS CHARACTER NO-UNDO.
define VARIABLE cUpdColumns        AS CHARACTER NO-UNDO.
define VARIABLE cColumnsByTable    AS CHARACTER NO-UNDO.
define VARIABLE cColumns           AS CHARACTER NO-UNDO.
define VARIABLE lChanged           AS LOGICAL   NO-UNDO.
define VARIABLE cNotChanged        AS CHARACTER NO-UNDO.
define VARIABLE cAssignFields      AS CHARACTER NO-UNDO.
define VARIABLE cUseAssignFields   AS CHARACTER NO-UNDO.
define VARIABLE cDataColumns       AS CHARACTER NO-UNDO.
define VARIABLE lAmbiguous         AS LOGICAL   NO-UNDO.
define VARIABLE lCreate            AS LOGICAL   NO-UNDO.
define VARIABLE lLarge             AS LOGICAL   NO-UNDO.
define VARIABLE cLargeList         AS CHARACTER NO-UNDO.
define VARIABLE iLarge             AS INTEGER   NO-UNDO.