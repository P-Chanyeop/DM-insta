package com.instabot.backend.repository;

import com.instabot.backend.entity.GroupBuy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupBuyRepository extends JpaRepository<GroupBuy, Long> {
    List<GroupBuy> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<GroupBuy> findByUserIdAndStatus(Long userId, GroupBuy.GroupBuyStatus status);
    long countByUserId(Long userId);
}
