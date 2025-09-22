FOR EACH _BC WHERE_BC._x-recid = query-rec:
    FldList = FldList + (IF FldList EQ "":U THEN "":U ELSE ",":U) + _BC._DISP-NAME.
END.

ASSIGN
    p_Stat            = TRUE
    p_List:LIST-ITEMS = FldList
    .
       
