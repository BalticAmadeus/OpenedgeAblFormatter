/* formatterSettingsOverride */
/* { 
"AblFormatter.blockFormatting": true,
"AblFormatter.temptableFormatting": true,
"AblFormatter.temptableFormattingEndDotLocation": "Same",
"abl.completion.upperCase": true
} */
DEFINE TEMP-TABLE foo NO-UNDO FIELD a AS CHARACTER FIELD b AS CHARACTER FIELD c AS CHARACTER INDEX x a ASC b DESC c.

        DEFINE TEMP-TABLE temp-item
        FIELD cat-page  
        LIKE Item.CatPage
        FIELD inventory LIKE Item.Price LABEL "Inventory Value"
        INDEX cat-page  
        IS PRIMARY cat-page ASCENDING
        INDEX inventory-value inventory DESCENDING.

DEFINE SERIALIZABLE TEMP-TABLE ttCustomer NO-UNDO REFERENCE-ONLY LIKE Customer INDEX CustNum IS PRIMARY UNIQUE CustNum.