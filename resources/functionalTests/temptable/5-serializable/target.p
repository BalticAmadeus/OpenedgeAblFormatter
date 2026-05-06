/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true}*/

DEFINE SERIALIZABLE TEMP-TABLE ttCustomer NO-UNDO REFERENCE-ONLY LIKE Customer
    INDEX CustNum IS PRIMARY UNIQUE
          ustNum 
    INDEX CustNum IS PRIMARY UNIQUE
          CustNum.