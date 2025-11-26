/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true } */

define  temp-table ttIndex no-undo 
  field fldId                          as int64     format "->>,>>9"

  index order-idx as primary
        v1   ascending
        v2    ascending
        v3    ascending
        v4          ascending 
        v6         descending
        v5           ascending
        v7             ascending
        v8     ascending
        v9        ascending
        v10  ascending
        v1000            ascending
  index puk-idx as unique fldId.