 CASE v:
        WHEN "DEFAULT" THEN  fixed_font = ?.
        WHEN ?         THEN fixed_font = 0.
        OTHERWISE DO:
          ASSIGN fixed_font = INTEGER(v) NO-ERROR.
          IF ERROR-STATUS:ERROR THEN fixed_font = 0.
        END.
  END CASE. 