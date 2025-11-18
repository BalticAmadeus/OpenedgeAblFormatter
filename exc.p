/* My temp-table */
define temp-table ttInfo
    /* ID Fields */
    field id    as integer   serialize-name "id"

    /* DATA Fields */
    field text  as character serialize-name "Text"
    index id.


assign
    cMessage = "Hello"
    /* comment, */
    /* comment  */
    cMessage = "Hello"
    .

IF Something > 0 THEN
    cMessage = "Hello". 
             
             /* comment, */
             /* comment  */
ELSE
    cMessage = "Paka".


assign
    cMessage = "Hello" // dsfs
    /* comment, */
    /* comment  */
    cMessage = "Hello"
    .