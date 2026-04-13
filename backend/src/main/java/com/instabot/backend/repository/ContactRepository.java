package com.instabot.backend.repository;

import com.instabot.backend.entity.Contact;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface ContactRepository extends JpaRepository<Contact, Long> {
    Page<Contact> findByUserId(Long userId, Pageable pageable);
    Page<Contact> findByUserIdAndActiveTrue(Long userId, Pageable pageable);
    Optional<Contact> findByUserIdAndIgUserId(Long userId, String igUserId);
    long countByUserId(Long userId);
    long countByUserIdAndActiveTrue(Long userId);

    @Query("SELECT COUNT(c) FROM Contact c WHERE c.user.id = :userId AND 'VIP' MEMBER OF c.tags")
    long countVipByUserId(Long userId);

    long countByUserIdAndSubscribedAtAfter(Long userId, java.time.LocalDateTime since);

    @Query("SELECT CAST(c.subscribedAt AS LocalDate) AS date, COUNT(c) AS cnt " +
           "FROM Contact c " +
           "WHERE c.user.id = :userId AND c.subscribedAt >= :since " +
           "GROUP BY CAST(c.subscribedAt AS LocalDate) " +
           "ORDER BY CAST(c.subscribedAt AS LocalDate)")
    java.util.List<Object[]> countDailyNewByUserId(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since);
}
