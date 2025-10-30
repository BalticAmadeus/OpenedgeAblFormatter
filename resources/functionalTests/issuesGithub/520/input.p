ASSIGN 
    var1 = var2
  &IF {&DELIM} <> ",":U &THEN
    tbllist = REPLACE (tbllist, {&DELIM}, ",":U)   
  &ENDIF
      change = yes.