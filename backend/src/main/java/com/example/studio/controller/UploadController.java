package com.example.studio.controller;

import com.example.studio.common.ApiException;
import com.example.studio.mapper.AssetMapper;
import com.example.studio.mapper.TemplateMapper;
import com.example.studio.model.Asset;
import com.example.studio.model.Template;
import com.example.studio.service.StorageService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final StorageService storageService;
    private final AssetMapper assetMapper;
    private final TemplateMapper templateMapper;

    public UploadController(StorageService storageService,
                            AssetMapper assetMapper,
                            TemplateMapper templateMapper) {
        this.storageService = storageService;
        this.assetMapper = assetMapper;
        this.templateMapper = templateMapper;
    }

    /**
     * 图片上传：服务端重新校验类型与大小（不信任前端校验），
     * 文件保存到后端本地目录，返回服务端可访问的素材地址。
     */
    @PostMapping
    public Map<String, Object> upload(@RequestHeader("X-User-Id") String userId,
                                      @RequestParam("file") MultipartFile file,
                                      @RequestParam(value = "templateId", required = false) String templateId) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(400, "请选择要上传的图片");
        }
        Template template = null;
        if (templateId != null && !templateId.isBlank()) {
            template = templateMapper.selectById(templateId);
            if (template == null) {
                throw new ApiException(404, "模板不存在或已下架");
            }
            String mime = file.getContentType();
            if (mime == null || !template.acceptedMimeList().contains(mime)) {
                throw new ApiException(400, "不支持的图片类型: " + mime);
            }
            if (file.getSize() > template.getMaxFileSizeBytes()) {
                throw new ApiException(400, "图片大小超过模板限制（"
                        + template.getMaxFileSizeBytes() / 1024 / 1024 + "MB）");
            }
        }

        StorageService.AssetSaveResult saved = storageService.save(file, userId);

        Asset asset = new Asset();
        asset.setAssetNo(UUID.randomUUID().toString().replace("-", ""));
        asset.setUserId(userId);
        asset.setTemplateId(templateId);
        asset.setOriginalName(saved.originalName);
        asset.setStoredPath(saved.storedPath);
        asset.setUrl(saved.url);
        asset.setMimeType(file.getContentType());
        asset.setSizeBytes(file.getSize());
        assetMapper.insert(asset);

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("assetId", asset.getId());
        dto.put("url", asset.getUrl());
        dto.put("originalName", asset.getOriginalName());
        dto.put("mimeType", asset.getMimeType());
        dto.put("sizeBytes", asset.getSizeBytes());
        return dto;
    }
}
