/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true}*/
find first Vacation where 
           Vacation.Id = 1 and
           Vacation.Date <> ?
           no-lock no-error.