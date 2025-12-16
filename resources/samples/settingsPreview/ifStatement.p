/* IF Statement */
DEFINE VARIABLE mss_username AS CHARACTER NO-UNDO.
IF mss_username <> ? AND
    mss_username <> "" THEN MESSAGE "A".
