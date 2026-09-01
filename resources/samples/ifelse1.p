/* formatterSettingsOverride */
/* {
"AblFormatter.blockFormatting": true,
"AblFormatter.ifFormatting": true,
} */
define variable a as integer no-undo.
define variable b as integer no-undo.
define variable iCount as integer no-undo.
define variable iTotal as integer no-undo.

if a < b or a > b then do:message "not equals".
end.
else do:
do while a < 100:
if a = b then message "equals".
else message "error".
end.
end.

do iCount = 1 to 5:
iTotal = iTotal + iCount.
if iTotal = 3 then message "3".
    end.
display iTotal.