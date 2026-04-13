package com.instabot.backend.service;

import com.instabot.backend.dto.DashboardDto;
import com.instabot.backend.entity.Broadcast;
import com.instabot.backend.entity.Conversation;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.entity.User;
import com.instabot.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private FlowRepository flowRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private BroadcastRepository broadcastRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private static final Long USER_ID = 1L;

    @Test
    void getDashboard_withData() {
        // given
        User user = User.builder().id(USER_ID).build();

        Flow flow1 = Flow.builder()
                .id(1L).user(user).name("Flow 1")
                .triggerType(Flow.TriggerType.KEYWORD)
                .openRate(40.0).createdAt(LocalDateTime.now())
                .build();
        Flow flow2 = Flow.builder()
                .id(2L).user(user).name("Flow 2")
                .triggerType(Flow.TriggerType.COMMENT)
                .openRate(60.0).createdAt(LocalDateTime.now())
                .build();

        Broadcast broadcast1 = Broadcast.builder()
                .id(1L).user(user).name("Broadcast 1")
                .clickRate(10.0).createdAt(LocalDateTime.now())
                .build();
        Broadcast broadcast2 = Broadcast.builder()
                .id(2L).user(user).name("Broadcast 2")
                .clickRate(20.0).createdAt(LocalDateTime.now())
                .build();

        when(contactRepository.countByUserId(USER_ID)).thenReturn(100L);
        when(contactRepository.countByUserIdAndActiveTrue(USER_ID)).thenReturn(80L);
        when(contactRepository.countVipByUserId(USER_ID)).thenReturn(5L);
        when(flowRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(List.of(flow1, flow2));
        when(flowRepository.countByUserIdAndActiveTrue(USER_ID)).thenReturn(1L);
        when(conversationRepository.countByUserIdAndStatus(USER_ID,
                Conversation.ConversationStatus.OPEN)).thenReturn(12L);
        when(messageRepository.countOutboundByUserId(USER_ID)).thenReturn(350L);
        when(broadcastRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(List.of(broadcast1, broadcast2));

        // when
        DashboardDto result = dashboardService.getDashboard(USER_ID);

        // then
        assertThat(result.getTotalContacts()).isEqualTo(100L);
        assertThat(result.getActiveContacts()).isEqualTo(80L);
        assertThat(result.getVipContacts()).isEqualTo(5L);
        assertThat(result.getTotalFlows()).isEqualTo(2L);
        assertThat(result.getActiveFlows()).isEqualTo(1L);
        assertThat(result.getOpenConversations()).isEqualTo(12L);
        assertThat(result.getTotalMessagesSent()).isEqualTo(350L);
        // avgOpenRate = (40.0 + 60.0) / 2 = 50.0
        assertThat(result.getAvgOpenRate()).isEqualTo(50.0);
        // avgClickRate = (10.0 + 20.0) / 2 = 15.0
        assertThat(result.getAvgClickRate()).isEqualTo(15.0);
    }

    @Test
    void getDashboard_empty() {
        // given
        when(contactRepository.countByUserId(USER_ID)).thenReturn(0L);
        when(contactRepository.countByUserIdAndActiveTrue(USER_ID)).thenReturn(0L);
        when(contactRepository.countVipByUserId(USER_ID)).thenReturn(0L);
        when(flowRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(Collections.emptyList());
        when(flowRepository.countByUserIdAndActiveTrue(USER_ID)).thenReturn(0L);
        when(conversationRepository.countByUserIdAndStatus(USER_ID,
                Conversation.ConversationStatus.OPEN)).thenReturn(0L);
        when(messageRepository.countOutboundByUserId(USER_ID)).thenReturn(0L);
        when(broadcastRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(Collections.emptyList());

        // when
        DashboardDto result = dashboardService.getDashboard(USER_ID);

        // then
        assertThat(result.getTotalContacts()).isZero();
        assertThat(result.getActiveContacts()).isZero();
        assertThat(result.getVipContacts()).isZero();
        assertThat(result.getTotalFlows()).isZero();
        assertThat(result.getActiveFlows()).isZero();
        assertThat(result.getOpenConversations()).isZero();
        assertThat(result.getTotalMessagesSent()).isZero();
        assertThat(result.getAvgOpenRate()).isZero();
        assertThat(result.getAvgClickRate()).isZero();
    }
}
