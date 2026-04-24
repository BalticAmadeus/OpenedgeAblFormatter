/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true}*/
define variable test as character no-undo.

do while true:

    update test.

    case test:
        when "a" then
            message "a".
        when "b" then
            message "b".
        when "c" then
            message "c".
        when "e" then
            leave.
        otherwise
            message "something else".
    end case.

end.