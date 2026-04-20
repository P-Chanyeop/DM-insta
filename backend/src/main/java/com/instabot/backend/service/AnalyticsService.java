package com.instabot.backend.service;

import com.instabot.backend.entity.Flow;
import com.instabot.backend.entity.NodeExecution;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.exception.UnauthorizedException;
import com.instabot.backend.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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
    private final NodeExecutionRepository nodeExecutionRepository;

    @Data
    @Builder
    public static class AnalyticsResponse {
        private long totalMessages;
        private long totalContacts;
        private long newContactsInPeriod;
        private double avgOpenRate;
        private double avgClickRate;
        private double conversionRate;
        private double unsubRate;
        // 이전 기간 대비 변화율
        private double sentChange;
        private double openRateChange;
        private double clickRateChange;
        private double conversionRateChange;
        private double unsubRateChange;
        private List<DailyStats> dailyMessages;
        private List<DailyStats> dailyOpened;
        private List<DailyStats> dailyClicked;
        private List<DailyStats> dailyNewContacts;
        private List<FlowPerformance> flowPerformances;
        private List<HourlyStats> hourlyEngagement;
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

    @Data
    @Builder
    public static class HourlyStats {
        private int hour;
        private long count;
    }

    public AnalyticsResponse getAnalytics(Long userId, int days) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate = now.minusDays(days);
        LocalDateTime prevStart = now.minusDays(days * 2L);

        // ── 현재 기간 데이터 ──
        long currentSent = messageRepository.countOutboundByUserIdAndSince(userId, startDate);
        long currentRead = messageRepository.countReadOutboundByUserIdAndSince(userId, startDate);
        long totalContacts = contactRepository.countByUserId(userId);
        long newContactsInPeriod = contactRepository.countByUserIdAndSubscribedAtAfter(userId, startDate);

        // ── 이전 기간 데이터 (비교용) ──
        long prevSent = messageRepository.countOutboundByUserIdAndSince(userId, prevStart)
                      - currentSent; // prevStart~startDate 구간
        long prevRead = messageRepository.countReadOutboundByUserIdAndSince(userId, prevStart)
                      - currentRead;

        // 플로우 성과
        List<Flow> flows = flowRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Long> flowIds = flows.stream().map(Flow::getId).toList();

        // 열림률: 기간 내 발송 중 읽음 비율
        double avgOpenRate = currentSent > 0
                ? Math.round(currentRead * 1000.0 / currentSent) / 10.0
                : 0.0;
        double prevOpenRate = prevSent > 0
                ? Math.round(prevRead * 1000.0 / prevSent) / 10.0
                : 0.0;

        // 클릭률: Broadcast clickRate 평균
        var broadcasts = broadcastRepository.findByUserIdOrderByCreatedAtDesc(userId);
        double avgClickRate = broadcasts.stream()
                .filter(b -> b.getClickRate() != null && b.getClickRate() > 0)
                .mapToDouble(b -> b.getClickRate())
                .average()
                .orElse(0.0);
        avgClickRate = Math.round(avgClickRate * 10.0) / 10.0;

        // 전환율: NodeExecution trigger COMPLETED → 최종 노드 COMPLETED
        double conversionRate = 0.0;
        double prevConversionRate = 0.0;
        if (!flowIds.isEmpty()) {
            try {
                var triggerCounts = nodeExecutionRepository.countTriggerActionsByFlowIds(flowIds, startDate);
                long triggerCompleted = triggerCounts.stream()
                        .filter(r -> r[0] == NodeExecution.Action.COMPLETED)
                        .mapToLong(r -> (Long) r[1])
                        .sum();
                long allCompleted = nodeExecutionRepository.countAllCompletedByFlowIds(flowIds, startDate);
                // 전환율 = 최종 완료 / 트리거 시작 (trigger COMPLETED = 플로우 시작됨)
                if (triggerCompleted > 0) {
                    // 최종 완료에서 trigger 완료 자체를 제외 (trigger 다음 단계부터가 실제 전환)
                    long nonTriggerCompleted = allCompleted - triggerCompleted;
                    conversionRate = Math.round(nonTriggerCompleted * 1000.0 / triggerCompleted) / 10.0;
                    conversionRate = Math.min(conversionRate, 100.0);
                }

                // 이전 기간 전환율
                var prevTriggerCounts = nodeExecutionRepository.countTriggerActionsByFlowIds(flowIds, prevStart);
                long prevTriggerAll = prevTriggerCounts.stream()
                        .filter(r -> r[0] == NodeExecution.Action.COMPLETED)
                        .mapToLong(r -> (Long) r[1])
                        .sum();
                prevTriggerAll -= triggerCompleted; // 이전 기간만
                long prevAllCompleted = nodeExecutionRepository.countAllCompletedByFlowIds(flowIds, prevStart)
                        - allCompleted;
                if (prevTriggerAll > 0) {
                    long prevNonTrigger = prevAllCompleted - prevTriggerAll;
                    prevConversionRate = Math.round(prevNonTrigger * 1000.0 / prevTriggerAll) / 10.0;
                    prevConversionRate = Math.min(prevConversionRate, 100.0);
                }
            } catch (Exception e) {
                // 데이터 없으면 0으로 유지
            }
        }

        // 구독 해지율: active=false / 전체 연락처
        long inactiveContacts = contactRepository.countByUserIdAndActiveFalse(userId);
        double unsubRate = totalContacts > 0
                ? Math.round(inactiveContacts * 1000.0 / totalContacts) / 10.0
                : 0.0;

        // ── vs 이전 기간 변화율 계산 ──
        double sentChange = calcChange(currentSent, prevSent);
        double openRateChange = round1(avgOpenRate - prevOpenRate);
        double clickRateChange = 0; // broadcast는 기간 필터 없으므로 0
        double conversionRateChange = round1(conversionRate - prevConversionRate);
        double unsubRateChange = 0; // 해지율은 누적이므로 변화율 비적용

        // ── 일별 통계 ──
        List<DailyStats> dailyMessages = buildDailyStats(
                messageRepository.countDailyOutboundByUserId(userId, startDate), days);
        List<DailyStats> dailyOpened = buildDailyStats(
                messageRepository.countDailyReadOutboundByUserId(userId, startDate), days);
        // 클릭은 일별 데이터 없으므로 열림 대비 비율로 추정
        final double clickRatio = (avgOpenRate > 0 && avgClickRate > 0) ? avgClickRate / avgOpenRate : 0;
        List<DailyStats> dailyClicked = dailyOpened.stream()
                .map(d -> DailyStats.builder()
                        .date(d.getDate())
                        .count(clickRatio > 0 ? Math.round(d.getCount() * clickRatio) : 0)
                        .build())
                .toList();

        List<DailyStats> dailyNewContacts = buildDailyStats(
                contactRepository.countDailyNewByUserId(userId, startDate), days);

        // 플로우별 성과 (openRate는 실제 메시지 읽음 데이터로 계산)
        List<FlowPerformance> flowPerformances = flows.stream()
                .map(f -> {
                    long flowSent = messageRepository.countOutboundByFlowId(f.getId());
                    double flowOpenRate = 0.0;
                    if (flowSent > 0) {
                        long flowRead = messageRepository.countReadOutboundByFlowId(f.getId());
                        flowOpenRate = Math.round(flowRead * 1000.0 / flowSent) / 10.0;
                    }
                    return FlowPerformance.builder()
                            .id(f.getId())
                            .name(f.getName())
                            .triggerType(f.getTriggerType().name())
                            .active(f.isActive())
                            .sentCount(f.getSentCount())
                            .openRate(flowOpenRate)
                            .build();
                })
                .toList();

        // 시간대별 참여 통계
        List<HourlyStats> hourlyEngagement = buildHourlyStats(
                messageRepository.countHourlyOutboundByUserId(userId, startDate));

        return AnalyticsResponse.builder()
                .totalMessages(currentSent)
                .totalContacts(totalContacts)
                .newContactsInPeriod(newContactsInPeriod)
                .avgOpenRate(avgOpenRate)
                .avgClickRate(avgClickRate)
                .conversionRate(conversionRate)
                .unsubRate(unsubRate)
                .sentChange(sentChange)
                .openRateChange(openRateChange)
                .clickRateChange(clickRateChange)
                .conversionRateChange(conversionRateChange)
                .unsubRateChange(unsubRateChange)
                .dailyMessages(dailyMessages)
                .dailyOpened(dailyOpened)
                .dailyClicked(dailyClicked)
                .dailyNewContacts(dailyNewContacts)
                .flowPerformances(flowPerformances)
                .hourlyEngagement(hourlyEngagement)
                .build();
    }

    private double calcChange(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return round1(((double)(current - previous) / previous) * 100);
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    /**
     * DB 쿼리 결과(시간대별 카운트)를 0~23시 전체 리스트로 변환.
     * 데이터가 없는 시간대는 0으로 채움.
     */
    private List<HourlyStats> buildHourlyStats(List<Object[]> queryResult) {
        Map<Integer, Long> countsByHour = queryResult.stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).intValue(),
                        row -> ((Number) row[1]).longValue()
                ));

        List<HourlyStats> stats = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            stats.add(HourlyStats.builder()
                    .hour(h)
                    .count(countsByHour.getOrDefault(h, 0L))
                    .build());
        }
        return stats;
    }

    /**
     * DB 쿼리 결과(날짜별 카운트)를 최근 N일 전체 날짜 리스트로 변환.
     * 데이터가 없는 날짜는 0으로 채움.
     */
    private List<DailyStats> buildDailyStats(List<Object[]> queryResult, int days) {
        Map<LocalDate, Long> countsByDate = queryResult.stream()
                .collect(Collectors.toMap(
                        row -> (LocalDate) row[0],
                        row -> (Long) row[1]
                ));

        List<DailyStats> stats = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            stats.add(DailyStats.builder()
                    .date(date.toString())
                    .count(countsByDate.getOrDefault(date, 0L))
                    .build());
        }
        return stats;
    }

    // ═══════════════════════════════════════════════════════════
    // 플로우 퍼널 분석
    // ═══════════════════════════════════════════════════════════

    @Data
    @Builder
    public static class FunnelResponse {
        private Long flowId;
        private String flowName;
        private int days;
        private List<FunnelStep> steps;
        private double overallConversionRate;
    }

    @Data
    @Builder
    public static class FunnelStep {
        private String nodeType;
        private String label;
        private long entered;
        private long completed;
        private long dropped;
        private double completionRate;
        private double dropRate;
    }

    /**
     * 플로우 퍼널 데이터 조회
     * 노드별 entered/completed/dropped 집계
     */
    public FunnelResponse getFlowFunnel(Long userId, Long flowId, int days) {
        Flow flow = flowRepository.findById(flowId)
                .orElseThrow(() -> new ResourceNotFoundException("플로우를 찾을 수 없습니다."));

        if (!flow.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("접근 권한이 없습니다.");
        }

        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<Object[]> rawData = nodeExecutionRepository.countByFlowIdGroupByNodeTypeAndAction(flowId, since);

        // nodeType → { action → count } 맵 구축
        Map<String, Map<NodeExecution.Action, Long>> nodeStats = new LinkedHashMap<>();
        for (Object[] row : rawData) {
            String nodeType = (String) row[0];
            NodeExecution.Action action = (NodeExecution.Action) row[1];
            long count = (Long) row[2];
            nodeStats.computeIfAbsent(nodeType, k -> new EnumMap<>(NodeExecution.Action.class)).put(action, count);
        }

        // 노드 순서 정의 (플로우 실행 흐름 순)
        List<String> orderedNodes = List.of(
                "trigger", "commentReply", "openingDm", "followCheck", "emailCollection",
                "mainDm", "carousel", "aiResponse", "followUp"
        );

        // 노드 레이블 맵
        Map<String, String> labelMap = Map.of(
                "trigger", "트리거",
                "commentReply", "댓글 답장",
                "openingDm", "오프닝 DM",
                "followCheck", "팔로우 확인",
                "emailCollection", "이메일 수집",
                "mainDm", "메인 DM",
                "carousel", "캐러셀",
                "aiResponse", "AI 응답",
                "followUp", "팔로업"
        );

        List<FunnelStep> steps = new ArrayList<>();

        // 기본 노드 + condition_ 프리픽스 동적 포함
        Set<String> allNodes = new LinkedHashSet<>(orderedNodes);
        for (String key : nodeStats.keySet()) {
            if (key.startsWith("condition_")) {
                allNodes.add(key);
            }
        }

        for (String nodeType : allNodes) {
            Map<NodeExecution.Action, Long> counts = nodeStats.get(nodeType);
            if (counts == null) continue;

            long entered = counts.getOrDefault(NodeExecution.Action.ENTERED, 0L);
            long completed = counts.getOrDefault(NodeExecution.Action.COMPLETED, 0L);
            long dropped = counts.getOrDefault(NodeExecution.Action.DROPPED, 0L);

            // trigger는 COMPLETED만 기록
            if ("trigger".equals(nodeType)) {
                entered = completed;
            }

            double completionRate = entered > 0 ? Math.round(completed * 1000.0 / entered) / 10.0 : 0;
            double dropRate = entered > 0 ? Math.round((entered - completed) * 1000.0 / entered) / 10.0 : 0;

            String label = labelMap.getOrDefault(nodeType,
                    nodeType.startsWith("condition_") ? "조건: " + nodeType.substring(10) : nodeType);

            steps.add(FunnelStep.builder()
                    .nodeType(nodeType)
                    .label(label)
                    .entered(entered)
                    .completed(completed)
                    .dropped(dropped)
                    .completionRate(completionRate)
                    .dropRate(dropRate)
                    .build());
        }

        // 전체 전환율: 첫 노드 entered → 마지막 노드 completed
        double overallRate = 0;
        if (!steps.isEmpty()) {
            long firstEntered = steps.get(0).getEntered();
            long lastCompleted = steps.get(steps.size() - 1).getCompleted();
            overallRate = firstEntered > 0 ? Math.round(lastCompleted * 1000.0 / firstEntered) / 10.0 : 0;
        }

        return FunnelResponse.builder()
                .flowId(flowId)
                .flowName(flow.getName())
                .days(days)
                .steps(steps)
                .overallConversionRate(overallRate)
                .build();
    }
}
