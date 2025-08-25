/* formatterSettingsOverride */
/*  { "AblFormatter.statementFormatting": true} */

field Rating as character label "Account Rating".
field Site as character label "Account Site"
field Foo as logical label "Foo" initial ?.
output to "test.txt".
field OwnerId as character label "Assigned Rep"
field CreatedDate as datetime-tz label "Created Date"
field CreatedById as character label "Created By ID"