/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.defineFormatting": true,
"abl.completion.upperCase": true,
"AblFormatter.temptableFormatting": true}*/

DEFINE TEMP-TABLE ttCustomer NO-UNDO
    FIELD CustNum AS INTEGER
    FIELD Name    AS CHARACTER.

DEFINE DATASET dsCustomer FOR ttCustomer.
