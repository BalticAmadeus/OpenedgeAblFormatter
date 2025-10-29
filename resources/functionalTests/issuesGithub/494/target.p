INPUT FROM VALUE(myFile.json) NO-ECHO NO-MAP
CONVERT TARGET ToPage Source FromPage.

OUTPUT TO VALUE(myFile.json)
CONVERT TARGET ToPage SOURCE FromPage.

/*Input from / Output to convert statement results in a parse error*/