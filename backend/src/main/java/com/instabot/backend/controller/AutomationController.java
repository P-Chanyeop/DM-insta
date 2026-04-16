package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.AutomationDto;
import com.instabot.backend.service.AutomationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/automations")
@RequiredArgsConstructor
public class AutomationController {

    private final AutomationService automationService;

    @GetMapping
    public ResponseEntity<List<AutomationDto.Response>> getAutomations(@RequestParam(required = false) String type) {
        Long userId = SecurityUtils.currentUserId();
        if (type != null) {
            return ResponseEntity.ok(automationService.getAutomationsByType(userId, type));
        }
        return ResponseEntity.ok(automationService.getAutomations(userId));
    }

    @PostMapping
    public ResponseEntity<AutomationDto.Response> createAutomation(@Valid @RequestBody AutomationDto.CreateRequest request) {
        return ResponseEntity.ok(automationService.createAutomation(SecurityUtils.currentUserId(), request));
    }

    /** 온보딩 등 반복 호출 시 중복 생성 방지 — 동일 (user, type[, keyword])면 업데이트, 없으면 생성 */
    @PostMapping("/upsert")
    public ResponseEntity<AutomationDto.Response> upsertAutomation(@Valid @RequestBody AutomationDto.CreateRequest request) {
        return ResponseEntity.ok(automationService.upsertAutomation(SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<AutomationDto.Response> toggleAutomation(@PathVariable Long id) {
        return ResponseEntity.ok(automationService.toggleAutomation(SecurityUtils.currentUserId(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAutomation(@PathVariable Long id) {
        automationService.deleteAutomation(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
