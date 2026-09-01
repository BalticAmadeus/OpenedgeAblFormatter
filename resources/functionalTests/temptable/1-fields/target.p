/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true}*/

DEFINE TEMP-TABLE foo NO-UNDO
    FIELD a AS CHARACTER
    FIELD b AS CHARACTER
    FIELD c AS CHARACTER
    INDEX x
          a DESC
          b DESC
          c DESC.