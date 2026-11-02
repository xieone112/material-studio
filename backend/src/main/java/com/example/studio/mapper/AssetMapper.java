package com.example.studio.mapper;

import com.example.studio.model.Asset;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface AssetMapper {

    int insert(Asset asset);

    Asset selectById(@Param("id") Long id);

    List<Asset> selectByIds(@Param("ids") List<Long> ids);
}
