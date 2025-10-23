IF x NE 0 AND
   BROWSE {&BROWSE-NAME}:NUM-ENTRIES < BROWSE {&BROWSE-NAME}:DOWN THEN DO:

    {src/adm2/brsoffnd.i}
END. /* if num-entries < down */
ELSE IF lScrollRemote THEN DO:
 
    cRowVis = DYNAMIC-FUNCTION("rowVisible":U,cRowids,hRowObj).
    CASE cRowVis:
        WHEN "FIRST":U THEN DO:
            FIND FIRST ttObjectNames WHERE
                       ObjectNames.cName = coContainer:SCREEN-VALUE NO-LOCK NO-ERROR.
        END.
        WHEN "LAST":U THEN DO:
            FIND LAST ttBrowser WHERE
                      Browser.cTTName = "Pages" NO-LOCK NO-ERROR.
        END.
    END CASE.
END.
