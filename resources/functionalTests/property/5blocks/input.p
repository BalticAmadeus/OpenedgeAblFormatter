/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.propertyFormatting": true }*/
class AClass:
    define private property m_Total as integer no-undo
            get.
                        set.
    
    define PUBLIC PROPERTY propertyWidthGetterAndSetter AS SomeClass NO-UNDO
            GET:
                RETURN ?.
            END GET.
        SET(INPUT pValue AS SomeClass):
                    DO:
                        pValue:CallMethod().
                    END.
        END SET.
    
    define PRIVATE VARIABLE propertyWidthGetter1 AS SomeClass NO-UNDO.
    define PRIVATE VARIABLE propertyWidthGetter2 AS SomeClass NO-UNDO.
    define PRIVATE VARIABLE propertyWidthGetter3 AS SomeClass NO-UNDO.
    define PROTECTED PROPERTY propertyWidthGetter AS SomeClass NO-UNDO
            GET():
                            
                RETURN propertyWidthGetter_.
            END GET.
end class.