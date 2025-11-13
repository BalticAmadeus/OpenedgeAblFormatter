/* formatterSettingsOverride */
/*  {
    "formFormattingEndDotLocation": "Same"
}*/

FORM
    Customer.CustNum LABEL "Customer Number"
    Customer.Name LABEL "Name" FORMAT "X(30)"
    Customer.Address FORMAT "X(35)"
    Customer.City FORMAT "X(25)"
    SKIP(2)
    "Total Orders:" AT 1
    Customer.OrderCount AT 20
    WITH FRAME custFrame WIDTH 80 TITLE "Customer Information" SIDE-LABELS.
