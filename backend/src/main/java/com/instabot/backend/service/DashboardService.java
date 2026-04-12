package com.instabot.backend.service;

import com.instabot.backend.dto.DashboardDto;
import com.instabot.backend.entity.Conversation;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ContactRepository contactRepository;
    private final FlowRepository flowRepository;
    private final ConversationRepository conversationRepository;

    public DashboardDto getDashboard(Long userId) {
        return DashboardDto.builder()
                .totalContacts(contactRepository.countByUserId(userId))
                .activeContacts(contactRepository.countByUserIdAndActiveTrue(userId))
                .vipContacts(contactRepository.countVipByUserId(userId))
                .totalFlows(flowRepository.findByUserIdOrderByCreatedAtDesc(userId).size())
                .activeFlows(flowRepository.countByUserIdAndActiveTrue(userId))
                .openConversations(conversationRepository.countByUserIdAndStatus(userId, Conversation.ConversationStatus.OPEN))
                .build();
    }
}
