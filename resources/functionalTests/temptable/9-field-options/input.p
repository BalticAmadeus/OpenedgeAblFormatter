/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true }*/

DEFINE {&ACCESS} TEMP-TABLE ttNetworkStructure NO-UNDO {&REFERENCE-ONLY}
    FIELD NetworkKey AS CHARACTER FORMAT "x(36)":U LABEL "NetworkGuid"
    FIELD ParentNetworkKey AS CHARACTER FORMAT "x(36)":U LABEL "ParentNetworkGuid"
    FIELD NetworkName AS CHARACTER FORMAT "x(20)":U LABEL "NetworkName"
    FIELD NetworkTooltip AS CHARACTER FORMAT "x(60)":U LABEL "Tooltip"
    FIELD NetworkStructureType AS CHARACTER FORMAT "x(12)":U LABEL "NetworkStructureType"
    FIELD NetworkBeginsAGroup AS LOGICAL FORMAT "yes/no":U INITIAL "no":U LABEL "NetworkBeginsAGroup"
    FIELD NetworkSmallImage AS CHARACTER FORMAT "x(40)":U LABEL "NetworkSmallImage"
    FIELD NetworkLargeImage AS CHARACTER FORMAT "x(40)":U LABEL "NetworkLargeImage"
    FIELD NetworkSequence AS INTEGER FORMAT "->,>>>,>>9":U INITIAL "0":U LABEL "NetworkSequence"
    FIELD FunctionKey AS CHARACTER FORMAT "x(36)":U LABEL "FunctionGuid"
    FIELD HasChild AS LOGICAL FORMAT "yes/no":U INITIAL "FALSE":U LABEL "HasChild"

    INDEX NetworkKey AS UNIQUE PRIMARY NetworkKey ASCENDING
    INDEX ParentNetworkKeySequence ParentNetworkKey ASCENDING NetworkSequence ASCENDING
.
