package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.ScheduledFollowUp;
import com.instabot.backend.repository.ScheduledFollowUpRepository;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 딜레이(타이머) 노드 — 팔로업 메시지를 DB에 스케줄링
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

        if (!message.isBlank()) {
            ScheduledFollowUp followUp = ScheduledFollowUp.builder()
                    .instagramAccount(ctx.getIgAccount())
                    .recipientIgId(ctx.getSenderIgId())
                    .message(message)
                    .scheduledAt(LocalDateTime.now().plusMinutes(delayMinutes))
                    .status(ScheduledFollowUp.Status.PENDING)
                    .build();
            scheduledFollowUpRepository.save(followUp);
        }

        return NodeExecResult.ok();
    }
}
