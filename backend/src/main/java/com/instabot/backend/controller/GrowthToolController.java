package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.GrowthToolDto;
import com.instabot.backend.service.GrowthToolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/growth-tools")
@RequiredArgsConstructor
public class GrowthToolController {

    private final GrowthToolService growthToolService;

    @GetMapping
    public ResponseEntity<List<GrowthToolDto.Response>> getGrowthTools() {
        return ResponseEntity.ok(growthToolService.getTools(SecurityUtils.currentUserId()));
    }

    @PostMapping
    public ResponseEntity<GrowthToolDto.Response> createGrowthTool(@RequestBody GrowthToolDto.CreateRequest request) {
        return ResponseEntity.ok(growthToolService.createTool(SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<GrowthToolDto.Response> toggleGrowthTool(@PathVariable Long id) {
        return ResponseEntity.ok(growthToolService.toggleTool(SecurityUtils.currentUserId(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGrowthTool(@PathVariable Long id) {
        growthToolService.deleteTool(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
