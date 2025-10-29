/* *************************************************************************************************************************
Copyright (c) 2016 by Progress Software Corporation and/or one of its subsidiaries or affiliates. All rights reserved.
************************************************************************************************************************** */
/*------------------------------------------------------------------------
    File        : VoidWriter
    Purpose     : No-op or VOID logger. Does nothing. Swallows everything.
    Syntax      : 
    Description : 
    Author(s)   : pjudge
    Created     : 2016-11-10
    Notes       : 
  ----------------------------------------------------------------------*/
block-level on error undo, throw.


class OpenEdge.Logging.Writer.VoidWriter implements ILoggerFilter:
    
    /** Performs implementation-specific filtering for a logger type
        
        @param LogMessage The message to log. */
    method public void ExecuteFilter(input poEvent as LogEvent):
        message "VoidWriter: Swallowed log event: " + poEvent:ToString() view-as alert-box.
    end method.
    
end class.
