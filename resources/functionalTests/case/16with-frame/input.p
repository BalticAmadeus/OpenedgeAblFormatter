/* formatterSettingsOverride */
/*  { "AblFormatter.caseFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.caseFormattingThenLocation": "Same",
"AblFormatter.caseFormattingStatementLocation": "New"}*/

CASE vButton:
    WHEN "Search":U THEN DO WITH FRAME {&FRAME-NAME}:
      vName = get-value("Name":U). /* Name value for customer search */
      FIND FIRST Customer WHERE Name >= vName share-LOCK NO-ERROR.
      IF NOT AVAILABLE(Customer) THEN 
        FIND FIRST Customer USE-INDEX Name share-LOCK NO-ERROR.
      IF NOT AVAILABLE(Customer) THEN
        Name:SCREEN-VALUE = "*** NO RECORDS ***":U.
    END.
END CASE.