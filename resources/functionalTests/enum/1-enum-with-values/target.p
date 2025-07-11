/* formatterSettingsOverride */
/*  { "AblFormatter.bodyFormatting": true,
      "AblFormatter.enumFormatting": true}*/

ENUM Oper:
    DEFINE ENUM Invalid = 0
                Create = 1
                Delete = 2
                BeforeUpdate = 3
                AfterUpdate = 4
                FieldDelete = 5
                PartitionDrop = 6
                PartitionTruncate = 7
                PartitionDeallocate = 8
                MTPartitionDeallocate = 9
                MTPartitionDrop = 10
                MergePartitionDrop = 11
                FieldAdd = 12.
END ENUM.
      