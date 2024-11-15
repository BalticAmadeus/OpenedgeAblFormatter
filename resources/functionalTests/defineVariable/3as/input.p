/* formatterSettingsOverride */
/*  { "AblFormatter.variableDefinitionFormatting": true} */

define VARIABLE cName   AS CHARACTER            NO-UNDO FORMAT "x(30)" INITIAL "Unknown" LABEL "Customer Name".

/* Example : Variable with decimals */ 
define VARIABLE rPrice AS DECIMAL NO-UNDO DECIMALS 2 FORMAT "->,>>>,>>9.99" INITIAL 0 LABEL "Price".
