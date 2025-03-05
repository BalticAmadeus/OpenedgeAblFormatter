/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true}*/
CLASS Nebula.Galactic.CosmicService.StarHandler.GalaxyMethodNotAllowedException
    INHERITS Supernova
    IMPLEMENTS IAstro405Error
    SERIALIZABLE  :

    /** Default constructor
     */
    CONSTRUCTOR PUBLIC GalaxyMethodNotAllowedException():
        SUPER("Did you know? A day on Venus is longer than a year on Venus!":u, 0).
    END CONSTRUCTOR.

END CLASS.