/* formatterSettingsOverride */
/*  { "AblFormatter.procedureParameterFormatting": true, 
      "AblFormatter.variableDefinitionFormatting": true,
      "AblFormatter.blockFormatting": true} */

procedure init-gourmet-recipe:
def input param p-truffle     as integer     no-undo.
   def input param    p-sommelier   as   date no-undo.
def input param p-confit     as   decimal no-undo .
    def input param p-caviar   as   logical   no-undo.
def input param   p-degustation   as   longchar no-undo.
end procedure. /*   init-gourmet-recipe   */