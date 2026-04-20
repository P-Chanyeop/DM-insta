package com.instabot.backend.service;

import com.instabot.backend.dto.DashboardDto;
import com.instabot.backend.entity.Conversation;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ContactRepository contactRepository;
    private final FlowRepository flowRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final BroadcastRepository broadcastRepository;

    @Cacheable(value = "dashboard", key = "#userId")
    public DashboardDto getDashboard(Long userId) {
        List<Flow> flows = flowRepository.findByUserIdOrderByCreatedAtDesc(userId);

        // 열림률: 전체 발송 메시지 중 읽음 비율 (실제 데이터)
        long totalSent = messageRepository.countOutboundByUserId(userId);
        long totalRead = messageRepository.countReadOutboundByUserIdAndSince(userId,
                java.time.LocalDateTime.of(2020, 1, 1, 0, 0)); // 전체 기간
        double avgOpenRate = totalSent > 0
                ? Math.round(totalRead * 1000.0 / totalSent) / 10.0
                : 0.0;

        // 브로드캐스트 clickRate 평균 계산
        double avgClickRate = broadcastRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(b -> b.getClickRate() != null && b.getClickRate() > 0)
                .mapToDouble(b -> b.getClickRate())
                .average()
                .orElse(0.0);

        return DashboardDto.builder()
                .totalContacts(contactRepository.countByUserId(userId))
                .activeContacts(contactRepository.countByUserIdAndActiveTrue(userId))
                .vipContacts(contactRepository.countVipByUserId(userId))
                .totalFlows((long) flows.size())
                .activeFlows(flowRepository.countByUserIdAndActiveTrue(userId))
                .openConversations(conversationRepository.countByUserIdAndStatus(userId, Conversation.ConversationStatus.OPEN))
                .totalMessagesSent(totalSent)
                .avgOpenRate(avgOpenRate)
                .avgClickRate(Math.round(avgClickRate * 10.0) / 10.0)
                .build();
    }
}
