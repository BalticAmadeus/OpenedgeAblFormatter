/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true}*/
CLASS Nebula.Galactic.ModelFilter.StarModelFilter
    ABSTRACT USE-WIDGET-POOL:
    DEFINE VARIABLE oStarModel AS StarModel NO-UNDO.
    
    
    CONSTRUCTOR PUBLIC StarModelFilter(poStarModel AS StarModel):
        SUPER ().

        ASSIGN
            oStarModel = poStarModel
            .

    END CONSTRUCTOR.
END CLASS.