/* formatterSettingsOverride */
/*  { "AblFormatter.statementFormatting": true} */

class adeuib.ide.request._saverequest inherits  _designrequest: 
        function getDesignHwnd returns integer   (pcFile as char) in ContextHandle. 
  function getDesignWindow returns handle (piHwnd as integer) in ContextHandle.

      constructor public _saverequest (prequest as char ):
              super ( prequest ).
       end constructor.
end class.