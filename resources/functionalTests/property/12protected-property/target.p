/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.propertyFormatting": true}*/

class ProtectedClass:
    define protected property Count as integer no-undo
        GET:
            RETURN 0.
        END GET.
        private set.
end class.