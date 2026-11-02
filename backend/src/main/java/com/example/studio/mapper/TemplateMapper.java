package com.example.studio.mapper;

import com.example.studio.model.Template;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface TemplateMapper {

    List<Template> select(@Param("channel") String channel,
                          @Param("category") String category);

    Template selectById(@Param("id") String id);

    List<String> selectCategories(@Param("channel") String channel);
}
