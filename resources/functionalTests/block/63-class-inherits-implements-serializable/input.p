/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true}*/
CLASS Nebula.Galactic.ModelFilter.StarModelFilter
    INHERITS Supernova
    IMPLEMENTS IAstro405Error
    SERIALIZABLE  :
    
              CONSTRUCTOR PUBLIC StarModelFilter(poStarModel AS StarModel):
        SUPER("Did you know? A day on Venus is longer than a year on Venus!":u, 0).

        ASSIGN
            oStarModel = poStarModel
            .

        END CONSTRUCTOR.
END CLASS.