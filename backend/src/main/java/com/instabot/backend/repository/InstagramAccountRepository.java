package com.instabot.backend.repository;

import com.instabot.backend.entity.InstagramAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InstagramAccountRepository extends JpaRepository<InstagramAccount, Long> {
    List<InstagramAccount> findByUserId(Long userId);
    List<InstagramAccount> findByUserIdOrderByActiveDescConnectedAtDesc(Long userId);
    Optional<InstagramAccount> findByIgUserId(String igUserId);
    Optional<InstagramAccount> findByIdAndUserId(Long id, Long userId);
    Optional<InstagramAccount> findByUserIdAndActiveTrue(Long userId);
    long countByUserId(Long userId);
    long countByUserIdAndConnectedTrue(Long userId);
}
