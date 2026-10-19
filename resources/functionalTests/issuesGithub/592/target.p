/* formatterSettingsOverride */
/* { 
"AblFormatter.ifFormattingDoLocation": "New",
"AblFormatter.ifFunctionFormattingElseLocation": "New",
"AblFormatter.ifFormattingStatementLocation": "New",
"AblFormatter.ifFunctionFormattingAddParentheses": "Yes"
} */

CLASS test:

    METHOD PUBLIC FINAL VOID BehaviorAdded(INPUT pBehavior AS ICoreNetBehavior , INPUT pUidControl AS CHARACTER):       
        OnBehaviorAdded(pBehavior, pUidControl).
    END METHOD.

END CLASS.
