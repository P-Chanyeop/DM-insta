package com.instabot.backend.controller;

import com.instabot.backend.entity.GrowthTool;
import com.instabot.backend.repository.GrowthToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 성장 도구 공개 API 엔드포인트 (인증 불필요)
 * 외부 시스템에서 호출하여 자동화 트리거 / 상태 확인 용도
 */
@Slf4j
@RestController
@RequestMapping("/api/public/growth-tools")
@RequiredArgsConstructor
public class PublicGrowthToolController {

    private final GrowthToolRepository growthToolRepository;

    /**
     * GET: 성장 도구 상태 확인 (헬스체크)
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getToolStatus(@PathVariable Long id) {
        GrowthTool tool = growthToolRepository.findById(id).orElse(null);
        if (tool == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of(
                "id", tool.getId(),
                "type", tool.getType().name(),
                "name", tool.getName() != null ? tool.getName() : "",
                "active", tool.isActive(),
                "clickCount", tool.getClickCount() != null ? tool.getClickCount() : 0,
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    /**
     * POST: 외부 시스템에서 트리거 호출
     * 클릭 카운트 증가 + 수신 데이터 로깅
     */
    @PostMapping("/{id}")
    public ResponseEntity<?> triggerTool(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> payload) {
        GrowthTool tool = growthToolRepository.findById(id).orElse(null);
        if (tool == null) {
            return ResponseEntity.notFound().build();
        }
        if (!tool.isActive()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "INACTIVE",
                    "message", "이 성장 도구는 비활성 상태입니다."
            ));
        }

        // 클릭 카운트 증가
        tool.setClickCount(tool.getClickCount() != null ? tool.getClickCount() + 1 : 1);
        growthToolRepository.save(tool);

        log.info("Growth Tool API 트리거: toolId={}, clicks={}, payload={}",
                id, tool.getClickCount(), payload);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "트리거가 성공적으로 처리되었습니다.",
                "clickCount", tool.getClickCount()
        ));
    }
}
