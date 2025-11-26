IF Something > 0 THEN cMessage = "Hello".

    /* comment, */
    /* comment  */
    
ELSE cMessage = "Paka".

/* My temp-table */
define temp-table ttInfo //sdfsd

      /* ID Fields */
    field id    as integer   serialize-name "id"
    /* DATA Fields */
    field text  as character serialize-name "Text"
    field price as decimal   serialize-name "Price"
    index id.

assign
    /* Assign Values */
    ttInfo.id    = 1
    ttInfo.text  = "Sample"
    ttInfo.price = 99.99.

enum HashAlgorithmEnum: 
    define enum       /* RSA Message Digest Hash Algorithm, 
                         returns a 16-byte RAW binary message digest value.*/
                      MD5     =  0
                      /*  United States Government Secure Hash Algorithm, 
                          returns a RAW 20-byte binary message digest value.*/
                      SHA-1
                      /*  United States Government Secure Hash Algorithm,
                          returns a RAW 32-byte binary message digest value.*/
                      SHA-256
                      /*  United States Government Secure Hash Algorithm, 
                          returns a RAW 64-byte binary message digest value.*/
                      SHA-512
                      .
end enum.