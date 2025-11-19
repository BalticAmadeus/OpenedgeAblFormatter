/* formatterSettingsOverride */
/*  { "AblFormatter.procedureParameterFormatting": true, 
      "AblFormatter.variableDefinitionFormatting": true} */

PROCEDURE proc:
    define INPUT        PARAMETER cipTitle       AS CHARACTER NO-UNDO.
    define INPUT-OUTPUT PARAMETER iiopFontNumber AS INTEGER   NO-UNDO.
    define OUTPUT       PARAMETER pressed_OK     AS LOGICAL   NO-UNDO.
    define RETURN       PARAMETER uResult        as LONG      NO-UNDO.    
END PROCEDURE.
