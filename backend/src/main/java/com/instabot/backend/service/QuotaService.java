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
 * 플랜 제한:
 *   FREE:       플로우 3개, 자동화 3개, 연락처 1,000명, 브로드캐스트/시퀀스 불가
 *   PRO:        무제한 플로우/자동화, 연락처 15,000명, 브로드캐스트/시퀀스 가능
 *   ENTERPRISE: 모두 무제한
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuotaService {

    private final FlowRepository flowRepository;
    private final AutomationRepository automationRepository;
    private final ContactRepository contactRepository;

    // ─── 플랜별 제한 상수 ───

    private static final int FREE_MAX_FLOWS = 3;
    // 온보딩에서 DM_KEYWORD + WELCOME_MESSAGE + COMMENT_TRIGGER + STORY_MENTION + STORY_REPLY 5개를
    // 한 번에 셋업할 수 있도록 FREE 한도를 5로 상향. (사용자 첫 경험 보장)
    private static final int FREE_MAX_AUTOMATIONS = 5;
    private static final int FREE_MAX_CONTACTS = 1_000;

    private static final int PRO_MAX_CONTACTS = 15_000;

    // ─── 검증 메서드 ───

    /**
     * 플로우 생성 가능 여부 검증
     */
    public void checkFlowQuota(User user) {
        if (user.getPlan() == PlanType.FREE) {
            long count = flowRepository.countByUserId(user.getId());
            if (count >= FREE_MAX_FLOWS) {
                throw new QuotaExceededException("플로우", FREE_MAX_FLOWS);
            }
        }
        // PRO, ENTERPRISE: 무제한
    }

    /**
     * 자동화 생성 가능 여부 검증
     */
    public void checkAutomationQuota(User user) {
        if (user.getPlan() == PlanType.FREE) {
            long count = automationRepository.countByUserId(user.getId());
            if (count >= FREE_MAX_AUTOMATIONS) {
                throw new QuotaExceededException("자동화", FREE_MAX_AUTOMATIONS);
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
     * 시퀀스 사용 가능 여부 검증 (FREE 플랜 불가)
     */
    public void checkSequenceAccess(User user) {
        if (user.getPlan() == PlanType.FREE) {
            throw new QuotaExceededException("시퀀스");
        }
    }

    /**
     * 연락처 추가 가능 여부 검증
     */
    public void checkContactQuota(User user, int addCount) {
        long currentCount = contactRepository.countByUserId(user.getId());
        int maxContacts = switch (user.getPlan()) {
            case FREE -> FREE_MAX_CONTACTS;
            case PRO -> PRO_MAX_CONTACTS;
            case ENTERPRISE -> Integer.MAX_VALUE;
        };

        if (currentCount + addCount > maxContacts) {
            throw new QuotaExceededException("연락처", maxContacts);
        }
    }
}
