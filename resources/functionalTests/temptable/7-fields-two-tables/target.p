/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true,
      "abl.completion.upperCase": true}*/

DEFINE TEMP-TABLE tDataSource
    FIELD TargetProc   AS HANDLE
    FIELD DataSource   AS HANDLE
    FIELD ObjectName   AS CHAR
    FIELD DocumentPath AS CHAR /* Consumer only */
    FIELD Commit       AS LOG
    INDEX DataSource AS UNIQUE TargetProc DataSource
    INDEX ObjectName ObjectName TargetProc
    INDEX DocumentPath DocumentPath TargetProc
    INDEX Commit TargetProc Commit.
    
/** Producer temp-tables **/
/* Register all datasource/methods that update nodes with out parameters */ 
DEFINE TEMP-TABLE tMethodNode
    FIELD TargetProc   AS HANDLE
    FIELD DataSource   AS HANDLE
    FIELD Method       AS CHAR
    FIELD MethodNode   AS DEC
    FIELD NumParam     AS INT
    INDEX Method AS UNIQUE TargetProc DataSource Method
    INDEX Node TargetProc MethodNode. 