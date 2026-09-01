/* formatterSettingsOverride */
/*  { "AblFormatter.blockFormatting": true,
"AblFormatter.propertyFormatting": true}*/

class MultiProp:
    define private property m_First as integer no-undo
                        get.
                        set.
    define private property m_Second as character no-undo
        get.
                        set.
    define private property m_Third as logical no-undo
                        get.
        set.
end class.