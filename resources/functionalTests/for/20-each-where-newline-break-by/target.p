/* formatterSettingsOverride */
/*  { "AblFormatter.forFormatting": true, "AblFormatter.forFormattingWhereLocation": "New"}*/

for each Parallelism
         where Parallelism.BalanceDate >= TODAY - 30
         break by Parallelism.StructureType:
    display Parallelism.Clause Parallelism.BalanceDate.
end.
