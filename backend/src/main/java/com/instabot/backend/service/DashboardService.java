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
        // 플로우 openRate 평균 계산
        List<Flow> flows = flowRepository.findByUserIdOrderByCreatedAtDesc(userId);
        double avgOpenRate = flows.stream()
                .filter(f -> f.getOpenRate() != null && f.getOpenRate() > 0)
                .mapToDouble(Flow::getOpenRate)
                .average()
                .orElse(0.0);

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
                .totalMessagesSent(messageRepository.countOutboundByUserId(userId))
                .avgOpenRate(Math.round(avgOpenRate * 10.0) / 10.0)
                .avgClickRate(Math.round(avgClickRate * 10.0) / 10.0)
                .build();
    }
}
