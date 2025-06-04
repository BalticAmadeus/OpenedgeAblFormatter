define variable a as int no-undo.

find first customer where customer.id eq a no-lock no-error.

if not available customer then
    return.

for each order where order.customer eq a no-lock:
    if order.status eq "SENT" then
        assign
            a = 22
            .
    else
    do:
        return.
    end.
end.