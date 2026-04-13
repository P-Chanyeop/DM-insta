package com.instabot.backend.repository;

import com.instabot.backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversationIdOrderBySentAtAsc(Long conversationId);
    long countByConversationId(Long conversationId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.user.id = :userId AND m.direction = 'OUTBOUND'")
    long countOutboundByUserId(@Param("userId") Long userId);

    @Query("SELECT CAST(m.sentAt AS LocalDate) AS date, COUNT(m) AS cnt " +
           "FROM Message m " +
           "WHERE m.conversation.user.id = :userId AND m.direction = 'OUTBOUND' AND m.sentAt >= :since " +
           "GROUP BY CAST(m.sentAt AS LocalDate) " +
           "ORDER BY CAST(m.sentAt AS LocalDate)")
    List<Object[]> countDailyOutboundByUserId(@Param("userId") Long userId, @Param("since") java.time.LocalDateTime since);
}
