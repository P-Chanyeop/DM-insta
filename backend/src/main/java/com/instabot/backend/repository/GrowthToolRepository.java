package com.instabot.backend.repository;

import com.instabot.backend.entity.GrowthTool;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GrowthToolRepository extends JpaRepository<GrowthTool, Long> {
    List<GrowthTool> findByUserIdOrderByCreatedAtDesc(Long userId);
}
