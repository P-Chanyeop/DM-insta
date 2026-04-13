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
}
