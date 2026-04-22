/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.propertyFormatting": true}*/

class AClass:
    define public property Status as character no-undo
        GET:
            define variable cResult as character no-undo.
            do:
                cResult = "ok".
            end.
            return cResult.
        END GET.
        set.
end class.