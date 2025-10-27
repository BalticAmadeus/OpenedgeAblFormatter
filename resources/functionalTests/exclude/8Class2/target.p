class Cosmos.DataAdmin.DataSource.GalaxyUserPermissionDataSource inherits GalaxyUserDataSource  : 
   
    define variable cometSave as logical no-undo.
    define private property NebulaTenantURL as character no-undo
        get.
        set.
    
@AblFormatterExcludeStart.
    define public property StarExternalIDValue as character no-undo get. private set.
@AblFormatterExcludeEnd.
    
    define private variable constellationMapping as char init  "NebulaConstellation". no-undo.
end class.