package com.instabot.backend.repository;

import com.instabot.backend.entity.Integration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IntegrationRepository extends JpaRepository<Integration, Long> {
    List<Integration> findByUserIdOrderByCreatedAtDesc(Long userId);
}
