package com.instabot.backend.service;

import com.instabot.backend.entity.Conversation;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.entity.User;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Instagram Messaging Policy 창(window) 판정 서비스.
 *
 * Meta 정책 요약 (ManyChat 과 동일 모델):
 *   STANDARD     : 상대 마지막 inbound 로부터 24h 이내   → 자동화 + 수동 모두 허용
 *   HUMAN_AGENT  : 24h ~ 7일                              → 수동만 허용 (자동화 차단)
 *   OUTSIDE      : 7일 초과 또는 inbound 기록 없음        → 모두 불가 (태그/옵트인 없으면 정책 위반)
 *
 * 자동화 발송 경로(FlowExecutionService / BroadcastExecutionService / SequenceExecutionService) 는
 * 실제 Instagram API 를 호출하기 전에 {@link #canAutomatedSend(User, String)} 으로 가드할 것.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessagingWindowService {

    private static final Duration STANDARD_WINDOW = Duration.ofHours(24);
    private static final Duration HUMAN_AGENT_WINDOW = Duration.ofDays(7);

    private final ConversationRepository conversationRepository;
    private final ContactRepository contactRepository;

    public enum Window {
        STANDARD,     // 24h 이내 — 자동화 + 수동 OK
        HUMAN_AGENT,  // 24h ~ 7일 — 수동만 OK
        OUTSIDE       // 7일 초과 또는 기록 없음 — 기본 차단
    }

    /** lastInboundAt 기준으로 현재 창 상태 판정. null 이면 OUTSIDE. */
    public Window classify(LocalDateTime lastInboundAt) {
        if (lastInboundAt == null) return Window.OUTSIDE;
        Duration elapsed = Duration.between(lastInboundAt, LocalDateTime.now());
        if (elapsed.isNegative()) return Window.STANDARD; // 시계 밀림 방어
        if (elapsed.compareTo(STANDARD_WINDOW) < 0) return Window.STANDARD;
        if (elapsed.compareTo(HUMAN_AGENT_WINDOW) < 0) return Window.HUMAN_AGENT;
        return Window.OUTSIDE;
    }

    /** STANDARD 창 만료 시각 — UI 카운트다운용. lastInboundAt + 24h. null 이면 null. */
    public LocalDateTime standardExpiresAt(LocalDateTime lastInboundAt) {
        return lastInboundAt == null ? null : lastInboundAt.plus(STANDARD_WINDOW);
    }

    /** HUMAN_AGENT 창 만료 시각 (= 수동 발송 한계). lastInboundAt + 7일. null 이면 null. */
    public LocalDateTime humanAgentExpiresAt(LocalDateTime lastInboundAt) {
        return lastInboundAt == null ? null : lastInboundAt.plus(HUMAN_AGENT_WINDOW);
    }

    /** 자동화 발송 가능 여부 — STANDARD 창 안일 때만 true. */
    public boolean canAutomatedSend(Window window) {
        return window == Window.STANDARD;
    }

    /** 수동 발송 가능 여부 — OUTSIDE 가 아닐 때 true (즉 STANDARD 또는 HUMAN_AGENT). */
    public boolean canManualSend(Window window) {
        return window != Window.OUTSIDE;
    }

    /**
     * user + recipientIgId 조합으로 현재 Conversation 의 창 상태 조회.
     * Conversation 이 없으면 OUTSIDE 로 간주 (이 계정이 먼저 연락해야 하는 cold start 상황).
     */
    public Window getWindowFor(User user, String recipientIgId) {
        Optional<Contact> contactOpt = contactRepository.findByUserIdAndIgUserId(user.getId(), recipientIgId);
        if (contactOpt.isEmpty()) return Window.OUTSIDE;
        Optional<Conversation> convOpt = conversationRepository.findByUserIdAndContactId(user.getId(), contactOpt.get().getId());
        return convOpt.map(c -> classify(c.getLastInboundAt())).orElse(Window.OUTSIDE);
    }

    /**
     * 자동화 서비스 진입점에서 호출 — false 면 Instagram API 호출을 건너뛰고 로그만 남김.
     * Private Reply(댓글 트리거) 는 Instagram 측이 자동으로 24h 창을 열어주므로 호출자가 이 가드를 우회해도 됨.
     */
    public boolean canAutomatedSend(User user, String recipientIgId) {
        Window w = getWindowFor(user, recipientIgId);
        if (w != Window.STANDARD) {
            log.info("자동화 발송 스킵 (Meta 정책): user={}, recipient={}, window={}",
                    user.getId(), recipientIgId, w);
        }
        return w == Window.STANDARD;
    }
}
