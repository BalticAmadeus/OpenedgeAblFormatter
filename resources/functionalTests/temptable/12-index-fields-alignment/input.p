/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true } */

DEF TEMP-TABLE tt-avonlea NO-UNDO
    FIELD pk-blythe     AS CHAR
    FIELD code-avonlea  AS CHAR
    FIELD status-green  AS CHAR
    FIELD date-gables   AS DATE
    FIELD name-shirley  AS CHAR
    FIELD rowid-avonlea AS ROWID
    FIELD rn-cuthbert   AS CHAR
    FIELD fj-liniment   AS CHAR
    INDEX idx1  pk-blythe ASCENDING
    INDEX idx2  code-avonlea ASCENDING
    INDEX idx3  date-gables ASCENDING.