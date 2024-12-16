/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true,
      "abl.completion.upperCase": true}*/

DEFINE TEMP-TABLE IndexDetails
FIELD tblname AS CHARACTER
      FIELD idxname AS CHARACTER
      FIELD tdesc AS CHARACTER
      FIELD lactive AS LOGICAL
      FIELD lprimary AS LOGICAL
      FIELD lunique AS LOGICAL
      FIELD lwordindex AS LOGICAL
      FIELD labbrev AS LOGICAL.