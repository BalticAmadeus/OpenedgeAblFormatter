/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true,
      "abl.completion.upperCase": true}*/

DEFINE temp-table ttCustomer no-undo
 field custNum   as integer
 field firstName as character
 field lastName  as character
 field birthDate as date
        index custNum is primary unique custNum
        index firstName firstName
        index lastName lastName.