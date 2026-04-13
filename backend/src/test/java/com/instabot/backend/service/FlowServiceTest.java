package com.instabot.backend.service;

import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.entity.User;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.FlowRepository;
import com.instabot.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FlowServiceTest {

    @Mock
    private FlowRepository flowRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FlowService flowService;

    private User createTestUser() {
        return User.builder()
                .id(1L)
                .email("test@example.com")
                .name("Test User")
                .build();
    }

    private Flow createTestFlow(User user) {
        return Flow.builder()
                .id(10L)
                .user(user)
                .name("Test Flow")
                .triggerType(Flow.TriggerType.KEYWORD)
                .flowData("{}")
                .sentCount(5L)
                .openRate(45.5)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getFlows_returnsUserFlows() {
        // given
        User user = createTestUser();
        Flow flow1 = createTestFlow(user);
        Flow flow2 = Flow.builder()
                .id(11L).user(user).name("Flow 2")
                .triggerType(Flow.TriggerType.COMMENT)
                .flowData("{}").createdAt(LocalDateTime.now())
                .build();

        when(flowRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(flow1, flow2));

        // when
        List<FlowDto.Response> result = flowService.getFlows(1L);

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("Test Flow");
        assertThat(result.get(1).getName()).isEqualTo("Flow 2");
    }

    @Test
    void getFlow_found() {
        // given
        Flow flow = createTestFlow(createTestUser());
        when(flowRepository.findById(10L)).thenReturn(Optional.of(flow));

        // when
        FlowDto.Response result = flowService.getFlow(1L, 10L);

        // then
        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getName()).isEqualTo("Test Flow");
        assertThat(result.getTriggerType()).isEqualTo("KEYWORD");
        assertThat(result.getSentCount()).isEqualTo(5L);
        assertThat(result.getOpenRate()).isEqualTo(45.5);
    }

    @Test
    void getFlow_notFound_throwsResourceNotFound() {
        // given
        when(flowRepository.findById(999L)).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> flowService.getFlow(1L, 999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createFlow_success() {
        // given
        User user = createTestUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(flowRepository.save(any(Flow.class))).thenAnswer(invocation -> {
            Flow saved = invocation.getArgument(0);
            saved.setId(20L);
            return saved;
        });

        FlowDto.CreateRequest request = new FlowDto.CreateRequest();
        request.setName("New Flow");
        request.setTriggerType("KEYWORD");
        request.setFlowData("{\"trigger\":{}}");

        // when
        FlowDto.Response result = flowService.createFlow(1L, request);

        // then
        assertThat(result.getId()).isEqualTo(20L);
        assertThat(result.getName()).isEqualTo("New Flow");
        assertThat(result.getTriggerType()).isEqualTo("KEYWORD");
        verify(flowRepository).save(any(Flow.class));
    }

    @Test
    void updateFlow_partialUpdate() {
        // given
        Flow existing = createTestFlow(createTestUser());
        existing.setActive(false);
        when(flowRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(flowRepository.save(any(Flow.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FlowDto.UpdateRequest request = new FlowDto.UpdateRequest();
        request.setName("Updated Name");
        // flowData, active, and status are left null -- should not be changed

        // when
        FlowDto.Response result = flowService.updateFlow(1L, 10L, request);

        // then
        assertThat(result.getName()).isEqualTo("Updated Name");
        assertThat(result.getFlowData()).isEqualTo("{}"); // unchanged
        assertThat(result.isActive()).isFalse();           // unchanged
    }

    @Test
    void toggleFlow_togglesActive() {
        // given
        Flow flow = createTestFlow(createTestUser());
        flow.setActive(false);
        when(flowRepository.findById(10L)).thenReturn(Optional.of(flow));
        when(flowRepository.save(any(Flow.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        FlowDto.Response result = flowService.toggleFlow(1L, 10L);

        // then
        assertThat(result.isActive()).isTrue();
    }

    @Test
    void deleteFlow_callsRepository() {
        // given
        Flow flow = createTestFlow(createTestUser());
        when(flowRepository.findById(10L)).thenReturn(Optional.of(flow));

        // when
        flowService.deleteFlow(1L, 10L);

        // then
        verify(flowRepository).delete(flow);
    }

    @Test
    void parseTriggerType_koreanComment() {
        // given
        User user = createTestUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(flowRepository.save(any(Flow.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FlowDto.CreateRequest request = new FlowDto.CreateRequest();
        request.setName("Comment Flow");
        request.setTriggerType("댓글");
        request.setFlowData("{}");

        // when
        FlowDto.Response result = flowService.createFlow(1L, request);

        // then
        assertThat(result.getTriggerType()).isEqualTo("COMMENT");
    }

    @Test
    void parseTriggerType_koreanKeyword() {
        // given
        User user = createTestUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(flowRepository.save(any(Flow.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FlowDto.CreateRequest request = new FlowDto.CreateRequest();
        request.setName("Keyword Flow");
        request.setTriggerType("키워드");
        request.setFlowData("{}");

        // when
        FlowDto.Response result = flowService.createFlow(1L, request);

        // then
        assertThat(result.getTriggerType()).isEqualTo("KEYWORD");
    }
}
