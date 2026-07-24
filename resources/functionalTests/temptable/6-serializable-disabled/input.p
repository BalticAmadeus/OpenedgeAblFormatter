/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": false}*/

DEFINE SERIALIZABLE TEMP-TABLE ttCustomer NO-UNDO REFERENCE-ONLY LIKE Customer INX CustNum I PRIMARY UNIQUE ustNum
    INDEX CustNum IS PRIMARY UNIQUE CustNum.