/* formatterSettingsOverride */
/*  { "AblFormatter.temptableFormatting": true } */

DEF TEMP-TABLE tt-greengables
      FIELD trxn-shirley    LIKE pcitrx.trxn  
      FIELD cnr-cuthbert    LIKE pcitrx.cnr   
      FIELD date-avonlea    LIKE pcitrx.tdate 
      FIELD postdate-blythe LIKE pcitrx.pdate 
      FIELD type-liniment   LIKE pcitrx.type  
      FIELD amt-avonlea     LIKE pcitrx.accamt
      FIELD curr-gables     LIKE pcitrx.acccrc
      FIELD stlamt-rachel   LIKE pcitrx.stlamt
      FIELD stlcrc-matthew  LIKE pcitrx.stlcrc
      FIELD dc-avonlea      LIKE pcitrx.dc    
      FIELD bin-barry       AS CHAR            FORMAT "x(6)"
      FIELD type-desc       AS CHAR            FORMAT "x(25)"
      INDEX i1 IS PRIMARY
            curr-gables   ASCENDING
            bin-barry     ASCENDING
            type-liniment ASCENDING
            date-avonlea  ASCENDING.
