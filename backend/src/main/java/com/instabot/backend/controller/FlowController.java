package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.service.FlowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
        return ResponseEntity.ok(flowService.getFlow(id));
    }

    @PostMapping
    public ResponseEntity<FlowDto.Response> createFlow(@RequestBody FlowDto.CreateRequest request) {
        return ResponseEntity.ok(flowService.createFlow(SecurityUtils.currentUserId(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FlowDto.Response> updateFlow(@PathVariable Long id, @RequestBody FlowDto.UpdateRequest request) {
        return ResponseEntity.ok(flowService.updateFlow(id, request));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<FlowDto.Response> toggleFlow(@PathVariable Long id) {
        return ResponseEntity.ok(flowService.toggleFlow(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFlow(@PathVariable Long id) {
        flowService.deleteFlow(id);
        return ResponseEntity.noContent().build();
    }
}
