/* Test file for selective formatting */
/* Assignment 0: column 16, has parenthesized expressions - should use split logic */
iInstance        = (IF INDEX(Instance.ID, "(") GT 0 THEN INT(SUBSTRING(Instance.ID, INDEX(Instance.ID, "(") + 1, INDEX(Instance.ID, ")") - INDEX(Instance.ID, "(") - 1)) ELSE 1) + 1.

/* Assignment 1: column 33, has parenthesized expressions - should use split logic */
                                iVariable        = ( b + c ) * ( d - e ) / f.

/* Assignment 2: column 33, has parenthesized expressions - should use split logic */
                                iOtherVar        = (a + b) * (c - d).

/* Assignment 3: column 3, has parenthesized expressions BUT column <= 30 - should use normal formatting */
a = ( b + c ) * ( d - e ) / f.
