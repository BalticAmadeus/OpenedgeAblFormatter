/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true} */

CLASS testablformatter:
    METHOD PUBLIC VOID DoSomething() : 
        
        FOR EACH vblink WHERE
                 vblink.control = obj NO-LOCK:
        END.
        
        CATCH ex AS Progress.Lang.Error :
            DEFINE VARIABLE vSomeCode AS INTEGER NO-UNDO.
            vSomeCode = 42.
        END CATCH.
        FINALLY:
            DEFINE VARIABLE vSomeCodeChar AS CHARACTER NO-UNDO.
            vSomeCodeChar = "42".
        END FINALLY.
    END METHOD. 

END CLASS.

