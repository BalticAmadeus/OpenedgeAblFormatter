/* formatterSettingsOverride */
/*  { "AblFormatter.ifFormatting": true,
        "AblFormatter.assignFormatting": true,
        "AblFormatter.expressionFormatting": true,
        "AblFormatter.expressionFormattingLogicalLocation": "New"}*/
IF NOT AVAILABLE DICTDB THEN DO TRANSACTION:

    IF mss_username <> ? AND  mss_username <> "" THEN message "A".

            message "a".

            ASSIGN
        c = c + " " + mss_conparms
        .
END.