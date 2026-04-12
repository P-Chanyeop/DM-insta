package com.instabot.backend.repository;

import com.instabot.backend.entity.InstagramAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InstagramAccountRepository extends JpaRepository<InstagramAccount, Long> {
    List<InstagramAccount> findByUserId(Long userId);
    Optional<InstagramAccount> findByIgUserId(String igUserId);
}
