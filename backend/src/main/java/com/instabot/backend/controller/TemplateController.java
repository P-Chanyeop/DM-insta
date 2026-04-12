package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.FlowDto;
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

    /**
     * 템플릿 "사용하기" → flowData를 복사하여 새 Flow 생성 후 반환
     */
    @PostMapping("/{id}/use")
    public ResponseEntity<FlowDto.Response> useTemplate(@PathVariable Long id) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(templateService.useTemplate(id, userId));
    }
}
