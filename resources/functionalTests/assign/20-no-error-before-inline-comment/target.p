/* formatterSettingsOverride */
/*  { "AblFormatter.assignFormatting": true,
"AblFormatter.assignFormattingAssignLocation": "New",
"AblFormatter.assignFormattingAlignRightExpression": "Yes",
"AblFormatter.assignFormattingEndDotLocation": "New aligned",
"AblFormatter.expressionFormatting": false}*/

    assign
        dtz = datetime-tz(integer(substring(pValue, 6, 2)),      // month
            integer(substring(pValue, 18, 2)),     // second
            0 )                                    // timezone
        no-error
        .
