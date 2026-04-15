package com.instabot.backend.repository;

import com.instabot.backend.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByUserIdOrderByLastMessageAtDesc(Long userId);
    List<Conversation> findByUserIdAndStatus(Long userId, Conversation.ConversationStatus status);
    long countByUserIdAndStatus(Long userId, Conversation.ConversationStatus status);
    Optional<Conversation> findByUserIdAndContactId(Long userId, Long contactId);
}
