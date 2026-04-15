package com.instabot.backend.repository;

import com.instabot.backend.entity.RecurringSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecurringSubscriptionRepository extends JpaRepository<RecurringSubscription, Long> {

    List<RecurringSubscription> findByUserIdAndTopicAndStatus(
            Long userId, String topic, RecurringSubscription.SubscriptionStatus status);

    Optional<RecurringSubscription> findByUserIdAndContactIdAndTopic(Long userId, Long contactId, String topic);

    List<RecurringSubscription> findByUserIdOrderBySubscribedAtDesc(Long userId);

    List<RecurringSubscription> findByUserIdAndStatus(Long userId, RecurringSubscription.SubscriptionStatus status);

    long countByUserIdAndTopicAndStatus(Long userId, String topic, RecurringSubscription.SubscriptionStatus status);

    @Query("SELECT DISTINCT rs.topic, rs.topicLabel, COUNT(rs) FROM RecurringSubscription rs " +
            "WHERE rs.user.id = :userId AND rs.status = 'ACTIVE' " +
            "GROUP BY rs.topic, rs.topicLabel ORDER BY COUNT(rs) DESC")
    List<Object[]> getTopicSummary(@Param("userId") Long userId);

    @Query("SELECT COUNT(DISTINCT rs.topic) FROM RecurringSubscription rs " +
            "WHERE rs.user.id = :userId AND rs.status = 'ACTIVE'")
    long countActiveTopics(@Param("userId") Long userId);
}
