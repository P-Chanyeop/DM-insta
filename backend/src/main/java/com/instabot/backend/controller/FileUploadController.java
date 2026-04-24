package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

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
            return ResponseEntity.badRequest().body(Map.of("error", "JPG, PNG, GIF, WebP 이미지만 업로드 가능합니다. (전달 타입: " + contentType + ")"));
        }

        try {
            // 저장 디렉토리 생성 — 절대경로로 해석해 CWD 이슈를 줄임.
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 고유 파일명 생성
            String ext = getExtension(file.getOriginalFilename());
            String filename = userId + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path filePath = uploadPath.resolve(filename);

            // 저장
            file.transferTo(filePath.toFile());
            log.info("파일 업로드 완료: userId={}, file={}, size={}KB, path={}",
                    userId, filename, file.getSize() / 1024, filePath);

            // 공개 URL — 현재 요청 호스트(백엔드:8080)를 기반으로 URL 생성.
            // application.yml 의 app.base-url 은 프론트 주소(:5173) 이므로 여기서 쓰면 안 됨 —
            // 업로드 파일은 WebMvcConfig 의 /uploads/** 핸들러(백엔드가 직접 서빙)를 통해 내려감.
            String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/uploads/")
                    .path(filename)
                    .toUriString();

            return ResponseEntity.ok(Map.of(
                    "url", url,
                    "filename", filename,
                    "size", file.getSize()
            ));
        } catch (IOException e) {
            // 실제 원인을 프론트에도 전달 — "권한 없음 / 디스크 풀 / 잘못된 경로" 등 구분 가능.
            log.error("파일 업로드 실패: userId={}, msg={}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "파일 업로드에 실패했습니다: " + e.getMessage()));
        } catch (Exception e) {
            log.error("파일 업로드 예외: userId={}, msg={}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "파일 업로드 중 예외가 발생했습니다: " + e.getMessage()));
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : ".jpg";
    }
}
