/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

PROCEDURE addEntry:
    DEFINE VARIABLE new_lang AS CHARACTER NO-UNDO EXTENT 1 INITIAL ["Reading Schema..."].
    DEFINE VARIABLE c        AS CHARACTER NO-UNDO.
    DEFINE VARIABLE useVar   AS LOGICAL   NO-UNDO INIT YES.
    DEFINE VARIABLE totLen   AS INT       NO-UNDO.
    DEFINE VARIABLE iNum     AS INTEGER   NO-UNDO INIT 0.



END PROCEDURE.
