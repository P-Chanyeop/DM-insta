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
public class InstagramAccountManagementService {

    private final InstagramAccountRepository accountRepo;
    private final UserRepository userRepo;
    private final FlowRepository flowRepo;
    private final ContactRepository contactRepo;
    private final AutomationRepository automationRepo;

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

        return toResponse(accountRepo.save(account));
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
