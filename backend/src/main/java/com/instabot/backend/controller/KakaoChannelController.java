package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.KakaoChannelDto.*;
import com.instabot.backend.service.KakaoChannelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kakao")
@RequiredArgsConstructor
public class KakaoChannelController {

    private final KakaoChannelService kakaoService;

    @GetMapping("/channel")
    public ResponseEntity<ChannelResponse> getChannel() {
        return kakaoService.getChannel(SecurityUtils.currentUserId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/channel")
    public ResponseEntity<ChannelResponse> connectChannel(@Valid @RequestBody ConnectRequest request) {
        return ResponseEntity.ok(kakaoService.connectChannel(SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/channel")
    public ResponseEntity<Void> disconnectChannel() {
        kakaoService.disconnectChannel(SecurityUtils.currentUserId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/alimtalk")
    public ResponseEntity<SendResult> sendAlimtalk(@Valid @RequestBody AlimtalkRequest request) {
        return ResponseEntity.ok(kakaoService.sendAlimtalk(
                SecurityUtils.currentUserId(),
                request.getTemplateCode(),
                request.getRecipientPhone(),
                request.getVariables()
        ));
    }

    @PostMapping("/friendtalk")
    public ResponseEntity<SendResult> sendFriendtalk(@Valid @RequestBody FriendtalkRequest request) {
        return ResponseEntity.ok(kakaoService.sendFriendtalk(
                SecurityUtils.currentUserId(),
                request.getRecipientPhone(),
                request.getMessage(),
                request.getImageUrl()
        ));
    }
}
