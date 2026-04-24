
FUNCTION GET_STUFF RETURNS Progress.Json.ObjectModel.JsonObject (cParam1 AS CHARACTER):
    DEFINE VARIABLE jsonTableRow AS Progress.Json.ObjectModel.JsonObject NO-UNDO.
    RETURN jsonTableRow.
END FUNCTION.