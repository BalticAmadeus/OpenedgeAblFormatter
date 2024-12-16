/* formatterSettingsOverride */
/*  { "AblFormatter.bodyFormatting": true,
      "AblFormatter.enumFormatting": true,
      "AblFormatter.assignFormattingEndDotLocation": "New"}*/

enum OpenEdge.Mobile.PushNotificationFilterOperandEnum: 
        define enum      
                          
Equals = 1 
        NotEqual
                          Includes 
                          NotIncludes 
                Matches 
                GreaterThan
                          GreaterOrEqual  LessThan 
                          LessOrEqual 
        Near
                NearSphere 
        Within
                          Intersects
        All
                          And
                Or
                          Not
                          Nor
                          
                          
   .
    end enum.