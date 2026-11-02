package com.example.studio.controller;

import com.example.studio.mapper.TemplateMapper;
import com.example.studio.model.Template;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateMapper templateMapper;

    public TemplateController(TemplateMapper templateMapper) {
        this.templateMapper = templateMapper;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String channel,
                                    @RequestParam(required = false) String category) {
        List<Map<String, Object>> items = templateMapper.select(channel, category).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        return body;
    }

    @GetMapping("/categories")
    public Map<String, Object> categories(@RequestParam(required = false) String channel) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", templateMapper.selectCategories(channel));
        return body;
    }

    @GetMapping("/{id}")
    public Map<String, Object> detail(@PathVariable String id) {
        Template template = templateMapper.selectById(id);
        if (template == null) {
            throw new com.example.studio.common.ApiException(404, "模板不存在或已下架");
        }
        return toDto(template);
    }

    private Map<String, Object> toDto(Template t) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", t.getId());
        dto.put("title", t.getTitle());
        dto.put("description", t.getDescription());
        dto.put("channel", t.getChannel());
        dto.put("category", t.getCategory());
        dto.put("coverUrl", t.getCoverUrl());
        dto.put("requiredImageCount", t.getRequiredImageCount());
        dto.put("acceptedMimeTypes", Arrays.asList(t.getAcceptedMimeTypes().split(",")));
        dto.put("maxFileSizeBytes", t.getMaxFileSizeBytes());
        return dto;
    }
}
