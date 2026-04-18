package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.entity.ScheduledFollowUp;
import com.instabot.backend.repository.ScheduledFollowUpRepository;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 딜레이(타이머) 노드 — 그래프 순회를 지정된 시간만큼 지연시킨다.
 *
 * v1: delay 노드가 직접 메시지를 포함 → ScheduledFollowUp에 저장.
 * v2: delay 노드는 시간만 지정. AWAITING_DELAY + scheduledResumeAt을 설정하여
 *     스케줄러가 해당 시각에 그래프 순회를 재개한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DelayNodeExecutor implements NodeExecutor {

    private final ScheduledFollowUpRepository scheduledFollowUpRepository;

    @Override
    public String[] supportedTypes() {
        return new String[]{"delay"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        String message = data.path("message").asText("");
        int delay = data.path("delay").asInt(30);
        String unit = data.path("unit").asText("minutes");

        long delayMinutes = switch (unit) {
            case "시간", "hours" -> (long) delay * 60;
            case "일", "days" -> (long) delay * 60 * 24;
            default -> delay; // 분/minutes
        };

        // v1 호환: 메시지가 있으면 ScheduledFollowUp에 저장
        if (!message.isBlank()) {
            ScheduledFollowUp followUp = ScheduledFollowUp.builder()
                    .instagramAccount(ctx.getIgAccount())
                    .recipientIgId(ctx.getSenderIgId())
                    .message(message)
                    .scheduledAt(LocalDateTime.now().plusMinutes(delayMinutes))
                    .status(ScheduledFollowUp.Status.PENDING)
                    .build();
            scheduledFollowUpRepository.save(followUp);
            return NodeExecResult.ok();
        }

        // v2: 메시지 없으면 → 그래프 일시 중지 (AWAITING_DELAY)
        // FlowExecutionService가 PendingFlowAction에 scheduledResumeAt 설정
        log.info("딜레이 노드 대기: {}분 후 그래프 재개", delayMinutes);
        ctx.getVariables().put("delayMinutes", String.valueOf(delayMinutes));
        return NodeExecResult.builder()
                .success(true)
                .awaitUser(true)
                .awaitStep(PendingStep.AWAITING_DELAY)
                .build();
    }
}
