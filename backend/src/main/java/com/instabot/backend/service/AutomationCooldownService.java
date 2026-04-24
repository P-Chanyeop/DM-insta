package com.instabot.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
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
 * 맵 메모리 관리:
 *  - tryTrigger 가 통과할 때 해당 키는 자연스럽게 새 시각으로 갱신됨 (lazy update).
 *  - 하지만 더 이상 트리거되지 않는 옛 키(예: 비활성화된 자동화, 떠난 유저)는 남음.
 *  - cleanupStaleEntries 가 주기적으로 cutoff 보다 오래된 키를 제거해 장기 메모리 누수 방지.
 */
@Slf4j
@Service
public class AutomationCooldownService {

    private static final Duration DEFAULT_COOLDOWN = Duration.ofSeconds(30);
    /** 청소 기준 — 이보다 오래 된 엔트리는 제거 (기본 쿨다운의 120배 마진). */
    private static final Duration CLEANUP_CUTOFF = Duration.ofHours(1);

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

    /**
     * 주기적으로 장기 미사용 엔트리 제거.
     * 기본 쿨다운(30초) 보다 훨씬 긴 1시간 마진 — cooldown 창보다 오래된 엔트리는
     * 어차피 항상 통과시키므로 제거해도 동작에 영향이 없고 메모리만 확보된다.
     */
    @Scheduled(fixedRate = 3_600_000) // 1시간마다
    public void cleanupStaleEntries() {
        Instant cutoff = Instant.now().minus(CLEANUP_CUTOFF);
        int before = lastTriggered.size();
        lastTriggered.entrySet().removeIf(e -> e.getValue().isBefore(cutoff));
        int removed = before - lastTriggered.size();
        if (removed > 0) {
            log.info("쿨다운 맵 청소: {}건 제거 (잔여 {}건)", removed, lastTriggered.size());
        }
    }
}
