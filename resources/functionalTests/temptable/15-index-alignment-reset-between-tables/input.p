/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true } */

DEF TEMP-TABLE tt-first NO-UNDO
    FIELD f1 AS INT
    INDEX i1  extremely-long-field-name ASCENDING.

DEF TEMP-TABLE tt-second NO-UNDO
    FIELD f2 AS INT
    INDEX i2  x ASCENDING.
