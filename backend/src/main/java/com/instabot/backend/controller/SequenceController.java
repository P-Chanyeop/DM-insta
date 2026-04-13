package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.SequenceDto;
import com.instabot.backend.service.SequenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sequences")
@RequiredArgsConstructor
public class SequenceController {

    private final SequenceService sequenceService;

    @GetMapping
    public ResponseEntity<List<SequenceDto.Response>> getSequences() {
        return ResponseEntity.ok(sequenceService.getSequences(SecurityUtils.currentUserId()));
    }

    @PostMapping
    public ResponseEntity<SequenceDto.Response> createSequence(@Valid @RequestBody SequenceDto.CreateRequest request) {
        return ResponseEntity.ok(sequenceService.createSequence(SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<SequenceDto.Response> toggleSequence(@PathVariable Long id) {
        return ResponseEntity.ok(sequenceService.toggleSequence(SecurityUtils.currentUserId(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSequence(@PathVariable Long id) {
        sequenceService.deleteSequence(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
