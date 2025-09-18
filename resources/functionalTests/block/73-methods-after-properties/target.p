class OpenEdge.DataAdmin.Core.JSONWriter inherits DataAdminWriter implements IDataAdminExporter:  
    define public property Formatted as logical no-undo init true
        get.
        set. 
    
    constructor public JSONWriter (  ):
        super ().
    end constructor.
         
    method public void WriteToFile(serializable as IDataAdminSerializable,
                                   pcFile       as char,
                                   pccollection as char):
    end method.
      
end class.