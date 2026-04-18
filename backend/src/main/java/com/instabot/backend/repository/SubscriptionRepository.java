package com.instabot.backend.repository;

import com.instabot.backend.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findByUserId(Long userId);
    Optional<Subscription> findByPaddleSubscriptionId(String paddleSubscriptionId);
    Optional<Subscription> findByPaddleCustomerId(String paddleCustomerId);
}
