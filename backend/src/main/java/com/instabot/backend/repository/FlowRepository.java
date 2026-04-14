package com.instabot.backend.repository;

import com.instabot.backend.entity.Flow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FlowRepository extends JpaRepository<Flow, Long> {
    List<Flow> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Flow> findByUserIdAndActiveTrue(Long userId);
    long countByUserId(Long userId);
    long countByUserIdAndActiveTrue(Long userId);
}
