/* Parent the dialog-box to the ACTIVE-WINDOW, if there is no parent.   */
IF VALID-HANDLE(ACTIVE-WINDOW) AND FRAME {&FRAME-NAME}:PARENT eq ? THEN FRAME {&FRAME-NAME}:PARENT = ACTIVE-WINDOW.

RUN createObjects.

/* Now enable the interface and wait for the exit condition.            */
/* (NOTE: handle ERROR and END-KEY so cleanup code will always fire.    */
MAIN-BLOCK:
DO ON ERROR   UNDO MAIN-BLOCK, LEAVE MAIN-BLOCK
   ON END-KEY UNDO MAIN-BLOCK, LEAVE MAIN-BLOCK:
RUN initializeObject.
    WAIT-FOR GO OF FRAME {&FRAME-NAME} {&FOCUS-Phrase}.
END.


RUN destroyObject.