/* My temp-table */
define temp-table ttInfo 
    /* ID Fields */
    field id    as integer   serialize-name "id" 
    
    /* DATA Fields */
    field text  as character    serialize-name "Text"
    field price as decimal   serialize-name "Price"
    index id.