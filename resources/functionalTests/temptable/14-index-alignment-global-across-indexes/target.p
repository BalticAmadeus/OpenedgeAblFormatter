/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true } */

DEF TEMP-TABLE tt-indexes NO-UNDO
    FIELD a              AS INT
    FIELD very-long-name AS INT
    INDEX idxA
          a              ASCENDING
    INDEX idxB
          very-long-name DESCENDING.
