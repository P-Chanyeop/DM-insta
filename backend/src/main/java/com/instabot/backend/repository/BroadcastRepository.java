package com.instabot.backend.repository;

import com.instabot.backend.entity.Broadcast;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BroadcastRepository extends JpaRepository<Broadcast, Long> {
    List<Broadcast> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Broadcast> findByUserIdAndStatus(Long userId, Broadcast.BroadcastStatus status);
}
