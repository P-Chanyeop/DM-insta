package com.instabot.backend.controller;

import com.instabot.backend.config.EncryptionUtil;
import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.service.InstagramApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Instagram Messenger Profile 설정 컨트롤러
 * - Ice Breaker (DM 첫 진입 시 FAQ 버튼)
 * - Persistent Menu (상시 메뉴)
 */
@Slf4j
@RestController
@RequestMapping("/api/instagram")
@RequiredArgsConstructor
public class InstagramProfileController {

    private final InstagramApiService instagramApiService;
    private final EncryptionUtil encryptionUtil;

    @PostMapping("/ice-breakers")
    public ResponseEntity<?> setIceBreakers(@RequestBody Map<String, Object> request) {
        InstagramAccount account = getConnectedAccount();
        String accessToken = encryptionUtil.decrypt(account.getAccessToken());

        @SuppressWarnings("unchecked")
        List<Map<String, String>> items = (List<Map<String, String>>) request.get("items");

        if (items == null || items.isEmpty()) {
            // 빈 목록 → 삭제
            instagramApiService.deleteIceBreakers(account.getIgUserId(), accessToken);
            return ResponseEntity.ok(Map.of("message", "Ice Breaker가 삭제되었습니다."));
        }

        if (items.size() > 4) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ice Breaker는 최대 4개까지 설정할 수 있습니다."));
        }

        instagramApiService.setIceBreakers(account.getIgUserId(), items, accessToken);
        return ResponseEntity.ok(Map.of("message", "Ice Breaker가 설정되었습니다.", "count", items.size()));
    }

    @DeleteMapping("/ice-breakers")
    public ResponseEntity<?> deleteIceBreakers() {
        InstagramAccount account = getConnectedAccount();
        String accessToken = encryptionUtil.decrypt(account.getAccessToken());

        instagramApiService.deleteIceBreakers(account.getIgUserId(), accessToken);
        return ResponseEntity.ok(Map.of("message", "Ice Breaker가 삭제되었습니다."));
    }

    @PostMapping("/persistent-menu")
    public ResponseEntity<?> setPersistentMenu(@RequestBody Map<String, Object> request) {
        InstagramAccount account = getConnectedAccount();
        String accessToken = encryptionUtil.decrypt(account.getAccessToken());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) request.get("items");

        if (items == null || items.isEmpty()) {
            instagramApiService.deletePersistentMenu(account.getIgUserId(), accessToken);
            return ResponseEntity.ok(Map.of("message", "Persistent Menu가 삭제되었습니다."));
        }

        if (items.size() > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Persistent Menu는 최대 5개까지 설정할 수 있습니다."));
        }

        instagramApiService.setPersistentMenu(account.getIgUserId(), items, accessToken);
        return ResponseEntity.ok(Map.of("message", "Persistent Menu가 설정되었습니다.", "count", items.size()));
    }

    @DeleteMapping("/persistent-menu")
    public ResponseEntity<?> deletePersistentMenu() {
        InstagramAccount account = getConnectedAccount();
        String accessToken = encryptionUtil.decrypt(account.getAccessToken());

        instagramApiService.deletePersistentMenu(account.getIgUserId(), accessToken);
        return ResponseEntity.ok(Map.of("message", "Persistent Menu가 삭제되었습니다."));
    }

    private InstagramAccount getConnectedAccount() {
        Long userId = SecurityUtils.currentUserId();
        InstagramAccount account = instagramApiService.getConnectedAccount(userId);
        if (account == null) {
            throw new RuntimeException("연결된 Instagram 계정이 없습니다.");
        }
        return account;
    }
}
