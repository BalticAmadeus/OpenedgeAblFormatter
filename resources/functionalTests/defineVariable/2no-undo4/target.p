/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

define VARIABLE cName      AS CHARACTER NO-UNDO FORMAT "x(30)" INITIAL "Unknown".
define VARIABLE iAge       AS INTEGER   NO-UNDO LABEL "Age of Person" INITIAL 0.
define VARIABLE dBirthDate AS DATE      NO-UNDO FORMAT "99/99/9999" INITIAL TODAY.
define VARIABLE hBuffer    AS HANDLE    NO-UNDO INITIAL BUFFER Customer:HANDLE.
define VARIABLE mData      AS MEMPTR    NO-UNDO INITIAL ?.
define VARIABLE cJson      AS CHARACTER NO-UNDO EXTENT 5 INITIAL ["", "", "", "", ""].
define VARIABLE rAmount    AS DECIMAL   NO-UNDO FORMAT "->,>>>,>>9.99" INITIAL 0.
define VARIABLE lFlag      AS LOGICAL   NO-UNDO INITIAL FALSE.
define VARIABLE cXml       AS LONGCHAR  NO-UNDO INITIAL "".