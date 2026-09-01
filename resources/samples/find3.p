/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true}*/
procedure myProc:

    DEFINE buffer b_vac for Vacation.

    find first b_vac where rowid(b_vac) = "123456789" no-lock.

    if available b_vac
    then message b_vac.
    else message "Error".
end procedure.