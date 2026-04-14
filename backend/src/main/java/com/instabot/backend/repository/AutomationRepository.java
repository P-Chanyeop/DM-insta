package com.instabot.backend.repository;

import com.instabot.backend.entity.Automation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AutomationRepository extends JpaRepository<Automation, Long> {
    List<Automation> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Automation> findByUserIdAndType(Long userId, Automation.AutomationType type);
    long countByUserId(Long userId);
    List<Automation> findByUserIdAndActiveTrue(Long userId);
}
