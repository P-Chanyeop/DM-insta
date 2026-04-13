package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.entity.*;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * 자동화 플로우 실행 엔진
 *
 * flowData JSON 구조 (프론트엔드 FlowBuilderPage에서 생성):
 * {
 *   "trigger": { "type": "COMMENT", "keywords": [...], "excludeKeywords": [...], "matchType": "CONTAINS", "postTarget": "ALL" },
 *   "commentReply": { "enabled": true, "replies": ["답장1", "답장2"] },
 *   "openingDm": { "enabled": true, "message": "...", "buttonText": "..." },
 *   "requirements": { "followCheck": { "enabled": true, "message": "..." }, "emailCollection": { "enabled": true, "message": "..." } },
 *   "mainDm": { "message": "...", "links": [{ "text": "...", "url": "..." }] },
 *   "followUp": { "enabled": true, "delay": 30, "unit": "분", "message": "..." }
 * }
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowExecutionService {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final ObjectMapper objectMapper;
    private final FlowRepository flowRepository;
    private final ContactRepository contactRepository;
    private final MessageRepository messageRepository;

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");

    /**
     * 플로우 실행 진입점
     * 트리거 매칭 후 호출됨
     */
    @Async
    public void executeFlow(Flow flow, InstagramAccount igAccount, String senderIgId,
                             String triggerText, String commentId) {
        try {
            log.info("플로우 실행 시작: flowId={}, sender={}", flow.getId(), senderIgId);

            JsonNode flowData = objectMapper.readTree(flow.getFlowData());
            String accessToken = instagramApiService.getDecryptedToken(igAccount);
            String botIgId = igAccount.getIgUserId();

            // 1. 공개 댓글 답장
            if (commentId != null && flowData.has("commentReply")) {
                executeCommentReply(flowData.get("commentReply"), commentId, accessToken);
            }

            // 2. 오프닝 DM
            if (flowData.has("openingDm")) {
                executeOpeningDm(flowData.get("openingDm"), botIgId, senderIgId, accessToken);
            }

            // 3. 요구사항 (팔로우 확인은 비동기적으로 Webhook에서 처리됨)
            // 실제로는 오프닝 DM의 버튼 응답(postback)을 기다린 후 진행
            // 여기서는 전체 흐름을 순차 실행 (Webhook postback 시 다음 단계 진행)

            // 4. 메인 DM (링크 포함)
            if (flowData.has("mainDm")) {
                executeMainDm(flowData.get("mainDm"), botIgId, senderIgId, accessToken);
            }

            // 5. 팔로업 메시지 (지연 발송)
            if (flowData.has("followUp")) {
                executeFollowUp(flowData.get("followUp"), botIgId, senderIgId, accessToken);
            }

            // 발송 카운트 증가
            incrementSentCount(flow);

            log.info("플로우 실행 완료: flowId={}", flow.getId());

        } catch (Exception e) {
            log.error("플로우 실행 실패: flowId={}, error={}", flow.getId(), e.getMessage(), e);
        }
    }

    // ─── 단계별 실행 ───

    private void executeCommentReply(JsonNode commentReplyNode, String commentId, String accessToken) {
        if (!commentReplyNode.path("enabled").asBoolean(false)) return;

        JsonNode replies = commentReplyNode.get("replies");
        if (replies == null || !replies.isArray() || replies.isEmpty()) return;

        // 복수 답장 중 랜덤 선택
        int idx = new Random().nextInt(replies.size());
        String reply = replies.get(idx).asText();

        try {
            instagramApiService.replyToComment(commentId, reply, accessToken);
            log.debug("댓글 답장 완료: commentId={}", commentId);
        } catch (Exception e) {
            log.error("댓글 답장 실패: {}", e.getMessage());
        }
    }

    private void executeOpeningDm(JsonNode openingDmNode, String botIgId, String recipientId,
                                   String accessToken) {
        if (!openingDmNode.path("enabled").asBoolean(false)) return;

        String message = openingDmNode.path("message").asText("");
        String buttonText = openingDmNode.path("buttonText").asText("");

        if (message.isBlank()) return;

        try {
            if (!buttonText.isBlank()) {
                // Quick Reply 버튼 포함
                List<Map<String, String>> quickReplies = List.of(
                        Map.of("title", buttonText, "payload", "OPENING_DM_CLICKED")
                );
                instagramApiService.sendQuickReplyMessage(botIgId, recipientId, message, quickReplies, accessToken);
            } else {
                instagramApiService.sendTextMessage(botIgId, recipientId, message, accessToken);
            }
            log.debug("오프닝 DM 발송 완료: recipient={}", recipientId);
        } catch (Exception e) {
            log.error("오프닝 DM 발송 실패: {}", e.getMessage());
        }
    }

    private void executeMainDm(JsonNode mainDmNode, String botIgId, String recipientId,
                                String accessToken) {
        String message = mainDmNode.path("message").asText("");
        if (message.isBlank()) return;

        JsonNode links = mainDmNode.get("links");

        try {
            if (links != null && links.isArray() && !links.isEmpty()) {
                // 링크 버튼이 있으면 Generic Template
                List<Map<String, String>> buttons = new ArrayList<>();
                for (JsonNode link : links) {
                    String text = link.path("text").asText("");
                    String url = link.path("url").asText("");
                    if (!text.isBlank() && !url.isBlank()) {
                        buttons.add(Map.of("title", text, "url", url));
                    }
                }

                if (!buttons.isEmpty()) {
                    instagramApiService.sendGenericTemplate(botIgId, recipientId, message, null, buttons, accessToken);
                } else {
                    instagramApiService.sendTextMessage(botIgId, recipientId, message, accessToken);
                }
            } else {
                instagramApiService.sendTextMessage(botIgId, recipientId, message, accessToken);
            }
            log.debug("메인 DM 발송 완료: recipient={}", recipientId);
        } catch (Exception e) {
            log.error("메인 DM 발송 실패: {}", e.getMessage());
        }
    }

    private void executeFollowUp(JsonNode followUpNode, String botIgId, String recipientId,
                                   String accessToken) {
        if (!followUpNode.path("enabled").asBoolean(false)) return;

        String message = followUpNode.path("message").asText("");
        if (message.isBlank()) return;

        int delay = followUpNode.path("delay").asInt(30);
        String unit = followUpNode.path("unit").asText("분");

        long delayMs = switch (unit) {
            case "시간" -> TimeUnit.HOURS.toMillis(delay);
            case "일" -> TimeUnit.DAYS.toMillis(delay);
            default -> TimeUnit.MINUTES.toMillis(delay);
        };

        // 지연 후 발송 (별도 스레드)
        new Thread(() -> {
            try {
                Thread.sleep(delayMs);
                instagramApiService.sendTextMessage(botIgId, recipientId, message, accessToken);
                log.debug("팔로업 메시지 발송 완료: recipient={}, delay={}ms", recipientId, delayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                log.error("팔로업 메시지 발송 실패: {}", e.getMessage());
            }
        }).start();
    }

    // ─── 트리거 매칭 ───

    /**
     * 키워드 매칭 확인
     */
    public boolean matchesKeyword(JsonNode triggerNode, String text) {
        if (text == null || text.isBlank()) return false;

        JsonNode keywords = triggerNode.get("keywords");
        if (keywords == null || !keywords.isArray() || keywords.isEmpty()) {
            return true; // 키워드 미설정 시 모든 메시지 매칭
        }

        String matchType = triggerNode.path("matchType").asText("CONTAINS");
        String lowerText = text.toLowerCase();

        for (JsonNode kw : keywords) {
            String keyword = kw.asText().toLowerCase();
            boolean matched = switch (matchType) {
                case "EXACT" -> lowerText.equals(keyword);
                case "STARTS_WITH" -> lowerText.startsWith(keyword);
                default -> lowerText.contains(keyword); // CONTAINS
            };
            if (matched) return true;
        }

        return false;
    }

    /**
     * 제외 키워드 확인
     */
    public boolean matchesExcludeKeyword(JsonNode triggerNode, String text) {
        if (text == null) return false;

        JsonNode excludeKeywords = triggerNode.get("excludeKeywords");
        if (excludeKeywords == null || !excludeKeywords.isArray()) return false;

        String lowerText = text.toLowerCase();
        for (JsonNode kw : excludeKeywords) {
            if (lowerText.contains(kw.asText().toLowerCase())) return true;
        }
        return false;
    }

    /**
     * 이메일 추출
     */
    public Optional<String> extractEmail(String text) {
        if (text == null) return Optional.empty();
        var matcher = EMAIL_PATTERN.matcher(text);
        return matcher.find() ? Optional.of(matcher.group()) : Optional.empty();
    }

    @Transactional
    private void incrementSentCount(Flow flow) {
        flow.setSentCount(flow.getSentCount() == null ? 1 : flow.getSentCount() + 1);
        flowRepository.save(flow);
    }
}
