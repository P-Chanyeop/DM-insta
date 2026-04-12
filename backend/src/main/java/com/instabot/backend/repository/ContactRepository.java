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
}
