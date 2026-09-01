/* formatterSettingsOverride */
/* {
"AblFormatter.blockFormatting": true,
"AblFormatter.caseFormatting": true,
} */
define variable a as integer no-undo.
define variable b as integer no-undo.
define variable c as integer no-undo.
define variable d as integer no-undo.

message "start".

if a = b then do:
    if b = c then do:
        case d:
            when a then
                message "a".
            when b then
                message "b".
            when c then do:
                message "Wtf".
            end.
            otherwise
                message "aaa".
        end case.
    end.
    else do:
        message "14".
        
        repeat while a < d:
            if a * 2 > d then message ">".
            else do:
                message "Abc".
            end.
            
            a = a + 1.
        end.
    end.
end.
else message "Else".

message "End".