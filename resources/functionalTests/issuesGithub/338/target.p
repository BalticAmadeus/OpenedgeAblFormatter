ASSIGN
    tt_draw.tf_band = 2400
    tt_draw.tf_sctr = v_fc
    tt_draw.tf_seq  = 0
    tt_draw.tf_text = (IF qbf-detail = 0 THEN "Detail Aggregates":t20 /*
      tt_draw.tf_text = string(tt_draw.tf_band) + ":"
                      + string(tt_draw.tf_sctr,"99") + ":"
                      + string(tt_draw.tf_seq,"99") + " "
                      + (IF qbf-detail = 0 THEN "Detail Aggregates":t20
    */ ELSE IF v_fc = 1 THEN "Master Aggregates":t20 ELSE "Detail Aggregates":t20)
    .