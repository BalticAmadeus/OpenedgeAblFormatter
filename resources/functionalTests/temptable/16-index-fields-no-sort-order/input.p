/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true } */

DEF TEMP-TABLE tt-nosort NO-UNDO
    FIELD fldId   AS INT
    FIELD fldName AS CHAR
    INDEX idx1  fldId
    INDEX idx2  fldName fldId.
