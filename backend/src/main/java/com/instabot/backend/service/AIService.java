package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.entity.Integration;
import com.instabot.backend.repository.IntegrationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

/**
 * AI 자동 응답 서비스
 *
 * Level 1: FAQ 키워드 매칭 (규칙 기반, API 비용 0원)
 * Level 2: 스마트 응답 (OpenAI GPT 기반, 브랜드 톤 + 컨텍스트)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AIService {

    private final IntegrationRepository integrationRepository;
    private final ObjectMapper objectMapper;

    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

    // ═══════════════════════════════════════════════════════════
    // Level 1: FAQ 키워드 매칭 (규칙 기반)
    // ═══════════════════════════════════════════════════════════

    /**
     * FAQ 항목에서 키워드 매칭으로 답변을 찾습니다.
     * @return 매칭된 답변, 없으면 null
     */
    public String matchFaq(String userMessage, JsonNode faqItems) {
        if (userMessage == null || faqItems == null || !faqItems.isArray()) return null;

        String lowerMsg = userMessage.toLowerCase().trim();

        for (JsonNode item : faqItems) {
            String keywords = item.path("keyword").asText("");
            String answer = item.path("answer").asText("");

            if (keywords.isBlank() || answer.isBlank()) continue;

            // 쉼표로 구분된 키워드 중 하나라도 포함되면 매칭
            String[] keywordArr = keywords.split(",");
            for (String kw : keywordArr) {
                String trimmed = kw.trim().toLowerCase();
                if (!trimmed.isEmpty() && lowerMsg.contains(trimmed)) {
                    log.debug("FAQ 매칭 성공: keyword='{}', message='{}'", trimmed, userMessage);
                    return answer;
                }
            }
        }

        return null; // 매칭 실패
    }

    // ═══════════════════════════════════════════════════════════
    // Level 2: 스마트 AI 응답 (OpenAI GPT)
    // ═══════════════════════════════════════════════════════════

    /**
     * OpenAI API를 호출하여 스마트 응답을 생성합니다.
     */
    public String generateSmartResponse(
            Long userId,
            String userMessage,
            List<String> conversationHistory,
            JsonNode brandTone,
            int maxTokens,
            Contact contact
    ) {
        // OpenAI API 키 조회
        String apiKey = getOpenAiApiKey(userId);
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OpenAI API 키 미설정: userId={}", userId);
            return null;
        }

        try {
            String systemPrompt = buildSystemPrompt(brandTone, contact);
            String requestBody = buildOpenAiRequest(systemPrompt, userMessage, conversationHistory, maxTokens);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(OPENAI_API_URL))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode body = objectMapper.readTree(response.body());
                String content = body.path("choices").path(0).path("message").path("content").asText("");
                int tokensUsed = body.path("usage").path("total_tokens").asInt(0);

                log.info("AI 응답 생성 완료: userId={}, tokens={}", userId, tokensUsed);
                return content.trim();
            } else {
                log.error("OpenAI API 오류: status={}, body={}", response.statusCode(), response.body());
                return null;
            }
        } catch (Exception e) {
            log.error("AI 응답 생성 실패: {}", e.getMessage(), e);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 통합 실행 (Flow 노드에서 호출)
    // ═══════════════════════════════════════════════════════════

    /**
     * AI 노드 설정에 따라 FAQ 또는 스마트 응답을 생성합니다.
     * @return 응답 메시지, 실패 시 null
     */
    public String executeAIResponse(
            Long userId,
            String userMessage,
            JsonNode aiResponseNode,
            List<String> conversationHistory,
            Contact contact
    ) {
        String mode = aiResponseNode.path("mode").asText("faq");

        if ("faq".equals(mode)) {
            JsonNode faqItems = aiResponseNode.get("faqItems");
            return matchFaq(userMessage, faqItems);
        }

        if ("smart".equals(mode)) {
            JsonNode brandTone = aiResponseNode.get("brandTone");
            int maxTokens = aiResponseNode.path("maxTokens").asInt(200);
            int contextWindow = aiResponseNode.path("contextWindow").asInt(3);

            // 컨텍스트 윈도우 제한
            List<String> limitedHistory = conversationHistory != null && conversationHistory.size() > contextWindow
                    ? conversationHistory.subList(conversationHistory.size() - contextWindow, conversationHistory.size())
                    : conversationHistory;

            return generateSmartResponse(userId, userMessage, limitedHistory, brandTone, maxTokens, contact);
        }

        return null;
    }

    /**
     * AI 응답 실패 시 fallback 메시지를 반환합니다.
     */
    public String getFallbackResponse(JsonNode aiResponseNode) {
        String fallbackAction = aiResponseNode.path("fallbackAction").asText("default_message");

        return switch (fallbackAction) {
            case "default_message" -> {
                String msg = aiResponseNode.path("fallbackMessage").asText("");
                yield msg.isBlank() ? "죄송합니다. 해당 문의는 상담원이 확인 후 답변 드리겠습니다." : msg;
            }
            case "retry" -> "죄송합니다. 질문을 다시 한 번 입력해 주시겠어요? 더 정확한 답변을 드리겠습니다.";
            case "human_handoff" -> "해당 문의는 전문 상담원에게 연결해 드리겠습니다. 잠시만 기다려 주세요.";
            default -> "죄송합니다. 잠시 후 다시 시도해 주세요.";
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 내부 유틸리티
    // ═══════════════════════════════════════════════════════════

    private String getOpenAiApiKey(Long userId) {
        return integrationRepository.findByUserIdAndType(userId, Integration.IntegrationType.OPENAI)
                .filter(Integration::isActive)
                .map(Integration::getConfig)
                .map(config -> {
                    try {
                        JsonNode json = objectMapper.readTree(config);
                        return json.path("apiKey").asText("");
                    } catch (Exception e) {
                        return "";
                    }
                })
                .orElse(null);
    }

    private String buildSystemPrompt(JsonNode brandTone, Contact contact) {
        String style = brandTone != null ? brandTone.path("style").asText("friendly") : "friendly";
        boolean emoji = brandTone == null || brandTone.path("emoji").asBoolean(true);
        int formality = brandTone != null ? brandTone.path("formality").asInt(3) : 3;

        StringBuilder sb = new StringBuilder();
        sb.append("당신은 Instagram DM 고객 응대 AI 어시스턴트입니다.\n\n");

        // 브랜드 톤 설정
        sb.append("## 톤 가이드\n");
        switch (style) {
            case "professional" -> sb.append("- 전문적이고 신뢰감 있는 톤으로 응답하세요.\n");
            case "casual" -> sb.append("- 가볍고 편안한 캐주얼 톤으로 응답하세요.\n");
            default -> sb.append("- 친근하고 따뜻한 톤으로 응답하세요.\n");
        }

        // 격식 수준
        if (formality <= 2) {
            sb.append("- 반말을 사용하세요 (예: ~해, ~야, ~지).\n");
        } else if (formality >= 4) {
            sb.append("- 정중한 존댓말을 사용하세요 (예: ~합니다, ~드리겠습니다).\n");
        } else {
            sb.append("- 자연스러운 존댓말을 사용하세요 (예: ~해요, ~드릴게요).\n");
        }

        // 이모지
        if (emoji) {
            sb.append("- 적절히 이모지를 사용하여 친근감을 표현하세요.\n");
        } else {
            sb.append("- 이모지를 사용하지 마세요.\n");
        }

        sb.append("- 답변은 간결하게 1~3문장으로 작성하세요.\n");
        sb.append("- 한국어로만 응답하세요.\n");
        sb.append("- Instagram DM 대화라는 점을 고려하여 짧고 자연스럽게 응답하세요.\n");

        // 고객 정보
        if (contact != null) {
            if (contact.getName() != null) {
                sb.append("\n## 고객 정보\n");
                sb.append("- 이름: ").append(contact.getName()).append("\n");
            }
        }

        return sb.toString();
    }

    private String buildOpenAiRequest(String systemPrompt, String userMessage,
                                       List<String> conversationHistory, int maxTokens) throws Exception {
        List<Map<String, String>> messages = new ArrayList<>();

        // 시스템 메시지
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // 이전 대화 컨텍스트 ("role:content" 형식)
        if (conversationHistory != null) {
            for (String entry : conversationHistory) {
                int colonIdx = entry.indexOf(':');
                String role = "user";
                String content = entry;
                if (colonIdx > 0 && colonIdx < entry.length() - 1) {
                    String prefix = entry.substring(0, colonIdx);
                    if ("user".equals(prefix) || "assistant".equals(prefix)) {
                        role = prefix;
                        content = entry.substring(colonIdx + 1);
                    }
                }
                messages.add(Map.of("role", role, "content", content));
            }
        }

        // 현재 메시지
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", "gpt-4o-mini");
        body.put("messages", messages);
        body.put("max_tokens", maxTokens);
        body.put("temperature", 0.7);

        return objectMapper.writeValueAsString(body);
    }
}
