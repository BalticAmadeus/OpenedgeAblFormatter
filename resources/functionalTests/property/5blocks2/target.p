/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.propertyFormatting": true }*/
 
class myRequest implements IWebRequest:
    define public property Version as character no-undo
        get():
            return web-context:get-cgi-value("ENV", "SERVER_PROTOCOL").
        end get.
        set(cProp as char):
            undo, throw new AppError(GetReadOnlyMessage(),?).
        end set.
    
    define public property ContentType as character no-undo
        get():
            return web-context:get-cgi-value("ENV", "CONTENT_TYPE").
        end get.
        set(cProp as char):
            undo, throw new AppError(GetReadOnlyMessage(),?).
        end set.
    
end class.