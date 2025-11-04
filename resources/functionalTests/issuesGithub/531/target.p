case pData:type:
    when DataTypeHelper:GetMask(DataTypeEnum:XmlDocument) then do:
        pData:save(DataTypeEnum:Memptr:ToString(), mXml).
    end.
end case.