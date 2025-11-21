/* formatterSettingsOverride */
/*  {"AblFormatter.ifFunctionFormattingElseLocation": "Same"}*/

/* Test case: IF function inside ASSIGN with extra whitespace */
ASSIGN
    iInstance = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1
    .
