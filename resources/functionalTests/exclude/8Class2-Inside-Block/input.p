class Cosmos.DataAdmin.DataSource.GalaxyUserPermissionDataSource inherits GalaxyUserDataSource  : 
   
@AblFormatterExcludeStart.
    define variable cometSave as logical no-undo.
    define private property NebulaTenantURL as character no-undo get. set.

    define public property StarExternalIDValue as character no-undo get. private set.
    
    define private variable constellationMapping as char
       init  "NebulaConstellation".
     no-undo.
@AblFormatterExcludeEnd.
end class.