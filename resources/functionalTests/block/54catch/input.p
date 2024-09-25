/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true}*/

catch oFunkyError as Progress.Lang.AppError : oGroovyResponse:errorStatus = true.
      oGroovyResponse:addMessage(oFunkyError:GetMessage(1)).
                  return oGroovyResponse.
end catch.