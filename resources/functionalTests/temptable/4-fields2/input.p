/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true,
      "abl.completion.upperCase": true}*/

DEFINE TEMP-TABLE saSys NO-UNDO RCODE-INFORMATION
      FIELD    dType    AS    CHARACTER    LABEL    "Domain Type"    FORMAT    "x(25)"
      FIELD    dDescrip    AS    CHARACTER    LABEL    "Description"    FORMAT    "x(65)"
      FIELD    dDetails    AS    CHARACTER    LABEL    "Comments"    FORMAT    "x(200)"
      FIELD    dAuthEnabled    AS    LOGICAL    LABEL    "Enable Authentication"
      FIELD    dChecksum    AS    LOGICAL    LABEL    "Checksum"
      FIELD    dCallback    AS    CHARACTER    LABEL    "Callback"    FORMAT    "x(100)".
  