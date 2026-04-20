package com.instabot.backend.controller;

import com.instabot.backend.dto.InstagramAccountDto.*;
import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.service.InstagramAccountManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class InstagramAccountController {

    private final InstagramAccountManagementService accountService;

    @GetMapping
    public ResponseEntity<List<AccountResponse>> listAccounts() {
        return ResponseEntity.ok(accountService.listAccounts(SecurityUtils.currentUserId()));
    }

    @PostMapping
    public ResponseEntity<AccountResponse> connectAccount(@Valid @RequestBody ConnectRequest request) {
        return ResponseEntity.ok(accountService.connectAccount(SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/{id}/switch")
    public ResponseEntity<AccountResponse> switchAccount(@PathVariable Long id) {
        return ResponseEntity.ok(accountService.switchAccount(SecurityUtils.currentUserId(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AccountResponse> updateAccount(@PathVariable Long id, @RequestBody UpdateRequest request) {
        return ResponseEntity.ok(accountService.updateAccount(SecurityUtils.currentUserId(), id, request));
    }

    @PatchMapping("/{id}/disconnect")
    public ResponseEntity<Void> disconnectAccount(@PathVariable Long id) {
        accountService.disconnectAccount(SecurityUtils.currentUserId(), id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeAccount(@PathVariable Long id) {
        accountService.removeAccount(SecurityUtils.currentUserId(), id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/overview")
    public ResponseEntity<AgencyOverview> getAgencyOverview() {
        return ResponseEntity.ok(accountService.getAgencyOverview(SecurityUtils.currentUserId()));
    }

    /**
     * Webhook 재구독 (A안) — 기존 연결된 IG 계정을 Meta webhook에 재구독.
     * 최초 연결 시 구독 누락(이전 코드 버그) 또는 구독 필드 변경 시 사용.
     * Meta API: POST /{ig-user-id}/subscribed_apps?subscribed_fields=...
     */
    @PostMapping("/{id}/resubscribe")
    public ResponseEntity<AccountResponse> resubscribeWebhook(@PathVariable Long id) {
        return ResponseEntity.ok(accountService.resubscribeWebhook(SecurityUtils.currentUserId(), id));
    }
}
