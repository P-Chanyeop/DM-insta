package com.instabot.backend.repository;

import com.instabot.backend.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversationIdOrderBySentAtAsc(Long conversationId);
    long countByConversationId(Long conversationId);

    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId ORDER BY m.sentAt DESC")
    List<Message> findRecentByConversationId(@Param("conversationId") Long conversationId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.user.id = :userId AND m.direction = 'OUTBOUND'")
    long countOutboundByUserId(@Param("userId") Long userId);

    @Query("SELECT CAST(m.sentAt AS LocalDate) AS date, COUNT(m) AS cnt " +
           "FROM Message m " +
           "WHERE m.conversation.user.id = :userId AND m.direction = 'OUTBOUND' AND m.sentAt >= :since " +
           "GROUP BY CAST(m.sentAt AS LocalDate) " +
           "ORDER BY CAST(m.sentAt AS LocalDate)")
    List<Object[]> countDailyOutboundByUserId(@Param("userId") Long userId, @Param("since") java.time.LocalDateTime since);

    @Query("SELECT EXTRACT(HOUR FROM m.sentAt) AS hr, COUNT(m) AS cnt " +
           "FROM Message m " +
           "WHERE m.conversation.user.id = :userId AND m.direction = 'OUTBOUND' AND m.sentAt >= :since " +
           "GROUP BY EXTRACT(HOUR FROM m.sentAt) " +
           "ORDER BY EXTRACT(HOUR FROM m.sentAt)")
    List<Object[]> countHourlyOutboundByUserId(@Param("userId") Long userId, @Param("since") java.time.LocalDateTime since);

    // 기간 내 발송 수
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.user.id = :userId AND m.direction = 'OUTBOUND' AND m.sentAt >= :since")
    long countOutboundByUserIdAndSince(@Param("userId") Long userId, @Param("since") java.time.LocalDateTime since);

    // 일별 읽음(열림) 수
    @Query("SELECT CAST(m.sentAt AS LocalDate) AS date, COUNT(m) AS cnt " +
           "FROM Message m " +
           "WHERE m.conversation.user.id = :userId AND m.direction = 'OUTBOUND' AND m.read = true AND m.sentAt >= :since " +
           "GROUP BY CAST(m.sentAt AS LocalDate) " +
           "ORDER BY CAST(m.sentAt AS LocalDate)")
    List<Object[]> countDailyReadOutboundByUserId(@Param("userId") Long userId, @Param("since") java.time.LocalDateTime since);

    // 기간 내 읽음 수
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.user.id = :userId AND m.direction = 'OUTBOUND' AND m.read = true AND m.sentAt >= :since")
    long countReadOutboundByUserIdAndSince(@Param("userId") Long userId, @Param("since") java.time.LocalDateTime since);
}
