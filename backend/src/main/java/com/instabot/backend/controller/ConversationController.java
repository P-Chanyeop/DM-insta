package com.instabot.backend.controller;

import com.instabot.backend.config.SecurityUtils;
import com.instabot.backend.dto.ConversationDto;
import com.instabot.backend.entity.*;
import com.instabot.backend.exception.ResourceNotFoundException;
import com.instabot.backend.repository.ConversationRepository;
import com.instabot.backend.repository.MessageRepository;
import com.instabot.backend.repository.UserRepository;
import com.instabot.backend.service.ConversationService;
import com.instabot.backend.service.InstagramApiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ConversationService conversationService;
    private final InstagramApiService instagramApiService;

    /**
     * 대화 목록 조회 (선택적 status 필터)
     * B2 fix 패턴: toResponse에서 Conversation.contact(Lazy ManyToOne) 접근 →
     * 트랜잭션 밖이면 LazyInitException. readOnly 트랜잭션 안에서 DTO 변환 완료.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<ConversationDto.Response>> getConversations(
            @RequestParam(required = false) Conversation.ConversationStatus status) {
        Long userId = SecurityUtils.currentUserId();

        List<Conversation> conversations = (status != null)
                ? conversationRepository.findByUserIdAndStatus(userId, status)
                : conversationRepository.findByUserIdOrderByLastMessageAtDesc(userId);

        List<ConversationDto.Response> responses = conversations.stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    /**
     * 단일 대화 조회 (Contact 정보 포함)
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ConversationDto.Response> getConversation(@PathVariable Long id) {
        Conversation conversation = findConversationForCurrentUser(id);
        return ResponseEntity.ok(toResponse(conversation));
    }

    /**
     * 대화의 메시지 목록 조회
     */
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<ConversationDto.MessageResponse>> getMessages(@PathVariable Long id) {
        // 권한 확인: 해당 대화가 현재 사용자의 것인지 검증
        findConversationForCurrentUser(id);

        List<ConversationDto.MessageResponse> messages = messageRepository
                .findByConversationIdOrderBySentAtAsc(id).stream()
                .map(this::toMessageResponse)
                .toList();

        return ResponseEntity.ok(messages);
    }

    /**
     * 수동 메시지 발송 (Instagram API 호출 + DB 저장)
     * 지원 타입: TEXT, IMAGE, CARD
     */
    @PostMapping("/{id}/messages")
    public ResponseEntity<ConversationDto.MessageResponse> sendMessage(
            @PathVariable Long id,
            @Valid @RequestBody ConversationDto.SendMessageRequest request) {
        Long userId = SecurityUtils.currentUserId();
        Conversation conversation = findConversationForCurrentUser(id);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        InstagramAccount igAccount = instagramApiService.getConnectedAccount(userId);
        if (igAccount == null) {
            throw new ResourceNotFoundException("연결된 Instagram 계정이 없습니다.");
        }

        String accessToken = instagramApiService.getDecryptedToken(igAccount);
        String recipientIgId = conversation.getContact().getIgUserId();
        String igUserId = igAccount.getIgUserId();

        Message.MessageType msgType = request.getResolvedType();

        switch (msgType) {
            case IMAGE -> {
                if (request.getMediaUrl() == null || request.getMediaUrl().isBlank()) {
                    throw new IllegalArgumentException("이미지 URL이 필요합니다.");
                }
                instagramApiService.sendImageMessage(igUserId, recipientIgId, request.getMediaUrl(), accessToken);
            }
            case CARD -> {
                String title = request.getCardTitle();
                if (title == null || title.isBlank()) title = "카드";
                instagramApiService.sendGenericTemplate(
                        igUserId, recipientIgId, title,
                        request.getCardSubtitle(),
                        request.getCardButtonText() != null && request.getCardButtonUrl() != null
                                ? List.of(Map.of("title", request.getCardButtonText(), "url", request.getCardButtonUrl()))
                                : List.of(),
                        accessToken);
            }
            default -> {
                if (request.getContent() == null || request.getContent().isBlank()) {
                    throw new IllegalArgumentException("메시지 내용이 필요합니다.");
                }
                instagramApiService.sendTextMessage(igUserId, recipientIgId, request.getContent(), accessToken);
            }
        }

        // DB 저장
        Message message = conversationService.saveOutboundMessage(
                user, recipientIgId,
                msgType == Message.MessageType.IMAGE ? request.getMediaUrl()
                        : msgType == Message.MessageType.CARD ? request.getCardTitle()
                        : request.getContent(),
                false, null, msgType,
                msgType == Message.MessageType.IMAGE ? request.getMediaUrl() : null);

        return ResponseEntity.ok(toMessageResponse(message));
    }

    /**
     * 대화 업데이트 (상태, 담당자, 자동화 일시정지)
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ConversationDto.Response> updateConversation(
            @PathVariable Long id,
            @Valid @RequestBody ConversationDto.UpdateRequest request) {
        Conversation conversation = findConversationForCurrentUser(id);

        if (request.getStatus() != null) {
            conversation.setStatus(request.getStatus());
        }
        if (request.getAssignedTo() != null) {
            conversation.setAssignedTo(request.getAssignedTo());
        }
        if (request.getAutomationPaused() != null) {
            conversation.setAutomationPaused(request.getAutomationPaused());
        }

        conversationRepository.save(conversation);
        return ResponseEntity.ok(toResponse(conversation));
    }

    // ─── 내부 유틸 ───

    private Conversation findConversationForCurrentUser(Long conversationId) {
        Long userId = SecurityUtils.currentUserId();
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("대화를 찾을 수 없습니다: " + conversationId));

        if (!conversation.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("대화를 찾을 수 없습니다: " + conversationId);
        }

        return conversation;
    }

    private ConversationDto.Response toResponse(Conversation conversation) {
        Contact contact = conversation.getContact();
        return ConversationDto.Response.builder()
                .id(conversation.getId())
                .status(conversation.getStatus())
                .lastMessage(conversation.getLastMessage())
                .automationPaused(conversation.isAutomationPaused())
                .assignedTo(conversation.getAssignedTo())
                .lastMessageAt(conversation.getLastMessageAt())
                .createdAt(conversation.getCreatedAt())
                .contactId(contact.getId())
                .contactName(contact.getName())
                .contactUsername(contact.getUsername())
                .contactProfilePictureUrl(contact.getProfilePictureUrl())
                .build();
    }

    private ConversationDto.MessageResponse toMessageResponse(Message message) {
        return ConversationDto.MessageResponse.builder()
                .id(message.getId())
                .direction(message.getDirection())
                .type(message.getType())
                .content(message.getContent())
                .mediaUrl(message.getMediaUrl())
                .automated(message.isAutomated())
                .automationName(message.getAutomationName())
                .read(message.isRead())
                .sentAt(message.getSentAt())
                .build();
    }
}
