/* formatterSettingsOverride */
/*  { "AblFormatter.ifFunctionFormatting": true,
      "AblFormatter.ifFunctionFormattingAddParentheses": "Yes",
      "AblFormatter.ifFunctionFormattingElseLocation": "New"}*/

result = (IF i > j THEN (IF j > k THEN "i > j > k" 
          ELSE (IF i > k THEN "i > k > j"
          ELSE "k > i > j"))
          ELSE (IF j > k THEN (IF i > k THEN "j > i > k"
          ELSE "j > k > i")
          ELSE "k > j > i")).
