/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.statementFormatting": true}*/

PROCEDURE proc:
    DEFINE VAR err AS PROGRESS.Lang.AppError.
        
    err = NEW PROGRESS.Lang.AppError("The car cannot be rented",1).
    err:AddMessage ("No driver's license was provided", 98).

    RETURN ERROR err.
END.