/* formatterSettingsOverride */
/* { "AblFormatter.statementFormatting": true,
        "AblFormatter.statementFormatting": false} */

class orionCluster.ide.request._nebulaDesign abstract        inherits 
_request implements iGalacticDesign   :  

    define public property    AndromedaDynamic    as char     no-undo init "Dynamic":U   get.
    define          public property     CassiopeiaStatic as char no-undo init "Static":U get.
    define public property LyraNative as char    no-undo    init "Native":U 
    get.    
    define public property    PegasusRepository    as char 
    no-undo init "Repository":U    get.    
        
    define public property SiriusNewName as character no-undo get.    protected 
    set. 
    define public     property VegaLink as character no-undo 
    get. private    set. 
    define public property    AltairSaved 
    as logical    no-undo get.  private    set.
    define public property CygnusRepositoryObject   as logical no-undo get. 
    private set.
    define    public property    AquariusDynamic as logical 
    no-undo get. private set.
    define public property    DracoNative    as logical 
    no-undo get. private set.
        
    function getNebulaHwnd returns     integer 
(pcGalacticFile   as char)     in ContextHandle. 
    function createLinkedStarFile    returns char  
    (piHwnd as int, pcConstellationFileName as char) in ContextHandle. 
    function 
    setGalacticFileName returns logical (piHwnd    as integer, 
    pcFilename as char) in    ContextHandle.
        
end class.
