/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.propertyFormatting": true }*/
 
class Writer implements IWebRequest:
    define static public property Registry as BuilderRegistry no-undo
        get():
            define variable oRegistry as BuilderRegistry no-undo.
            do:
                do transaction:
                    fun(33).
                end.
                AuthenticationRequestWriterBuilder:InitializeRegistry(oRegistry).
            end.
            return AuthenticationRequestWriterBuilder:Registry.
        end get.
        private set.
     
end class.