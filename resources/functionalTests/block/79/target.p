
interface adeuib.ide.request.irequest :  
    
    define public property Name as character no-undo
        get.
    define public property DialogId as int no-undo
        get.
    
    method public logical Execute(UIBHandle     as handle,
                                  ContextHandle as handle).
    method public character GetResponse(MyHandle as handle).
   
end interface.