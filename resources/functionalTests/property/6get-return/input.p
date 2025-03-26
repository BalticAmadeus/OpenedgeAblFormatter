/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.propertyFormatting": true,
"AblFormatter.expressionFormatting": true }*/
 
CLASS TestProperty:

    define PROTECTED PROPERTY PropertyGetter AS CHARACTER NO-UNDO
        GET():
            RETURN   "test" + "".
        END GET.
                                
END CLASS.