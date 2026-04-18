package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.repository.*;
import com.instabot.backend.service.flow.NodeExecutorRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class FlowExecutionServiceTest {

    @Mock
    private InstagramApiService instagramApiService;

    @Mock
    private ConversationService conversationService;

    @Mock
    private AIService aiService;

    @Mock
    private GroupBuyService groupBuyService;

    @Mock
    private RecurringNotificationService recurringNotificationService;

    @Mock
    private ABTestService abTestService;

    @Mock
    private KakaoChannelService kakaoChannelService;

    @Mock
    private FlowRepository flowRepository;

    @Mock
    private ContactRepository contactRepository;

    @Mock
    private GroupBuyRepository groupBuyRepository;

    @Mock
    private PendingFlowActionRepository pendingFlowActionRepository;

    @Mock
    private ScheduledFollowUpRepository scheduledFollowUpRepository;

    @Mock
    private NodeExecutionRepository nodeExecutionRepository;

    @Mock
    private NodeExecutorRegistry nodeExecutorRegistry;

    @InjectMocks
    private FlowExecutionService flowExecutionService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        // Inject a real ObjectMapper so JSON parsing works in the methods under test
        ReflectionTestUtils.setField(flowExecutionService, "objectMapper", objectMapper);
    }

    // --- matchesKeyword tests ---

    @Test
    void matchesKeyword_contains_match() throws Exception {
        // given
        JsonNode trigger = objectMapper.readTree(
                "{\"keywords\":[\"hello\",\"world\"],\"matchType\":\"CONTAINS\"}");

        // when & then
        assertThat(flowExecutionService.matchesKeyword(trigger, "say hello there")).isTrue();
    }

    @Test
    void matchesKeyword_exact_match() throws Exception {
        // given
        JsonNode trigger = objectMapper.readTree(
                "{\"keywords\":[\"hello\"],\"matchType\":\"EXACT\"}");

        // when & then
        assertThat(flowExecutionService.matchesKeyword(trigger, "hello")).isTrue();
        assertThat(flowExecutionService.matchesKeyword(trigger, "hello world")).isFalse();
    }

    @Test
    void matchesKeyword_noKeywords_matchesAll() throws Exception {
        // given -- empty keywords array means match everything
        JsonNode trigger = objectMapper.readTree("{\"keywords\":[],\"matchType\":\"CONTAINS\"}");

        // when & then
        assertThat(flowExecutionService.matchesKeyword(trigger, "anything")).isTrue();
    }

    // --- matchesExcludeKeyword tests ---

    @Test
    void matchesExcludeKeyword_found() throws Exception {
        // given
        JsonNode trigger = objectMapper.readTree(
                "{\"excludeKeywords\":[\"spam\",\"ad\"]}");

        // when & then
        assertThat(flowExecutionService.matchesExcludeKeyword(trigger, "this is spam")).isTrue();
    }

    @Test
    void matchesExcludeKeyword_notFound() throws Exception {
        // given
        JsonNode trigger = objectMapper.readTree(
                "{\"excludeKeywords\":[\"spam\",\"ad\"]}");

        // when & then
        assertThat(flowExecutionService.matchesExcludeKeyword(trigger, "hello world")).isFalse();
    }

    // --- extractEmail tests ---

    @Test
    void extractEmail_found() {
        // when
        Optional<String> result = flowExecutionService.extractEmail(
                "Please contact me at user@example.com for details");

        // then
        assertThat(result).isPresent().contains("user@example.com");
    }

    @Test
    void extractEmail_notFound() {
        // when
        Optional<String> result = flowExecutionService.extractEmail("no email here");

        // then
        assertThat(result).isEmpty();
    }
}
