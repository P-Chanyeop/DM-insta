package com.instabot.backend.service;

import com.instabot.backend.entity.Flow;
import com.instabot.backend.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 분석/통계 서비스
 * - 기간별 메시지 발송 수
 * - 기간별 신규 구독자 수
 * - 플로우별 성과
 */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final MessageRepository messageRepository;
    private final ContactRepository contactRepository;
    private final FlowRepository flowRepository;
    private final ConversationRepository conversationRepository;
    private final BroadcastRepository broadcastRepository;

    @Data
    @Builder
    public static class AnalyticsResponse {
        private long totalMessages;
        private long totalContacts;
        private long newContactsInPeriod;
        private double avgOpenRate;
        private double avgClickRate;
        private List<DailyStats> dailyMessages;
        private List<DailyStats> dailyNewContacts;
        private List<FlowPerformance> flowPerformances;
    }

    @Data
    @Builder
    public static class DailyStats {
        private String date;
        private long count;
    }

    @Data
    @Builder
    public static class FlowPerformance {
        private Long id;
        private String name;
        private String triggerType;
        private boolean active;
        private Long sentCount;
        private Double openRate;
    }

    public AnalyticsResponse getAnalytics(Long userId, int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);

        // 전체 메시지 수
        long totalMessages = messageRepository.countOutboundByUserId(userId);

        // 전체 연락처
        long totalContacts = contactRepository.countByUserId(userId);

        // 기간 내 신규 연락처
        long newContactsInPeriod = contactRepository.countByUserId(userId); // 기간 필터는 추후 쿼리 추가

        // 플로우 성과
        List<Flow> flows = flowRepository.findByUserIdOrderByCreatedAtDesc(userId);

        double avgOpenRate = flows.stream()
                .filter(f -> f.getOpenRate() != null && f.getOpenRate() > 0)
                .mapToDouble(Flow::getOpenRate)
                .average()
                .orElse(0.0);

        double avgClickRate = broadcastRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(b -> b.getClickRate() != null && b.getClickRate() > 0)
                .mapToDouble(b -> b.getClickRate())
                .average()
                .orElse(0.0);

        // 일별 통계 (최근 N일)
        List<DailyStats> dailyMessages = generateDailyPlaceholder(days);
        List<DailyStats> dailyNewContacts = generateDailyPlaceholder(days);

        // 플로우별 성과
        List<FlowPerformance> flowPerformances = flows.stream()
                .map(f -> FlowPerformance.builder()
                        .id(f.getId())
                        .name(f.getName())
                        .triggerType(f.getTriggerType().name())
                        .active(f.isActive())
                        .sentCount(f.getSentCount())
                        .openRate(f.getOpenRate())
                        .build())
                .toList();

        return AnalyticsResponse.builder()
                .totalMessages(totalMessages)
                .totalContacts(totalContacts)
                .newContactsInPeriod(newContactsInPeriod)
                .avgOpenRate(Math.round(avgOpenRate * 10.0) / 10.0)
                .avgClickRate(Math.round(avgClickRate * 10.0) / 10.0)
                .dailyMessages(dailyMessages)
                .dailyNewContacts(dailyNewContacts)
                .flowPerformances(flowPerformances)
                .build();
    }

    private List<DailyStats> generateDailyPlaceholder(int days) {
        List<DailyStats> stats = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            stats.add(DailyStats.builder()
                    .date(LocalDate.now().minusDays(i).toString())
                    .count(0)
                    .build());
        }
        return stats;
    }
}
