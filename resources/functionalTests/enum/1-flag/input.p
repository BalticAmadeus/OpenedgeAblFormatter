/* formatterSettingsOverride */
/*  { "AblFormatter.bodyFormatting": true,
      "AblFormatter.enumFormatting": true}*/

ENUM LiteraryMood FLAGS:
 define ENUM None = 0
                  Joyful
                Melancholy
                Heroic
                        Whimsical
                  Epic
                            JoyfulMelancholy = Joyful,Melancholy
                Tragic = Epic.
END ENUM.