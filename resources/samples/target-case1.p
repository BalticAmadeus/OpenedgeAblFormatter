/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true}*/
VAR CHAR qtr.
VAR INT iQuarter.

CASE iQuarter:
    WHEN 1 THEN
        qtr = "Q1".
    WHEN 2 THEN
        qtr = "Q2".
    WHEN 3 THEN
        qtr = "Q3".
    OTHERWISE
        qtr = "Q4".
END CASE.

MESSAGE "Today’s date is" TODAY SKIP 
        "The current quarter is" qtr.