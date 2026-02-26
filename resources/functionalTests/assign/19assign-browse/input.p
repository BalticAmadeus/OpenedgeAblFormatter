/* formatterSettingsOverride */
/*  { "AblFormatter.assignFormatting": true,
"AblFormatter.assignFormattingAssignLocation": "Same",
"AblFormatter.assignFormattingAlignRightExpression": "Yes",
"AblFormatter.assignFormattingEndDotLocation": "New aligned",
"AblFormatter.expressionFormatting": true}*/

ASSIGN
        vListId = tItem.id
        vReturnId = tItem.parid
                vMaxLength = browse brItem:width-chars
                        - length (tItem.type + vBatchName) - 4.