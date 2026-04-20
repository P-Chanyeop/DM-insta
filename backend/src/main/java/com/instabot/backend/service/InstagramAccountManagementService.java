package com.instabot.backend.service;

import com.instabot.backend.dto.InstagramAccountDto.*;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class InstagramAccountManagementService {

    private final InstagramAccountRepository accountRepo;
    private final UserRepository userRepo;
    private final FlowRepository flowRepo;
    private final ContactRepository contactRepo;
    private final AutomationRepository automationRepo;
    private final InstagramApiService instagramApiService;

    private static final int FREE_ACCOUNT_LIMIT = 1;
    private static final int STARTER_ACCOUNT_LIMIT = 2;
    private static final int PRO_ACCOUNT_LIMIT = 5;
    private static final int BUSINESS_ACCOUNT_LIMIT = 100;

    public List<AccountResponse> listAccounts(Long userId) {
        return accountRepo.findByUserIdOrderByActiveDescConnectedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AccountResponse connectAccount(Long userId, ConnectRequest req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다"));

        int limit = getAccountLimit(user.getPlan());
        long current = accountRepo.countByUserId(userId);
        if (current >= limit) {
            throw new BadRequestException("계정 연결 한도에 도달했습니다. (현재 " + current + "/" + limit + ") 플랜을 업그레이드하세요.");
        }

        // 이미 연결된 IG 계정 체크
        accountRepo.findByIgUserId(req.getIgUserId()).ifPresent(existing -> {
            if (!existing.getUser().getId().equals(userId)) {
                throw new BadRequestException("이미 다른 사용자가 연결한 계정입니다");
            }
            throw new BadRequestException("이미 연결된 계정입니다");
        });

        boolean isFirst = current == 0;
        InstagramAccount account = InstagramAccount.builder()
                .user(user)
                .igUserId(req.getIgUserId())
                .username(req.getUsername())
                .accessToken(req.getAccessToken())
                .profilePictureUrl(req.getProfilePictureUrl())
                .accountType(req.getAccountType())
                .followersCount(req.getFollowersCount())
                .connected(true)
                .active(isFirst)
                .build();

        InstagramAccount saved = accountRepo.save(account);

        // Webhook 구독 — 이게 없으면 Meta가 DM/댓글 이벤트를 webhook으로 전달 안 함
        try {
            String rawToken = instagramApiService.getDecryptedToken(saved);
            boolean subscribed = instagramApiService.subscribeAppToIgAccount(saved.getIgUserId(), rawToken);
            if (!subscribed) {
                log.warn("Webhook 구독 실패 — 나중에 재시도 가능: igUserId={}", saved.getIgUserId());
            }
        } catch (Exception e) {
            log.error("Webhook 구독 중 예외 (계정 연결은 성공): igUserId={}, error={}",
                    saved.getIgUserId(), e.getMessage());
            // 구독 실패해도 계정 연결 자체는 성공 — 관리자 수동 재구독 가능
        }

        return toResponse(saved);
    }

    /**
     * Webhook 재구독 — 기존 연결된 계정의 webhook 구독을 다시 걸기.
     * 최초 연결 시 구독이 실패했거나, 구독 fields 변경 시 수동 호출.
     */
    @Transactional
    public AccountResponse resubscribeWebhook(Long userId, Long accountId) {
        InstagramAccount account = accountRepo.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("계정을 찾을 수 없습니다"));
        if (!account.isConnected()) {
            throw new BadRequestException("연결이 해제된 계정입니다. 재연결 후 사용하세요.");
        }
        String token = instagramApiService.getDecryptedToken(account);
        boolean success = instagramApiService.subscribeAppToIgAccount(account.getIgUserId(), token);
        if (!success) {
            throw new BadRequestException("Webhook 구독에 실패했습니다. 토큰 상태를 확인하거나 재연결해주세요.");
        }
        log.info("Webhook 재구독 성공: userId={}, accountId={}, igUserId={}",
                userId, accountId, account.getIgUserId());
        return toResponse(account);
    }

    /**
     * 진단용 — Meta 측 현재 subscribed_apps 상태 반환.
     * Meta가 실제로 저장한 구독 필드 확인 가능.
     */
    public com.fasterxml.jackson.databind.JsonNode getSubscriptionStatus(Long userId, Long accountId) {
        InstagramAccount account = accountRepo.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("계정을 찾을 수 없습니다"));
        String token = instagramApiService.getDecryptedToken(account);
        return instagramApiService.getSubscribedApps(account.getIgUserId(), token);
    }

    @Transactional
    public AccountResponse switchAccount(Long userId, Long accountId) {
        InstagramAccount target = accountRepo.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("계정을 찾을 수 없습니다"));

        if (!target.isConnected()) {
            throw new BadRequestException("연결이 해제된 계정입니다. 재연결 후 사용하세요.");
        }

        // 기존 활성 계정 비활성화
        accountRepo.findByUserIdAndActiveTrue(userId)
                .ifPresent(prev -> {
                    prev.setActive(false);
                    accountRepo.save(prev);
                });

        // 새 계정 활성화
        target.setActive(true);
        return toResponse(accountRepo.save(target));
    }

    @Transactional
    public AccountResponse updateAccount(Long userId, Long accountId, UpdateRequest req) {
        InstagramAccount account = accountRepo.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new RuntimeException("계정을 찾을 수 없습니다"));

        if (req.getUsername() != null) account.setUsername(req.getUsername());
        if (req.getAccessToken() != null) account.setAccessToken(req.getAccessToken());
        if (req.getProfilePictureUrl() != null) account.setProfilePictureUrl(req.getProfilePictureUrl());
        if (req.getAccountType() != null) account.setAccountType(req.getAccountType());
        if (req.getFollowersCount() != null) account.setFollowersCount(req.getFollowersCount());

        return toResponse(accountRepo.save(account));
    }

    @Transactional
    public void disconnectAccount(Long userId, Long accountId) {
        InstagramAccount account = accountRepo.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new RuntimeException("계정을 찾을 수 없습니다"));

        account.setConnected(false);
        account.setAccessToken(null);

        // 활성 계정이면 다른 계정으로 전환
        if (account.isActive()) {
            account.setActive(false);
            accountRepo.save(account);
            accountRepo.findByUserIdOrderByActiveDescConnectedAtDesc(userId).stream()
                    .filter(a -> a.isConnected() && !a.getId().equals(accountId))
                    .findFirst()
                    .ifPresent(next -> {
                        next.setActive(true);
                        accountRepo.save(next);
                    });
        } else {
            accountRepo.save(account);
        }
    }

    @Transactional
    public void removeAccount(Long userId, Long accountId) {
        InstagramAccount account = accountRepo.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new RuntimeException("계정을 찾을 수 없습니다"));

        boolean wasActive = account.isActive();
        accountRepo.delete(account);

        // 활성 계정이었으면 다른 계정으로 전환
        if (wasActive) {
            accountRepo.findByUserIdOrderByActiveDescConnectedAtDesc(userId).stream()
                    .filter(InstagramAccount::isConnected)
                    .findFirst()
                    .ifPresent(next -> {
                        next.setActive(true);
                        accountRepo.save(next);
                    });
        }
    }

    public AgencyOverview getAgencyOverview(Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        List<InstagramAccount> accounts = accountRepo.findByUserIdOrderByActiveDescConnectedAtDesc(userId);
        long totalFlows = flowRepo.countByUserId(userId);
        long totalContacts = contactRepo.countByUserId(userId);
        long totalAutomations = automationRepo.countByUserId(userId);

        List<AccountSummary> summaries = accounts.stream()
                .map(a -> AccountSummary.builder()
                        .id(a.getId())
                        .username(a.getUsername())
                        .profilePictureUrl(a.getProfilePictureUrl())
                        .accountType(a.getAccountType())
                        .connected(a.isConnected())
                        .active(a.isActive())
                        .stats(AccountStats.builder()
                                .followersCount(a.getFollowersCount() != null ? a.getFollowersCount() : 0)
                                .flowCount(totalFlows)
                                .contactCount(totalContacts)
                                .automationCount(totalAutomations)
                                .build())
                        .build())
                .toList();

        return AgencyOverview.builder()
                .totalAccounts(accounts.size())
                .connectedAccounts((int) accounts.stream().filter(InstagramAccount::isConnected).count())
                .maxAccounts(getAccountLimit(user.getPlan()))
                .totalFollowers(accounts.stream().mapToLong(a -> a.getFollowersCount() != null ? a.getFollowersCount() : 0).sum())
                .totalContacts(totalContacts)
                .totalFlows(totalFlows)
                .accounts(summaries)
                .build();
    }

    private int getAccountLimit(User.PlanType plan) {
        return switch (plan) {
            case FREE -> FREE_ACCOUNT_LIMIT;
            case STARTER -> STARTER_ACCOUNT_LIMIT;
            case PRO -> PRO_ACCOUNT_LIMIT;
            case BUSINESS -> BUSINESS_ACCOUNT_LIMIT;
        };
    }

    private AccountResponse toResponse(InstagramAccount a) {
        return AccountResponse.builder()
                .id(a.getId())
                .igUserId(a.getIgUserId())
                .username(a.getUsername())
                .profilePictureUrl(a.getProfilePictureUrl())
                .followersCount(a.getFollowersCount())
                .accountType(a.getAccountType())
                .connected(a.isConnected())
                .active(a.isActive())
                .connectedAt(a.getConnectedAt())
                .tokenExpiresAt(a.getTokenExpiresAt())
                .build();
    }
}
