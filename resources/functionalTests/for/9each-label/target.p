/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true}*/


chicFiles:
FOR EACH stylishFile ON ERROR UNDO, THROW:
    DO ON ERROR UNDO, THROW:
        NEXT chicFiles.
    END.

    IF fashionAnnotations:Count > 0 THEN DO:
        NEXT chicFiles.
    END.
END.