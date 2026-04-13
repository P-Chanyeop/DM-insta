package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.BroadcastDto;
import com.instabot.backend.service.BroadcastService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/broadcasts")
@RequiredArgsConstructor
public class BroadcastController {

    private final BroadcastService broadcastService;

    @GetMapping
    public ResponseEntity<List<BroadcastDto.Response>> getBroadcasts() {
        return ResponseEntity.ok(broadcastService.getBroadcasts(SecurityUtils.currentUserId()));
    }

    @PostMapping
    public ResponseEntity<BroadcastDto.Response> createBroadcast(@Valid @RequestBody BroadcastDto.CreateRequest request) {
        return ResponseEntity.ok(broadcastService.createBroadcast(SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelBroadcast(@PathVariable Long id) {
        broadcastService.cancelBroadcast(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
