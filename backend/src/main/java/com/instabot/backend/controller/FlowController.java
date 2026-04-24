package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.service.FlowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flows")
@RequiredArgsConstructor
public class FlowController {

    private final FlowService flowService;

    @GetMapping
    public ResponseEntity<List<FlowDto.Response>> getFlows() {
        return ResponseEntity.ok(flowService.getFlows(SecurityUtils.currentUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FlowDto.Response> getFlow(@PathVariable Long id) {
        return ResponseEntity.ok(flowService.getFlow(SecurityUtils.currentUserId(), id));
    }

    @PostMapping
    public ResponseEntity<FlowDto.Response> createFlow(@Valid @RequestBody FlowDto.CreateRequest request) {
        return ResponseEntity.ok(flowService.createFlow(SecurityUtils.currentUserId(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FlowDto.Response> updateFlow(@PathVariable Long id, @RequestBody FlowDto.UpdateRequest request) {
        return ResponseEntity.ok(flowService.updateFlow(SecurityUtils.currentUserId(), id, request));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<FlowDto.Response> toggleFlow(@PathVariable Long id) {
        return ResponseEntity.ok(flowService.toggleFlow(SecurityUtils.currentUserId(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFlow(@PathVariable Long id) {
        flowService.deleteFlow(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 특정 Flow 가 현재 가진 충돌 목록 — 저장/활성화 프리플라이트 용.
     * HARD_BLOCK 이 있으면 프론트는 활성화 버튼 비활성화 + 메시지 표시.
     * WARN 만 있으면 활성화 전 확인 모달.
     */
    @GetMapping("/{id}/conflicts")
    public ResponseEntity<List<FlowDto.Conflict>> getConflicts(@PathVariable Long id) {
        return ResponseEntity.ok(flowService.getConflicts(SecurityUtils.currentUserId(), id));
    }

    /**
     * 유저의 모든 활성 Flow 충돌 리포트 — 목록 페이지 ⚠️ 뱃지 판정용.
     */
    @GetMapping("/conflicts")
    public ResponseEntity<List<FlowDto.ConflictReport>> getAllConflicts() {
        return ResponseEntity.ok(flowService.getAllConflicts(SecurityUtils.currentUserId()));
    }

    /**
     * 드래그로 순서 변경 시 호출. 배열 index 가 priority 가 됨.
     */
    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorderFlows(@RequestBody FlowDto.ReorderRequest request) {
        flowService.reorderFlows(SecurityUtils.currentUserId(), request.getOrderedIds());
        return ResponseEntity.noContent().build();
    }
}
