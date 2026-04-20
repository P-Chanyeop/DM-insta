package com.instabot.backend.controller;

import com.instabot.backend.entity.Broadcast;
import com.instabot.backend.entity.GrowthTool;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.repository.BroadcastRepository;
import com.instabot.backend.repository.GrowthToolRepository;
import com.instabot.backend.repository.InstagramAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 링크 클릭 추적 컨트롤러 (인증 불필요)
 * - /r/{id} → GrowthTool Ref Link 클릭 추적 + 리다이렉트
 * - /t/{broadcastId} → Broadcast 링크 클릭 추적 + 리다이렉트
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class LinkTrackingController {

    private final GrowthToolRepository growthToolRepository;
    private final BroadcastRepository broadcastRepository;
    private final InstagramAccountRepository instagramAccountRepository;

    /**
     * Growth Tool Ref Link 클릭 추적
     */
    @GetMapping("/r/{id}")
    public ResponseEntity<Void> trackRefLink(@PathVariable Long id) {
        GrowthTool tool = growthToolRepository.findById(id).orElse(null);
        if (tool == null) {
            return ResponseEntity.notFound().build();
        }

        // 클릭 카운트 증가
        tool.setClickCount(tool.getClickCount() != null ? tool.getClickCount() + 1 : 1);
        growthToolRepository.save(tool);

        log.debug("Ref Link 클릭: toolId={}, clicks={}", id, tool.getClickCount());

        // 리다이렉트 URL 결정: refUrl → 인스타 DM 링크 → 인스타 홈
        String redirectUrl = tool.getRefUrl();
        if (redirectUrl == null || redirectUrl.isBlank()) {
            // refUrl이 없으면 해당 사용자의 인스타 DM 링크로 리다이렉트
            InstagramAccount igAccount = instagramAccountRepository
                    .findByUserIdAndActiveTrue(tool.getUser().getId())
                    .orElse(null);
            if (igAccount != null && igAccount.getUsername() != null) {
                redirectUrl = "https://ig.me/m/" + igAccount.getUsername();
            } else {
                redirectUrl = "https://instagram.com";
            }
        }

        HttpHeaders headers = new HttpHeaders();
        headers.add("Location", redirectUrl);
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    /**
     * Broadcast 링크 클릭 추적
     */
    @GetMapping("/t/{broadcastId}")
    public ResponseEntity<Void> trackBroadcastClick(
            @PathVariable Long broadcastId,
            @RequestParam(value = "url", required = false) String targetUrl) {

        Broadcast broadcast = broadcastRepository.findById(broadcastId).orElse(null);
        if (broadcast == null) {
            return ResponseEntity.notFound().build();
        }

        broadcast.setClickCount(broadcast.getClickCount() != null ? broadcast.getClickCount() + 1 : 1);
        if (broadcast.getSentCount() != null && broadcast.getSentCount() > 0) {
            broadcast.setClickRate(
                    Math.round((double) broadcast.getClickCount() / broadcast.getSentCount() * 100.0 * 10.0) / 10.0);
        }
        broadcastRepository.save(broadcast);

        String redirect = targetUrl != null ? targetUrl : "https://instagram.com";
        HttpHeaders headers = new HttpHeaders();
        headers.add("Location", redirect);
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
