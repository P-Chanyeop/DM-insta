package com.instabot.backend.service;

import com.instabot.backend.entity.User;
import com.instabot.backend.entity.User.PlanType;
import com.instabot.backend.exception.QuotaExceededException;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 플랜별 할당량(Quota) 검증 서비스
 *
 * 과금 기준: 월 DM 발송 수 (컨택 수 아님)
 *
 * 플랜 제한:
 *   FREE:     월 300 DM, 플로우 3개, 팀 1명, IG 1개
 *   STARTER:  월 3,000 DM, 플로우 5개, 팀 2명, IG 2개
 *   PRO:      월 30,000 DM, 무제한 플로우, 팀 5명, IG 5개
 *   BUSINESS: 무제한 DM, 무제한 전부
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuotaService {

    private final FlowRepository flowRepository;
    private final ContactRepository contactRepository;

    // ─── 플로우 제한 ───
    // Phase 3 에서 Automation 레이어가 제거되며 Flow 가 트리거·실행을 모두 담당.
    // 구 "자동화 5개 + 플로우 3개" 합산 한도를 반영해 FREE 한도를 소폭 상향.
    private static final int FREE_MAX_FLOWS = 5;
    private static final int STARTER_MAX_FLOWS = 10;

    // ─── 월 DM 발송 제한 ───
    private static final int FREE_MONTHLY_DM = 300;
    private static final int STARTER_MONTHLY_DM = 3_000;
    private static final int PRO_MONTHLY_DM = 30_000;

    // ─── 검증 메서드 ───

    /**
     * 플로우 생성 가능 여부 검증
     */
    public void checkFlowQuota(User user) {
        int limit = getFlowLimit(user.getPlan());
        if (limit < Integer.MAX_VALUE) {
            long count = flowRepository.countByUserId(user.getId());
            if (count >= limit) {
                throw new QuotaExceededException("플로우", limit);
            }
        }
    }

    /**
     * 브로드캐스트 사용 가능 여부 검증 (FREE 플랜 불가)
     */
    public void checkBroadcastAccess(User user) {
        if (user.getPlan() == PlanType.FREE) {
            throw new QuotaExceededException("브로드캐스트");
        }
    }

    /**
     * 시퀀스 사용 가능 여부 검증 (PRO 이상만 가능)
     */
    public void checkSequenceAccess(User user) {
        if (user.getPlan() == PlanType.FREE || user.getPlan() == PlanType.STARTER) {
            throw new QuotaExceededException("시퀀스");
        }
    }

    /**
     * 연락처 추가 가능 여부 검증 — 연락처는 과금 기준이 아니므로 넉넉하게 설정
     */
    public void checkContactQuota(User user, int addCount) {
        // 연락처는 과금 포인트가 아님 — 모든 플랜에서 충분히 큰 한도
        int maxContacts = switch (user.getPlan()) {
            case FREE -> 5_000;
            case STARTER -> 15_000;
            case PRO -> 50_000;
            case BUSINESS -> Integer.MAX_VALUE;
        };

        long currentCount = contactRepository.countByUserId(user.getId());
        if (currentCount + addCount > maxContacts) {
            throw new QuotaExceededException("연락처", maxContacts);
        }
    }

    /**
     * 월 DM 발송 한도 반환
     */
    public int getMonthlyDMLimit(PlanType plan) {
        return switch (plan) {
            case FREE -> FREE_MONTHLY_DM;
            case STARTER -> STARTER_MONTHLY_DM;
            case PRO -> PRO_MONTHLY_DM;
            case BUSINESS -> Integer.MAX_VALUE;
        };
    }

    // ─── 헬퍼 ───

    private int getFlowLimit(PlanType plan) {
        return switch (plan) {
            case FREE -> FREE_MAX_FLOWS;
            case STARTER -> STARTER_MAX_FLOWS;
            case PRO, BUSINESS -> Integer.MAX_VALUE;
        };
    }
}
