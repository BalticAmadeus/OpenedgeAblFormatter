/* formatterSettingsOverride */
/*  {
}*/

FORM HEADER
   h_datetime FORMAT "x(17)" SPACE(7) "PROGRESS Report"
     "Page" AT 70 PAGE-NUMBER (rpt) FORMAT "ZZZ9" SKIP
   {&Header} FORMAT "x(80)" SKIP(1)
   {&Flags}  FORMAT "x(80)" SKIP
   WITH FRAME page_head_paged
   PAGE-TOP NO-LABELS NO-BOX NO-ATTR-SPACE NO-UNDERLINE USE-TEXT STREAM-IO.
