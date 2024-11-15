/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true}*/

CLASS Validation.Something
    INHERITS BaseStuff
    IMPLEMENTS IThing
    {&SERIALIZABLE}:

        METHOD PUBLIC OVERRIDE IType GetType():
         DEFINE VARIABLE oType AS IType NO-UNDO .
              RETURN oType .
        END METHOD.

END CLASS.
