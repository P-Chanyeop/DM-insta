package com.instabot.backend.service.flow;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.*;
import com.instabot.backend.entity.PendingFlowAction.PendingStep;
import com.instabot.backend.repository.*;
import com.instabot.backend.service.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Phase 2 레거시 위임 실행기.
 * 기존 FlowExecutionService의 개별 노드 실행 로직을
 * NodeExecutor 인터페이스로 감싼다.
 * Phase 3에서 개별 NodeExecutor로 분리하면 이 클래스는 제거된다.
 */
@Slf4j
@Component
public class LegacyDelegatingExecutor implements NodeExecutor {

    private final InstagramApiService instagramApiService;
    private final ConversationService conversationService;
    private final AIService aiService;
    private final GroupBuyService groupBuyService;
    private final RecurringNotificationService recurringNotificationService;
    private final ABTestService abTestService;
    private final KakaoChannelService kakaoChannelService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final ContactRepository contactRepository;
    private final GroupBuyRepository groupBuyRepository;
    private final ScheduledFollowUpRepository scheduledFollowUpRepository;

    public LegacyDelegatingExecutor(
            InstagramApiService instagramApiService,
            ConversationService conversationService,
            AIService aiService,
            GroupBuyService groupBuyService,
            RecurringNotificationService recurringNotificationService,
            ABTestService abTestService,
            KakaoChannelService kakaoChannelService,
            com.fasterxml.jackson.databind.ObjectMapper objectMapper,
            ContactRepository contactRepository,
            GroupBuyRepository groupBuyRepository,
            ScheduledFollowUpRepository scheduledFollowUpRepository) {
        this.instagramApiService = instagramApiService;
        this.conversationService = conversationService;
        this.aiService = aiService;
        this.groupBuyService = groupBuyService;
        this.recurringNotificationService = recurringNotificationService;
        this.abTestService = abTestService;
        this.kakaoChannelService = kakaoChannelService;
        this.objectMapper = objectMapper;
        this.contactRepository = contactRepository;
        this.groupBuyRepository = groupBuyRepository;
        this.scheduledFollowUpRepository = scheduledFollowUpRepository;
    }

    @Override
    public String[] supportedTypes() {
        return new String[]{
                "trigger", "commentReply", "openingDm", "message",
                "followCheck", "emailCollection",
                "condition", "inventory", "abtest",
                "carousel", "aiResponse", "optIn", "kakao",
                "delay", "action", "webhook"
        };
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        return switch (node.getType()) {
            case "trigger" -> NodeExecResult.ok(); // 트리거 노드는 진입만 추적

            case "commentReply" -> executeCommentReply(ctx, data);

            case "openingDm" -> executeOpeningDm(ctx, data);

            case "message" -> executeMessage(ctx, data);

            case "followCheck" -> executeFollowCheck(ctx, data);

            case "emailCollection" -> executeEmailCollection(ctx, data);

            case "condition" -> executeCondition(ctx, data);

            case "inventory" -> executeInventory(ctx, data);

            case "abtest" -> executeAbTest(ctx, data);

            case "carousel" -> executeCarousel(ctx, data);

            case "aiResponse" -> executeAiResponse(ctx, data);

            case "optIn" -> executeOptIn(ctx, data);

            case "kakao" -> executeKakao(ctx, data);

            case "delay" -> executeDelay(ctx, data);

            case "action" -> executeAction(ctx, data);

            case "webhook" -> executeWebhook(ctx, data);

            default -> {
                log.warn("미지원 노드 타입: {}", node.getType());
                yield NodeExecResult.ok();
            }
        };
    }

    // ────────────────────────────────────────────
    //  개별 노드 실행 (기존 FlowExecutionService 로직 이식)
    // ────────────────────────────────────────────

    private NodeExecResult executeCommentReply(FlowContext ctx, JsonNode data) {
        if (!data.path("enabled").asBoolean(false)) return NodeExecResult.ok();

        JsonNode replies = data.get("replies");
        if (replies == null || !replies.isArray() || replies.isEmpty()) return NodeExecResult.ok();

        int idx = new Random().nextInt(replies.size());
        String reply = replaceVariables(replies.get(idx).asText(), ctx);

        int replyDelayMax = data.path("replyDelay").asInt(0);
        if (replyDelayMax > 0) {
            int minDelay = Math.max(1, replyDelayMax / 3);
            int actualDelay = minDelay + new Random().nextInt(replyDelayMax - minDelay + 1);
            try {
                Thread.sleep(actualDelay * 1000L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return NodeExecResult.halt();
            }
        }

        try {
            instagramApiService.replyToComment(ctx.getCommentId(), reply, ctx.getAccessToken());
        } catch (Exception e) {
            log.error("댓글 답장 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }

    private NodeExecResult executeOpeningDm(FlowContext ctx, JsonNode data) {
        if (!data.path("enabled").asBoolean(false)) return NodeExecResult.ok();

        String message = replaceVariables(data.path("message").asText(""), ctx);
        String buttonText = data.path("buttonText").asText("");
        if (message.isBlank()) return NodeExecResult.ok();

        try {
            if (!buttonText.isBlank()) {
                List<Map<String, String>> quickReplies = List.of(
                        Map.of("title", buttonText, "payload", "OPENING_DM_CLICKED")
                );
                instagramApiService.sendQuickReplyMessage(
                        ctx.getBotIgId(), ctx.getSenderIgId(), message, quickReplies, ctx.getAccessToken());
                // 버튼이 있으면 postback 대기
                return NodeExecResult.await(PendingStep.AWAITING_POSTBACK);
            } else {
                instagramApiService.sendTextMessage(
                        ctx.getBotIgId(), ctx.getSenderIgId(), message, ctx.getAccessToken());
            }
        } catch (Exception e) {
            log.error("오프닝 DM 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }

    private NodeExecResult executeMessage(FlowContext ctx, JsonNode data) {
        String message = replaceVariables(data.path("message").asText(""), ctx);
        if (message.isBlank()) return NodeExecResult.ok();

        JsonNode links = data.get("links");
        try {
            if (links != null && links.isArray() && !links.isEmpty()) {
                List<Map<String, String>> buttons = new ArrayList<>();
                for (JsonNode link : links) {
                    String text = link.path("text").asText(link.path("label").asText(""));
                    String url = link.path("url").asText("");
                    if (!text.isBlank() && !url.isBlank()) {
                        buttons.add(Map.of("title", text, "url", url));
                    }
                }
                if (!buttons.isEmpty()) {
                    instagramApiService.sendGenericTemplate(
                            ctx.getBotIgId(), ctx.getSenderIgId(), message, null, buttons, ctx.getAccessToken());
                } else {
                    instagramApiService.sendTextMessage(
                            ctx.getBotIgId(), ctx.getSenderIgId(), message, ctx.getAccessToken());
                }
            } else {
                instagramApiService.sendTextMessage(
                        ctx.getBotIgId(), ctx.getSenderIgId(), message, ctx.getAccessToken());
            }

            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), message, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("메시지 DM 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }

    private NodeExecResult executeFollowCheck(FlowContext ctx, JsonNode data) {
        boolean isFollower = instagramApiService.isFollower(
                ctx.getBotIgId(), ctx.getSenderIgId(), ctx.getAccessToken());

        if (isFollower) {
            return NodeExecResult.branch("pass");
        }

        // 팔로우 안 됨 → 팔로우 요청 메시지 + 대기
        String followMsg = replaceVariables(
                data.path("message").asText("링크를 받으시려면 먼저 팔로우를 해주세요!"), ctx);
        try {
            List<Map<String, String>> quickReplies = List.of(
                    Map.of("title", "✅ 팔로우 했어요", "payload", "FOLLOW_CHECK")
            );
            instagramApiService.sendQuickReplyMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), followMsg, quickReplies, ctx.getAccessToken());
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), followMsg, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("팔로우 요청 메시지 발송 실패: {}", e.getMessage());
        }

        return NodeExecResult.await(PendingStep.AWAITING_FOLLOW);
    }

    private NodeExecResult executeEmailCollection(FlowContext ctx, JsonNode data) {
        boolean hasEmail = contactHasEmail(ctx.getIgAccount().getUser().getId(), ctx.getSenderIgId());
        if (hasEmail) {
            return NodeExecResult.branch("pass");
        }

        String emailMsg = replaceVariables(
                data.path("message").asText("이메일 주소를 입력해주세요!"), ctx);
        try {
            instagramApiService.sendTextMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), emailMsg, ctx.getAccessToken());
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), emailMsg, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("이메일 요청 메시지 발송 실패: {}", e.getMessage());
        }

        return NodeExecResult.await(PendingStep.AWAITING_EMAIL);
    }

    private NodeExecResult executeCondition(FlowContext ctx, JsonNode data) {
        String condType = data.path("conditionType").asText(data.path("type").asText(""));
        boolean passed = evaluateCondition(condType, data, ctx.getContact());
        return NodeExecResult.branch(passed ? "pass" : "fail");
    }

    private NodeExecResult executeInventory(FlowContext ctx, JsonNode data) {
        long groupBuyId = data.path("groupBuyId").asLong(0);
        if (groupBuyId == 0) return NodeExecResult.branch("pass");

        try {
            GroupBuy groupBuy = groupBuyRepository.findById(groupBuyId).orElse(null);
            if (groupBuy == null) return NodeExecResult.branch("pass");

            if (!groupBuy.hasStock()) {
                // 매진 메시지 발송
                String soldOutMsg = replaceVariables(
                        data.path("soldOutMessage").asText("죄송합니다, 이 상품은 매진되었습니다. 😢"), ctx);
                try {
                    instagramApiService.sendTextMessage(
                            ctx.getBotIgId(), ctx.getSenderIgId(), soldOutMsg, ctx.getAccessToken());
                    conversationService.saveOutboundMessage(
                            ctx.getIgAccount().getUser(), ctx.getSenderIgId(), soldOutMsg, true, ctx.getFlow().getName());
                } catch (Exception e) {
                    log.error("매진 메시지 발송 실패: {}", e.getMessage());
                }
                return NodeExecResult.branch("fail");
            }

            // 참여자 등록
            Long contactId = ctx.getContact() != null ? ctx.getContact().getId() : null;
            if (contactId != null) {
                try {
                    groupBuyService.addParticipant(groupBuyId, contactId, null, 1);
                } catch (Exception e) {
                    log.info("공동구매 참여 등록 스킵: {}", e.getMessage());
                }
            }
            return NodeExecResult.branch("pass");
        } catch (Exception e) {
            log.error("인벤토리 노드 실행 실패: {}", e.getMessage());
            return NodeExecResult.branch("pass");
        }
    }

    private NodeExecResult executeAbTest(FlowContext ctx, JsonNode data) {
        String testName = data.path("testName").asText("기본 테스트");
        int variantA = data.path("variantA").asInt(50);
        String variant = abTestService.assignVariant(ctx.getFlow().getId(), testName, variantA);
        ctx.getVariables().put("abVariant", variant);
        return NodeExecResult.branch(variant); // "a" or "b"
    }

    private NodeExecResult executeCarousel(FlowContext ctx, JsonNode data) {
        if (!data.path("enabled").asBoolean(false)) return NodeExecResult.ok();
        JsonNode cards = data.get("cards");
        if (cards == null || !cards.isArray() || cards.isEmpty()) return NodeExecResult.ok();

        try {
            List<Map<String, Object>> cardList = new ArrayList<>();
            for (JsonNode card : cards) {
                String title = replaceVariables(card.path("title").asText(""), ctx);
                if (title.isBlank()) continue;
                Map<String, Object> cardMap = new LinkedHashMap<>();
                cardMap.put("title", title);
                cardMap.put("subtitle", replaceVariables(card.path("subtitle").asText(""), ctx));
                cardMap.put("imageUrl", card.path("imageUrl").asText(""));
                cardMap.put("buttonText", replaceVariables(card.path("buttonText").asText(""), ctx));
                cardMap.put("buttonUrl", card.path("buttonUrl").asText(""));
                cardList.add(cardMap);
            }
            if (cardList.isEmpty()) return NodeExecResult.ok();
            instagramApiService.sendCarouselMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), cardList, ctx.getAccessToken());

            String summary = "[캐러셀] " + cardList.get(0).get("title")
                    + (cardList.size() > 1 ? " 외 " + (cardList.size() - 1) + "장" : "");
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), summary, true, ctx.getFlow().getName());
        } catch (Exception e) {
            log.error("캐러셀 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }

    private NodeExecResult executeAiResponse(FlowContext ctx, JsonNode data) {
        if (!data.path("enabled").asBoolean(false)) return NodeExecResult.ok();

        String userMessage = ctx.getTriggerKeyword() != null ? ctx.getTriggerKeyword() : "";
        if (userMessage.isBlank()) return NodeExecResult.ok();

        List<String> history = Collections.emptyList();
        try {
            history = conversationService.getRecentMessages(
                    ctx.getIgAccount().getUser().getId(), ctx.getSenderIgId(),
                    data.path("contextWindow").asInt(3));
        } catch (Exception e) {
            log.debug("대화 기록 조회 실패: {}", e.getMessage());
        }

        String response = aiService.executeAIResponse(
                ctx.getIgAccount().getUser().getId(), userMessage, data, history, ctx.getContact());
        if (response == null || response.isBlank()) {
            response = aiService.getFallbackResponse(data);
        }
        response = replaceVariables(response, ctx);

        try {
            instagramApiService.sendTextMessage(
                    ctx.getBotIgId(), ctx.getSenderIgId(), response, ctx.getAccessToken());
            conversationService.saveOutboundMessage(
                    ctx.getIgAccount().getUser(), ctx.getSenderIgId(), response,
                    true, ctx.getFlow().getName() + " (AI)");
        } catch (Exception e) {
            log.error("AI 응답 발송 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }

    private NodeExecResult executeOptIn(FlowContext ctx, JsonNode data) {
        if (!data.path("enabled").asBoolean(false)) return NodeExecResult.ok();

        String topic = data.path("topic").asText("general");
        String topicLabel = data.path("topicLabel").asText("소식 알림");
        String message = replaceVariables(
                data.path("message").asText("새 소식을 받아보시겠어요?"), ctx);
        String frequency = data.path("frequency").asText("WEEKLY");

        try {
            recurringNotificationService.requestOptIn(
                    ctx.getIgAccount(), ctx.getSenderIgId(), message, topic, topicLabel, frequency);
        } catch (Exception e) {
            log.error("OptIn 요청 실패: {}", e.getMessage());
        }
        return NodeExecResult.ok();
    }

    private NodeExecResult executeKakao(FlowContext ctx, JsonNode data) {
        if (!data.path("enabled").asBoolean(false)) return NodeExecResult.ok();
        Contact contact = ctx.getContact();
        if (contact == null) return NodeExecResult.ok();

        String phone = null;
        if (contact.getCustomFields() != null) {
            try {
                JsonNode fields = objectMapper.readTree(contact.getCustomFields());
                phone = fields.path("phone").asText(null);
            } catch (Exception ignored) {}
        }
        if (phone == null || phone.isBlank()) {
            log.warn("카카오 발송 실패: 전화번호 없음, contactId={}", contact.getId());
            return NodeExecResult.ok();
        }

        Long userId = ctx.getIgAccount().getUser().getId();
        String kakaoType = data.path("kakaoType").asText("alimtalk");
        if ("alimtalk".equals(kakaoType)) {
            String templateCode = data.path("templateCode").asText("");
            Map<String, String> vars = new HashMap<>();
            vars.put("name", contact.getName() != null ? contact.getName() : "고객");
            vars.put("keyword", ctx.getTriggerKeyword() != null ? ctx.getTriggerKeyword() : "");
            kakaoChannelService.sendAlimtalk(userId, templateCode, phone, vars);
        } else {
            String message = replaceVariables(data.path("message").asText(""), ctx);
            String imageUrl = data.path("imageUrl").asText(null);
            kakaoChannelService.sendFriendtalk(userId, phone, message, imageUrl);
        }
        return NodeExecResult.ok();
    }

    private NodeExecResult executeDelay(FlowContext ctx, JsonNode data) {
        String message = data.path("message").asText("");
        int delay = data.path("delay").asInt(30);
        String unit = data.path("unit").asText("minutes");

        // v1 단위 변환
        long delayMinutes = switch (unit) {
            case "시간", "hours" -> (long) delay * 60;
            case "일", "days" -> (long) delay * 60 * 24;
            default -> delay; // 분/minutes
        };

        if (!message.isBlank()) {
            // 팔로업 메시지가 있는 delay 노드 → DB 스케줄링
            ScheduledFollowUp followUp = ScheduledFollowUp.builder()
                    .instagramAccount(ctx.getIgAccount())
                    .recipientIgId(ctx.getSenderIgId())
                    .message(message)
                    .scheduledAt(LocalDateTime.now().plusMinutes(delayMinutes))
                    .status(ScheduledFollowUp.Status.PENDING)
                    .build();
            scheduledFollowUpRepository.save(followUp);
        }

        // delay 노드는 현재 실행을 중단하고 스케줄러에 맡김
        // 후속 노드 실행은 Phase 3에서 ScheduledFollowUp 확장으로 처리
        return NodeExecResult.ok();
    }

    private NodeExecResult executeAction(FlowContext ctx, JsonNode data) {
        // Phase 3에서 구현: addTag, removeTag, setVariable 등
        log.info("액션 노드 실행 (Phase 3 구현 예정): type={}", data.path("actionType").asText(""));
        return NodeExecResult.ok();
    }

    private NodeExecResult executeWebhook(FlowContext ctx, JsonNode data) {
        // Phase 3에서 구현: HTTP 호출
        log.info("웹훅 노드 실행 (Phase 3 구현 예정): url={}", data.path("url").asText(""));
        return NodeExecResult.ok();
    }

    // ────────────────────────────────────────────
    //  유틸리티
    // ────────────────────────────────────────────

    private static final java.util.regex.Pattern VARIABLE_PATTERN = java.util.regex.Pattern.compile(
            "\\{(이름|name|username|키워드|keyword|날짜|date|custom\\.[\\w]+)\\}");
    private static final java.time.format.DateTimeFormatter KOREAN_DATE_FORMAT =
            java.time.format.DateTimeFormatter.ofPattern("M월 d일");

    private String replaceVariables(String template, FlowContext ctx) {
        if (template == null || template.isBlank()) return template;
        Contact contact = ctx.getContact();
        String triggerKeyword = ctx.getTriggerKeyword();

        java.util.regex.Matcher matcher = VARIABLE_PATTERN.matcher(template);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String varName = matcher.group(1);
            String replacement = switch (varName) {
                case "이름", "name" -> contact != null && contact.getName() != null ? contact.getName() : "고객";
                case "username" -> contact != null && contact.getUsername() != null ? "@" + contact.getUsername() : "";
                case "키워드", "keyword" -> triggerKeyword != null ? triggerKeyword : "";
                case "날짜", "date" -> LocalDateTime.now().format(KOREAN_DATE_FORMAT);
                default -> {
                    if (varName.startsWith("custom.") && contact != null) {
                        yield getCustomFieldValue(contact, varName.substring(7));
                    }
                    yield matcher.group(0);
                }
            };
            matcher.appendReplacement(result, java.util.regex.Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private String getCustomFieldValue(Contact contact, String fieldName) {
        if (contact == null) return "";
        String customFields = contact.getCustomFields();
        if (customFields == null || customFields.isBlank()) return "";
        try {
            JsonNode fields = objectMapper.readTree(customFields);
            return fields.path(fieldName).asText("");
        } catch (Exception e) {
            return "";
        }
    }

    private boolean contactHasEmail(Long userId, String senderIgId) {
        return contactRepository.findByUserIdAndIgUserId(userId, senderIgId)
                .map(contact -> {
                    String fields = contact.getCustomFields();
                    return fields != null && fields.contains("\"email\":");
                })
                .orElse(false);
    }

    private boolean evaluateCondition(String condType, JsonNode data, Contact contact) {
        return switch (condType) {
            case "followCheck" -> true; // followCheck는 별도 노드
            case "tagCheck" -> {
                String tagName = data.path("tagName").asText("").trim();
                if (tagName.isEmpty()) yield true;
                yield contact != null && contact.getTags() != null && contact.getTags().contains(tagName);
            }
            case "customField" -> {
                String fieldName = data.path("fieldName").asText("").trim();
                if (fieldName.isEmpty()) yield true;
                String operator = data.path("operator").asText("equals");
                String expected = data.path("fieldValue").asText("");
                String actual = getCustomFieldValue(contact, fieldName);
                yield switch (operator) {
                    case "equals" -> expected.equals(actual);
                    case "not_equals" -> !expected.equals(actual);
                    case "contains" -> actual != null && actual.contains(expected);
                    case "gt" -> compareNumeric(actual, expected) > 0;
                    case "gte" -> compareNumeric(actual, expected) >= 0;
                    case "lt" -> compareNumeric(actual, expected) < 0;
                    case "lte" -> compareNumeric(actual, expected) <= 0;
                    case "exists" -> actual != null && !actual.isEmpty();
                    default -> true;
                };
            }
            case "emailCheck" -> true; // emailCollection은 별도 노드
            case "timeRange" -> {
                int startHour = data.path("startHour").asInt(9);
                int endHour = data.path("endHour").asInt(18);
                java.time.ZonedDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
                int currentHour = now.getHour();
                int currentDow = now.getDayOfWeek().getValue() - 1;
                JsonNode activeDays = data.get("activeDays");
                if (activeDays != null && activeDays.isArray() && !activeDays.isEmpty()) {
                    boolean dayMatch = false;
                    for (JsonNode d : activeDays) {
                        if (d.asInt(-1) == currentDow) { dayMatch = true; break; }
                    }
                    if (!dayMatch) yield false;
                }
                if (startHour == endHour) yield true;
                else if (startHour < endHour) yield currentHour >= startHour && currentHour < endHour;
                else yield currentHour >= startHour || currentHour < endHour;
            }
            case "random" -> {
                int probability = data.path("probability").asInt(50);
                yield java.util.concurrent.ThreadLocalRandom.current().nextInt(100) < probability;
            }
            default -> true;
        };
    }

    private int compareNumeric(String actual, String expected) {
        try {
            double a = actual != null ? Double.parseDouble(actual) : 0;
            double e = Double.parseDouble(expected);
            return Double.compare(a, e);
        } catch (NumberFormatException e) {
            return (actual != null ? actual : "").compareTo(expected);
        }
    }
}
