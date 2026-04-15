package com.instabot.backend.controller;

import com.instabot.backend.entity.ABTest;
import com.instabot.backend.service.ABTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ab-tests")
@RequiredArgsConstructor
public class ABTestController {

    private final ABTestService abTestService;

    @GetMapping("/flow/{flowId}")
    public ResponseEntity<List<ABTest>> getTestsByFlow(@PathVariable Long flowId) {
        return ResponseEntity.ok(abTestService.getTestsByFlow(flowId));
    }

    @PatchMapping("/{id}/end")
    public ResponseEntity<ABTest> endTest(@PathVariable Long id) {
        return ResponseEntity.ok(abTestService.endTest(id));
    }

    @PatchMapping("/{id}/reset")
    public ResponseEntity<Void> resetTest(@PathVariable Long id) {
        abTestService.resetTest(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTest(@PathVariable Long id) {
        abTestService.deleteTest(id);
        return ResponseEntity.ok().build();
    }
}
