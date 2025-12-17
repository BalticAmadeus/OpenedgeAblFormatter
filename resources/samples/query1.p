/* formatterSettingsOverride */
/*  { "AblFormatter.expressionFormattingLogicalLocation": "New"}*/


DEFINE QUERY q-order FOR Customer.

OPEN QUERY q-order 
FOR EACH Customer where Customer.CustNum = 12345.

GET FIRST q-order.

DO WHILE AVAILABLE Customer:
    DISPLAY Customer.CustNum Customer.Name SKIP
      Customer.Phone SKIP
      Order.OrderNum Order.OrderDate SKIP
      OrderLine.LineNum OrderLine.Price OrderLine.Qty SKIP
      Item.ItemNum Item.ItemName SKIP
      Item.CatDesc VIEW-AS EDITOR SIZE 50 BY 2 SCROLLBAR-VERTICAL
      WITH FRAME ord-info CENTERED SIDE-LABELS TITLE "Order Information".
  
    /* Allow scrolling, but not modification, of CatDesc. */
    ASSIGN
        Item.CatDesc:READ-ONLY IN FRAME ord-info = TRUE
        Item.CatDesc:SENSITIVE IN FRAME ord-info = TRUE
        .
  
    PAUSE.
    GET NEXT q-order.
END. /* DO WHILE AVAILABLE Customer */ 