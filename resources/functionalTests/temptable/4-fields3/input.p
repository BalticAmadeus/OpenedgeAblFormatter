/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true,
      "abl.completion.upperCase": true}*/

DEFINE TEMP-TABLE tAction NO-UNDO
      FIELD Name   AS CHAR
      FIELD Hdl   AS HANDLE
      FIELD RectHdl AS HANDLE
      FIELD DivideHdl AS   HANDLE
      FIELD TxtHdl  AS HANDLE
      FIELD Sort1  AS  INT
      FIELD Sort2    AS   INT 
      FIELD Link   AS   CHAR
      FIELD Menu     AS LOG
      FIELD Tool   AS   LOG
      INDEX Sort AS PRIMARY sort1 sort2.