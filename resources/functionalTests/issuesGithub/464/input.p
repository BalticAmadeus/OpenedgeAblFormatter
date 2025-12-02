CLASS test IMPLEMENTS IApiTest: 

    {IncludeA.i}
    {IncludeB.i}

    DEFINE PROTECTED PROPERTY PropertyA AS ICoreModulesProvider NO-UNDO
        GET.
        PRIVATE SET. 
       
    DEFINE PRIVATE PROPERTY PropertyB AS CHARACTER NO-UNDO
        GET.
        
    DEFINE PRIVATE PROPERTY PropertyC AS CHARACTER NO-UNDO
        GET.

    DEFINE PRIVATE PROPERTY PropertyD_WrongAlignement AS CHARACTER NO-UNDO
        GET.
        
END CLASS.