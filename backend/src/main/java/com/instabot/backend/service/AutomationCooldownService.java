package com.instabot.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 자동화 쿨다운 — 동일 (자동화, 발신자) 쌍이 짧은 시간에 반복 발동되는 것 방지.
 *
 * 예: 유저가 "가격 가격 가격 가격" DM 10초 간격 연타 → 첫 매칭만 플로우 실행, 나머지 무시.
 * Instagram 스팸 신고를 최소화하고 동일 메시지 반복 발송을 억제한다.
 *
 * 기본 30초. 인스턴스 메모리에만 저장되므로 서버 재시작 시 초기화됨(큰 문제는 아님 — 쿨다운 목적상).
 * 멀티 인스턴스 환경이라면 추후 Redis 로 이전.
 *
 * 만료된 엔트리는 tryTrigger 호출 시 자연스럽게 청소됨 (lazy eviction).
 */
@Slf4j
@Service
public class AutomationCooldownService {

    private static final Duration DEFAULT_COOLDOWN = Duration.ofSeconds(30);

    // key: "{automationId}:{senderIgId}", value: 마지막 발동 시각
    private final ConcurrentHashMap<String, Instant> lastTriggered = new ConcurrentHashMap<>();

    /**
     * 트리거 가능한지 확인하고 가능하면 기록 (원자적).
     * @return true 면 플로우 실행 진행, false 면 쿨다운 중이라 스킵
     */
    public boolean tryTrigger(Long automationId, String senderIgId) {
        return tryTrigger(automationId, senderIgId, DEFAULT_COOLDOWN);
    }

    public boolean tryTrigger(Long automationId, String senderIgId, Duration cooldown) {
        if (automationId == null || senderIgId == null || senderIgId.isBlank()) return true;
        String key = automationId + ":" + senderIgId;
        Instant now = Instant.now();
        Instant cutoff = now.minus(cooldown);

        // compute 로 원자적 체크 + 업데이트
        Instant[] previousHolder = new Instant[1];
        lastTriggered.compute(key, (k, previous) -> {
            previousHolder[0] = previous;
            if (previous == null || previous.isBefore(cutoff)) {
                return now; // 통과 — 새 시각 기록
            }
            return previous; // 쿨다운 중 — 기존 시각 유지
        });

        boolean passed = previousHolder[0] == null || previousHolder[0].isBefore(cutoff);
        if (!passed) {
            log.info("쿨다운 — 자동화 스킵: automationId={}, sender={}, last={}s 전",
                    automationId, senderIgId,
                    Duration.between(previousHolder[0], now).toSeconds());
        }
        return passed;
    }
}
