/* Test file for selective formatting */
/* Assignment 0: column 16, has parenthesized expressions - should use split logic */
iInstance                       = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

ASSIGN iInstance                = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

iInstance                       = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

iInstanceaaaaaaaaaaaaaaaaaaaaaa = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

a = (b + c) *  (d - e) / f.

ASSIGN 
iInstance                       
                                     = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

/* Assignment 1: column 33, has parenthesized expressions - should use split logic */
                                iVariable = (b + c) *    (d - e) / f.

/* Assignment 2: column 33, has parenthesized expressions - should use split logic */
                                iOtherVar = (a + b) *     (c - d).

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
        ASSIGN iInstance    = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1,  INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1
            cInstanceID     = cInstanceID + "(" + STRING(iInstance) + ")"
            plDuplicateName = TRUE.
    END. /* IF CAN-FIND(FIRST Instance WHERE Instance.ID = cInstanceID AND Instance.contPath = pcPath AND Instance.contName = pcFile) THEN */
END. /* IF NOT plRuntime THEN */
