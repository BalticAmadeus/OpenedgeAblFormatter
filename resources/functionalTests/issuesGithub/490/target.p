iarg = SUBSTRING(iarg, 1 , (LENGTH(iarg) - 1)).

/*Inner parentheses for an argument inside SUBSTRING function results in parser error*/