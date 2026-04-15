package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.GroupBuyDto;
import com.instabot.backend.service.GroupBuyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 공동구매 API
 * - 공동구매 CRUD
 * - 참여자 관리
 * - 상태 변경/통계
 */
@RestController
@RequestMapping("/api/group-buys")
@RequiredArgsConstructor
public class GroupBuyController {

    private final GroupBuyService groupBuyService;

    // ═══════════════════════════════════════════════════════════
    // 공동구매 CRUD
    // ═══════════════════════════════════════════════════════════

    @GetMapping
    public ResponseEntity<List<GroupBuyDto.Response>> getGroupBuys() {
        return ResponseEntity.ok(groupBuyService.getGroupBuys(SecurityUtils.currentUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupBuyDto.Response> getGroupBuy(@PathVariable Long id) {
        return ResponseEntity.ok(groupBuyService.getGroupBuy(SecurityUtils.currentUserId(), id));
    }

    @PostMapping
    public ResponseEntity<GroupBuyDto.Response> createGroupBuy(@Valid @RequestBody GroupBuyDto.CreateRequest request) {
        return ResponseEntity.ok(groupBuyService.createGroupBuy(SecurityUtils.currentUserId(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GroupBuyDto.Response> updateGroupBuy(@PathVariable Long id,
                                                                @RequestBody GroupBuyDto.UpdateRequest request) {
        return ResponseEntity.ok(groupBuyService.updateGroupBuy(SecurityUtils.currentUserId(), id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<GroupBuyDto.Response> updateStatus(@PathVariable Long id,
                                                              @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(groupBuyService.updateStatus(SecurityUtils.currentUserId(), id, body.get("status")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroupBuy(@PathVariable Long id) {
        groupBuyService.deleteGroupBuy(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    // ═══════════════════════════════════════════════════════════
    // 참여자 관리
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/{id}/participants")
    public ResponseEntity<List<GroupBuyDto.ParticipantResponse>> getParticipants(@PathVariable Long id) {
        return ResponseEntity.ok(groupBuyService.getParticipants(SecurityUtils.currentUserId(), id));
    }

    @PatchMapping("/{id}/participants/{participantId}")
    public ResponseEntity<GroupBuyDto.ParticipantResponse> updateParticipant(
            @PathVariable Long id, @PathVariable Long participantId,
            @RequestBody GroupBuyDto.UpdateParticipantRequest request) {
        return ResponseEntity.ok(
                groupBuyService.updateParticipant(SecurityUtils.currentUserId(), id, participantId, request));
    }

    // ═══════════════════════════════════════════════════════════
    // 통계
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/{id}/stats")
    public ResponseEntity<GroupBuyDto.Stats> getStats(@PathVariable Long id) {
        return ResponseEntity.ok(groupBuyService.getStats(SecurityUtils.currentUserId(), id));
    }
}
