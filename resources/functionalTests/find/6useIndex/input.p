/* formatterSettingsOverride */
/*  { "AblFormatter.findFormatting": true}*/

find Order where Order.OrderStatus = "Shipped" and Order.ShipDate = today use-index OrderNum.