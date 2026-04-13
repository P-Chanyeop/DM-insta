package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.IntegrationDto;
import com.instabot.backend.service.IntegrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/integrations")
@RequiredArgsConstructor
public class IntegrationController {

    private final IntegrationService integrationService;

    @GetMapping
    public ResponseEntity<List<IntegrationDto.Response>> getIntegrations() {
        return ResponseEntity.ok(integrationService.getIntegrations(SecurityUtils.currentUserId()));
    }

    @PostMapping
    public ResponseEntity<IntegrationDto.Response> createIntegration(@RequestBody IntegrationDto.CreateRequest request) {
        return ResponseEntity.ok(integrationService.createIntegration(SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<IntegrationDto.Response> toggleIntegration(@PathVariable Long id) {
        return ResponseEntity.ok(integrationService.toggleIntegration(SecurityUtils.currentUserId(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIntegration(@PathVariable Long id) {
        integrationService.deleteIntegration(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
