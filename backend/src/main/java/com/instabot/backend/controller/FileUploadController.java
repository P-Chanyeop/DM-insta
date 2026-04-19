package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 파일 업로드 컨트롤러 — 이미지 DM 발송용
 * 업로드된 파일은 /uploads/ 디렉토리에 저장되고 공개 URL로 접근 가능
 */
@Slf4j
@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Value("${app.base-url:}")
    private String baseUrl;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        Long userId = SecurityUtils.currentUserId();

        // 검증
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일이 비어있습니다."));
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일 크기는 10MB 이하여야 합니다."));
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest().body(Map.of("error", "JPG, PNG, GIF, WebP 이미지만 업로드 가능합니다."));
        }

        try {
            // 저장 디렉토리 생성
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 고유 파일명 생성
            String ext = getExtension(file.getOriginalFilename());
            String filename = userId + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path filePath = uploadPath.resolve(filename);

            // 저장
            file.transferTo(filePath.toFile());
            log.info("파일 업로드 완료: userId={}, file={}, size={}KB", userId, filename, file.getSize() / 1024);

            // 공개 URL 반환
            String url = (baseUrl.isBlank() ? "" : baseUrl) + "/uploads/" + filename;

            return ResponseEntity.ok(Map.of(
                    "url", url,
                    "filename", filename,
                    "size", file.getSize()
            ));
        } catch (IOException e) {
            log.error("파일 업로드 실패: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", "파일 업로드에 실패했습니다."));
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : ".jpg";
    }
}
