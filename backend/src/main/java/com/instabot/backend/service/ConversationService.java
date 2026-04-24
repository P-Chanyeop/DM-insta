package com.instabot.backend.service;

import com.instabot.backend.entity.*;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 대화 관리 서비스
 * - Webhook 메시지 수신 시 Conversation 자동 생성/업데이트
 * - Message 저장
 * - WebSocket 실시간 푸시
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ContactRepository contactRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 수신 메시지 처리: Contact 조회/생성 → Conversation 조회/생성 → Message 저장 → WebSocket 푸시
     */
    @Transactional
    public Message handleInboundMessage(User user, String senderIgId, String senderUsername,
                                         String content, Message.MessageType type) {
        LocalDateTime nowTs = LocalDateTime.now();

        // 1. Contact 조회 또는 생성 — 첫 생성 시 firstMessageAt 고정 기록 (이후 갱신 안 함)
        Contact contact = contactRepository.findByUserIdAndIgUserId(user.getId(), senderIgId)
                .orElseGet(() -> contactRepository.save(Contact.builder()
                        .user(user)
                        .igUserId(senderIgId)
                        .username(senderUsername != null ? senderUsername : senderIgId)
                        .name(senderUsername)
                        .firstMessageAt(nowTs)
                        .build()));

        // 기존 레코드에 firstMessageAt 이 null 인 케이스 (V22 이전 생성) 도 최초 수신 시 채워줌
        if (contact.getFirstMessageAt() == null) {
            contact.setFirstMessageAt(nowTs);
        }
        contact.setLastActiveAt(nowTs);
        contact.setMessageCount(contact.getMessageCount() + 1);
        contactRepository.save(contact);

        // 2. Conversation 조회 또는 생성 — inbound 경로에서만 lastInboundAt 갱신 (24h 창 기준점)
        Conversation conversation = getOrCreateConversation(user, contact);
        conversation.setLastMessage(content != null && content.length() > 200
                ? content.substring(0, 200) : content);
        conversation.setLastMessageAt(nowTs);
        conversation.setLastInboundAt(nowTs);
        conversation.setStatus(Conversation.ConversationStatus.OPEN);
        conversationRepository.save(conversation);

        // 3. Message 저장
        Message message = messageRepository.save(Message.builder()
                .conversation(conversation)
                .direction(Message.Direction.INBOUND)
                .type(type)
                .content(content)
                .build());

        // 4. WebSocket 실시간 푸시
        pushToWebSocket(user.getId(), conversation, message);

        return message;
    }

    /**
     * 발신 메시지 저장 (봇이 보낸 자동 메시지)
     */
    @Transactional
    public Message saveOutboundMessage(User user, String recipientIgId, String content,
                                        boolean automated, String automationName) {
        return saveOutboundMessage(user, recipientIgId, content, automated, automationName,
                Message.MessageType.TEXT, null);
    }

    @Transactional
    public Message saveOutboundMessage(User user, String recipientIgId, String content,
                                        boolean automated, String automationName,
                                        Message.MessageType type, String mediaUrl) {
        return saveOutboundMessage(user, recipientIgId, content, automated, automationName, type, mediaUrl, null, null, null);
    }

    /**
     * 발신 메시지 저장 (확장 — igMessageId, flowId, broadcastId 포함)
     */
    @Transactional
    public Message saveOutboundMessage(User user, String recipientIgId, String content,
                                        boolean automated, String automationName,
                                        Message.MessageType type, String mediaUrl,
                                        String igMessageId, Long flowId, Long broadcastId) {
        // 댓글 트리거 시나리오: bot 이 사용자에게 먼저 DM 을 보내는 순간 Contact 가 아직 없을 수 있음.
        // 없으면 즉시 최소 정보로 생성해서 라이브 채팅에도 정상 노출되게 한다.
        Contact contact = contactRepository.findByUserIdAndIgUserId(user.getId(), recipientIgId)
                .orElseGet(() -> contactRepository.save(Contact.builder()
                        .user(user)
                        .igUserId(recipientIgId)
                        .username(recipientIgId)
                        .build()));

        Conversation conversation = getOrCreateConversation(user, contact);
        String preview = type == Message.MessageType.IMAGE ? "[이미지]"
                : type == Message.MessageType.CARD ? "[카드] " + (content != null ? content : "")
                : content;
        conversation.setLastMessage(preview != null && preview.length() > 200
                ? preview.substring(0, 200) : preview);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        Message message = messageRepository.save(Message.builder()
                .conversation(conversation)
                .direction(Message.Direction.OUTBOUND)
                .type(type)
                .content(content)
                .mediaUrl(mediaUrl)
                .automated(automated)
                .automationName(automationName)
                .igMessageId(igMessageId)
                .flowId(flowId)
                .broadcastId(broadcastId)
                .build());

        pushToWebSocket(user.getId(), conversation, message);

        return message;
    }

    /**
     * AI 컨텍스트용 최근 대화 메시지 조회 (역할 정보 포함)
     * @param userId 사용자 ID
     * @param senderIgId 상대방 Instagram ID
     * @param limit 조회할 메시지 수
     * @return 시간순 정렬된 "role:content" 형식 리스트 (role = user 또는 assistant)
     */
    @Transactional(readOnly = true)
    public List<String> getRecentMessages(Long userId, String senderIgId, int limit) {
        Contact contact = contactRepository.findByUserIdAndIgUserId(userId, senderIgId)
                .orElse(null);
        if (contact == null) return List.of();

        // 해당 Contact의 Conversation 조회
        Conversation conversation = conversationRepository.findByUserIdAndContactId(userId, contact.getId())
                .orElse(null);
        if (conversation == null) return List.of();

        // 최근 메시지를 역순으로 가져온 뒤 시간순으로 정렬
        List<Message> messages = messageRepository.findRecentByConversationId(
                conversation.getId(), PageRequest.of(0, limit));

        List<String> result = new ArrayList<>();
        for (int i = messages.size() - 1; i >= 0; i--) {
            Message msg = messages.get(i);
            String content = msg.getContent();
            if (content != null && !content.isBlank()) {
                // "user:" or "assistant:" prefix로 역할 정보 전달
                String role = msg.getDirection() == Message.Direction.INBOUND ? "user" : "assistant";
                result.add(role + ":" + content);
            }
        }
        return result;
    }

    private Conversation getOrCreateConversation(User user, Contact contact) {
        return conversationRepository.findByUserIdOrderByLastMessageAtDesc(user.getId()).stream()
                .filter(c -> c.getContact().getId().equals(contact.getId()))
                .findFirst()
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .user(user)
                        .contact(contact)
                        .build()));
    }

    private void pushToWebSocket(Long userId, Conversation conversation, Message message) {
        try {
            // 새 메시지 알림
            messagingTemplate.convertAndSend(
                    "/topic/conversations/" + userId,
                    Map.of(
                            "type", "NEW_MESSAGE",
                            "conversationId", conversation.getId(),
                            "lastMessage", conversation.getLastMessage() != null ? conversation.getLastMessage() : "",
                            "direction", message.getDirection().name(),
                            "timestamp", message.getSentAt().toString()
                    )
            );

            // 개별 대화 메시지 스트림
            messagingTemplate.convertAndSend(
                    "/topic/messages/" + conversation.getId(),
                    Map.of(
                            "id", message.getId(),
                            "direction", message.getDirection().name(),
                            "type", message.getType().name(),
                            "content", message.getContent() != null ? message.getContent() : "",
                            "automated", message.isAutomated(),
                            "sentAt", message.getSentAt().toString()
                    )
            );
        } catch (Exception e) {
            log.warn("WebSocket 푸시 실패: {}", e.getMessage());
        }
    }
}
