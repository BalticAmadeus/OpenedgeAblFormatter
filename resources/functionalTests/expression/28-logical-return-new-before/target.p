/* formatterSettingsOverride */
/*  {
      "AblFormatter.expressionFormatting": true,
      "AblFormatter.expressionFormattingLogicalLocation": "New before"
    }*/

FUNCTION f RETURNS LOGICAL ():
    RETURN a = b
           AND c = d
           OR e = f.
END FUNCTION.
