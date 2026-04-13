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
