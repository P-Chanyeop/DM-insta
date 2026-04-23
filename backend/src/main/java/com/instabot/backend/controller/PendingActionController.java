package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.PendingActionDto;
import com.instabot.backend.service.PendingActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 — Pending Flow Action 조회/정리 엔드포인트.
 *
 * 스테일 AWAITING_POSTBACK 등의 pending 레코드가 남아
 * 새 DM 키워드가 스킵되는 문제를 사용자가 직접 해소할 수 있게 한다.
 */
@RestController
@RequestMapping("/api/pending-actions")
@RequiredArgsConstructor
public class PendingActionController {

    private final PendingActionService pendingActionService;

    /** 현재 사용자의 IG 계정에 걸린 활성 pending 액션 목록 */
    @GetMapping
    public ResponseEntity<List<PendingActionDto.Response>> listActive() {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(pendingActionService.listActive(userId));
    }

    /** 현재 사용자의 모든 활성 pending 액션을 COMPLETED 로 마킹 */
    @PostMapping("/cleanup")
    public ResponseEntity<PendingActionDto.CleanupResult> cleanupAll() {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(pendingActionService.cleanupAll(userId));
    }

    /** 단일 pending 액션을 COMPLETED 로 마킹 (본인 소유만) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> completeOne(@PathVariable Long id) {
        Long userId = SecurityUtils.currentUserId();
        pendingActionService.completeOne(userId, id);
        return ResponseEntity.noContent().build();
    }
}
