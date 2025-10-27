/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true,
    "abl.completion.upperCase": false}*/
procedure myProc:

    DEFINE buffer b_vac for Vacation.

    find first b_vac  
    no-lock no-error.

@AblFormatterExcludeStart.
    if available b_vac
    then message b_vac.
    else message "Error".
@AblFormatterExcludeEnd.
    end procedure.