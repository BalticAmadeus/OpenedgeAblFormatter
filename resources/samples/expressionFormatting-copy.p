/* Test file for selective formatting */
/* Assignment 0: column 16, has parenthesized expressions - should use split logic */
iInstance = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

ASSIGN
    iInstance = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1
    .

iInstance = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

iInstanceaaaaaaaaaaaaaaaaaaaaaa = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

a = (b + c) * (d - e) / f.


/* Assignment 1: column 33, has parenthesized expressions - should use split logic */
                                iVariable = (b + c) * (d - e) / f.

/* Assignment 2: column 33, has parenthesized expressions - should use split logic */
                                iOtherVar = (a + b) * (c - d).

/* Assignment 3: column 3, has parenthesized expressions BUT column <= 30 - should use normal formatting */
a = (b + c) * (d - e) / f.

/*If the object is in design mode, we have to check for duplicate names.*/
IF NOT plRuntime AND
   (pcInstance = "" OR
   pcInstance = ?) THEN
DO:
    FIND LAST Instance WHERE Instance.ID BEGINS cInstanceID AND
                             Instance.contPath = pcPath AND
                             Instance.contName = pcFile
                             USE-INDEX cWidgetID
                             NO-LOCK NO-ERROR.
    IF AVAILABLE (Instance) THEN
    DO:
        ASSIGN
            iInstance       = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1
            cInstanceID     = cInstanceID + "(" + STRING(iInstance) + ")"
            plDuplicateName = TRUE
            .
    END. /* IF CAN-FIND(FIRST Instance WHERE Instance.ID = cInstanceID AND Instance.contPath = pcPath AND Instance.contName = pcFile) THEN */
END. /* IF NOT plRuntime THEN */


PROCEDURE options_enable.
DO WITH FRAME dialog-1:
  RUN adeshar/_qset.p ("SetOperatorsVisible.ip",application,FALSE).
  RUN adeshar/_qset.p ("SetJoinOperatorsVisible.ip",application,FALSE).
 
  ASSIGN
     eCurrentTable:VISIBLE             = FALSE
     lbl-handle                        = eCurrentTable:SIDE-LABEL-HANDLE
     lbl-handle:VISIBLE                = FALSE
     lLeft:VISIBLE                     = FALSE
     l_label-2:VISIBLE                 = FALSE
     lRight:VISIBLE                    = FALSE
     whLeft[1]:VISIBLE                 = FALSE
     whLeft[2]:VISIBLE                 = FALSE
     whLeft[3]:VISIBLE                 = FALSE
     whLeft[4]:VISIBLE                 = FALSE
     whLeft[5]:VISIBLE                 = FALSE
     whRight[1]:VISIBLE                = FALSE
     whRight[2]:VISIBLE                = FALSE
     whRight[3]:VISIBLE                = FALSE
     whRight[4]:VISIBLE                = FALSE
     whRight[5]:VISIBLE                = FALSE
     lBrowseLabel:VISIBLE              = FALSE
     bAdd:VISIBLE                      = FALSE
     bRemove:VISIBLE                   = FALSE
     eDisplayCode:VISIBLE              = FALSE
     bUp:VISIBLE                       = FALSE
     bDown:VISIBLE                     = FALSE
     lbl-handle                        = eFieldLabel:SIDE-LABEL-HANDLE
     lbl-handle:VISIBLE                = FALSE
     eFieldLabel:VISIBLE               = FALSE
     lbl-handle                        = eFieldFormat:SIDE-LABEL-HANDLE
     lbl-handle:VISIBLE                = FALSE
     eFieldFormat:VISIBLE              = FALSE
     bFieldFormat:VISIBLE              = FALSE
     tIndexReposition:VISIBLE          = FALSE
     bTableSwitch:VISIBLE              = FALSE
     rsSortDirection:VISIBLE           = FALSE
     bUndo:VISIBLE                     = FALSE
     cShareType:VISIBLE                = FALSE
     tJoinable:VISIBLE                 = FALSE
     tAskRun:VISIBLE                   = FALSE 
     bFieldFormat:SENSITIVE            = FALSE
     eFieldLabel:SENSITIVE             = bFieldFormat:sensitive 
     eFieldFormat:SENSITIVE            = bFieldFormat:sensitive
     lSyntax:VISIBLE                   = TRUE
     tOnOk:VISIBLE                     = TRUE
     bCheckSyntax:VISIBLE              = TRUE
     _qrytune:NUM-LOCKED-COLUMNS       = 4
     _qrytune:VISIBLE                  = TRUE
     lqrytune:SCREEN-VALUE             = lqrytune
     lqrytune:VISIBLE                  = TRUE
     _TuneOptions:VISIBLE              = TRUE
     _TuneOptions:SENSITIVE            = TRUE
     lPhraseLabel:VISIBLE              = TRUE
     tKeyPhrase:VISIBLE                = TRUE
     tSortByPhrase:VISIBLE             = TRUE
     .

  RUN adeshar/_qset.p ("setQueryTune",application,TRUE).
	   
  IF application BEGINS "Results_Where":U THEN 
    FRAME DIALOG-1:TITLE = "Fields Selection".
END.
END PROCEDURE.