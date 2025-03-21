/* formatterSettingsOverride */
/*  {"AblFormatter.assignFormatting": true,
"AblFormatter.blockFormatting": true,
"AblFormatter.ifFormatting": true,
"abl.completion.upperCase": true}*/

CLASS r-CustObj FINAL:

/* Public properties to return basic values for a customer with the
    highest balance */
    DEFINE PUBLIC PROPERTY HighCustBalance AS DECIMAL INITIAL 0.0 NO-UNDO
    GET.
    PRIVATE SET.
    DEFINE PUBLIC PROPERTY HighCustNum AS INTEGER INITIAL ? NO-UNDO
    GET.
    PRIVATE SET.
    
    /* Public event to notify about Customers with Invoices */
    DEFINE PUBLIC EVENT CustHasInvoices
    SIGNATURE VOID ( piCustNum AS INTEGER ).
    
    /* Public handle variable for the high customer ProDataSet */
    DEFINE PUBLIC VARIABLE hHighCustData AS HANDLE NO-UNDO.
    
    /* Private temp-tables for the high customer ProDataSet */
    DEFINE PRIVATE TEMP-TABLE ttCust NO-UNDO LIKE Customer.
    DEFINE PRIVATE TEMP-TABLE ttInv  NO-UNDO LIKE Invoice.
    
    /* Private ProDataSet for a single customer with the highest
    balance and its invoices */
    DEFINE PRIVATE DATASET dsHighCustData FOR ttCust, ttInv
    DATA-RELATION FOR ttCust, ttInv
    RELATION-FIELDS (ttCust.CustNum, ttInv.CustNum).
    
    /* Private query and data sources for the ProDataSet */
    DEFINE PRIVATE QUERY qCust FOR Customer.
    DEFINE PRIVATE DATA-SOURCE srcCust FOR QUERY qCust.
    DEFINE PRIVATE DATA-SOURCE srcInv  FOR Invoice.
    
    /* Constructor to initialize handles and attach data sources */
    CONSTRUCTOR r-CustObj ( ):
    END CONSTRUCTOR.
    
    /* Public method to get the current high customer data */
    METHOD PUBLIC VOID GetHighCustomerData
    ( OUTPUT DATASET dsHighCustData BIND ):
    END METHOD.
    
    /* Public method to set (or reset) the current high customer data */
    METHOD PUBLIC VOID SetHighCustomerData ( ):
        hHighCustData:EMPTY-DATASET( ).
        FOR EACH Customer: /* Find Customer with highest balance */
            FIND FIRST Invoice WHERE Invoice.CustNum = Customer.CustNum NO-ERROR.
            IF AVAILABLE Invoice THEN DO:
                IF Customer.Balance > HighCustBalance THEN
                    ASSIGN  HighCustBalance = Customer.Balance
                HighCustNum     = Customer.CustNum.
                CustHasInvoices:Publish( Customer.CustNum ).
            END.
        END.
        QUERY qCust:QUERY-PREPARE("FOR EACH Customer "
        + "WHERE Customer.CustNum = " + STRING(HighCustNum) ).
        hHighCustData:FILL( ).
    END METHOD.

END CLASS.