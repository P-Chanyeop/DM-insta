package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.TemplateDto;
import com.instabot.backend.service.TemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    public ResponseEntity<List<TemplateDto.Response>> getTemplates(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(templateService.getTemplates(category));
    }

    @PostMapping("/{id}/use")
    public ResponseEntity<Void> useTemplate(@PathVariable Long id) {
        templateService.incrementUsage(id);
        return ResponseEntity.ok().build();
    }
}
