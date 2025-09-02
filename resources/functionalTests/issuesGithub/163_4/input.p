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