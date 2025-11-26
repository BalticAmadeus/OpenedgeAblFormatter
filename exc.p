
/* My temp-table */
define temp-table ttInfo //sdfsd
      /* ID Fields */
    field id    as integer   serialize-name "id"
    /* DATA Fields */
    field text  as character serialize-name "Text"
    field price as decimal   serialize-name "Price"
    index id.

assign // sfsdf
      /* Assign Values */
    ttInfo.id    = 1
    /* Assign Values */
    ttInfo.text  = "Sample"
    ttInfo.price = 99.99
    .
