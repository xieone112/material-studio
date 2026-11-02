package com.example.studio.service;

import com.example.studio.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

/**
 * 本地文件存储：上传素材保存到后端本地目录，并通过 /files/uploads/** 对外提供访问。
 */
@Service
public class StorageService {

    private final Path uploadRoot;

    public StorageService(@Value("${app.upload-dir:./data/uploads}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public AssetSaveResult save(MultipartFile file, String userId) {
        String original = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename();
        String ext = extensionOf(original);
        String dateDir = java.time.LocalDate.now().toString();
        String storedName = UUID.randomUUID().toString().replace("-", "") + ext;
        Path dir = uploadRoot.resolve(dateDir);
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(storedName);
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            // url 路径与 WebMvcConfig 中的资源映射保持一致
            String url = "/files/uploads/" + dateDir + "/" + storedName;
            return new AssetSaveResult(target.toString(), url, original, file.getSize());
        } catch (IOException e) {
            throw new ApiException(500, "保存上传文件失败", e);
        }
    }

    public boolean exists(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            return false;
        }
        return Files.exists(Paths.get(storedPath));
    }

    public Path getUploadRoot() {
        return uploadRoot;
    }

    private String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0) {
            return "";
        }
        String ext = name.substring(dot).toLowerCase(Locale.ROOT);
        // 只保留常见图片扩展名，防止路径注入
        if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)")) {
            return "";
        }
        return ext;
    }

    public static class AssetSaveResult {
        public final String storedPath;
        public final String url;
        public final String originalName;
        public final long sizeBytes;

        public AssetSaveResult(String storedPath, String url, String originalName, long sizeBytes) {
            this.storedPath = storedPath;
            this.url = url;
            this.originalName = originalName;
            this.sizeBytes = sizeBytes;
        }
    }
}
