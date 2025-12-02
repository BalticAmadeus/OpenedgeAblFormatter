/* CRLF issue + //// comment */

class Something:
    define variable cName  as character no-undo.
    define variable iValue as integer   no-undo.

    //// comment
    
    method public void something( ttSomething):
        
        define buffer bSomething for Something.
        
        for each ttSomething:
         
            create bSomething.
        end.
        
    end method.

end class.
