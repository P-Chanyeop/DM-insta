package com.instabot.backend.service;

import com.instabot.backend.entity.*;
import com.instabot.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
        // 1. Contact 조회 또는 생성
        Contact contact = contactRepository.findByUserIdAndIgUserId(user.getId(), senderIgId)
                .orElseGet(() -> contactRepository.save(Contact.builder()
                        .user(user)
                        .igUserId(senderIgId)
                        .username(senderUsername != null ? senderUsername : senderIgId)
                        .name(senderUsername)
                        .build()));

        contact.setLastActiveAt(LocalDateTime.now());
        contact.setMessageCount(contact.getMessageCount() + 1);
        contactRepository.save(contact);

        // 2. Conversation 조회 또는 생성
        Conversation conversation = getOrCreateConversation(user, contact);
        conversation.setLastMessage(content != null && content.length() > 200
                ? content.substring(0, 200) : content);
        conversation.setLastMessageAt(LocalDateTime.now());
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
        Contact contact = contactRepository.findByUserIdAndIgUserId(user.getId(), recipientIgId)
                .orElse(null);
        if (contact == null) return null;

        Conversation conversation = getOrCreateConversation(user, contact);
        conversation.setLastMessage(content != null && content.length() > 200
                ? content.substring(0, 200) : content);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        Message message = messageRepository.save(Message.builder()
                .conversation(conversation)
                .direction(Message.Direction.OUTBOUND)
                .type(Message.MessageType.TEXT)
                .content(content)
                .automated(automated)
                .automationName(automationName)
                .build());

        pushToWebSocket(user.getId(), conversation, message);

        return message;
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
