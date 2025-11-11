/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true,
    "abl.completion.upperCase": false}*/
procedure myProc:
@AblFormatterExcludeStart.

    DEFINE buffer b_vac for Vacation.

    find first b_vac  
    no-lock no-error.


    if available b_vac
    then message b_vac.
    else message "Error".
@AblFormatterExcludeEnd.
    end procedure.