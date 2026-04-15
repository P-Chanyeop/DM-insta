package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<AnalyticsService.AnalyticsResponse> getAnalytics(
            @RequestParam(defaultValue = "7") int days) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(analyticsService.getAnalytics(userId, days));
    }

    @GetMapping("/flows/{flowId}/funnel")
    public ResponseEntity<?> getFlowFunnel(
            @PathVariable Long flowId,
            @RequestParam(defaultValue = "7") int days) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(analyticsService.getFlowFunnel(userId, flowId, days));
    }
}
