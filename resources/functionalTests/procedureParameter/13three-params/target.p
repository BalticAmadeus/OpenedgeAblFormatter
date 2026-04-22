/* formatterSettingsOverride */
/*  { "AblFormatter.procedureParameterFormatting": true,
      "AblFormatter.variableDefinitionFormatting": true} */

PROCEDURE doWork:
    define INPUT        PARAMETER piAge    AS INTEGER   NO-UNDO.
    define OUTPUT       PARAMETER pcResult AS CHARACTER NO-UNDO.
    define INPUT-OUTPUT PARAMETER plFlag   AS LOGICAL   NO-UNDO.
END PROCEDURE.