/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

PROCEDURE addEntry:
    define VARIABLE new_lang AS CHARACTER NO-UNDO EXTENT 1 INITIAL ["Reading Schema..."].
    define VARIABLE c        AS CHARACTER NO-UNDO.
    define VARIABLE useVar   AS LOGICAL   NO-UNDO INIT YES.
    define VARIABLE totLen   AS INT       NO-UNDO.
    define VARIABLE iNum     AS INTEGER   NO-UNDO INIT 0.



END PROCEDURE.
