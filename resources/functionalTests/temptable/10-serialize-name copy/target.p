/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true } */

DEFINE {&ACCESS} TEMP-TABLE eSTPDataRequest NO-UNDO {&REFERENCE-ONLY}
    FIELD RootBridgeID     AS CHARACTER SERIALIZE-NAME "RootID":U
    FIELD BridgeID         AS CHARACTER SERIALIZE-NAME "BridgeID":U
    FIELD PortID           AS INTEGER  
    FIELD NextRootBridgeID AS CHARACTER
    FIELD NumPorts         AS INTEGER  
    FIELD PortStates       AS LOGICAL   SERIALIZE-NAME "PortStatus":U
    FIELD PrevRootBridgeID AS CHARACTER
    FIELD BPDU             AS RAW       SERIALIZE-NAME "BPDUMessage":U
    FIELD TCN              AS LOGICAL   SERIALIZE-NAME "TopologyChangeNotice":U
    FIELD MaxAge           AS INTEGER  
    FIELD VLANs            AS CHARACTER
    FIELD ConfigFields     AS CLOB      SERIALIZE-NAME "STPConfigFields":U
    INDEX idx IS UNIQUE VLANs.