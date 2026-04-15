package com.instabot.backend.repository;

import com.instabot.backend.entity.Integration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface IntegrationRepository extends JpaRepository<Integration, Long> {
    List<Integration> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Integration> findByUserIdAndType(Long userId, Integration.IntegrationType type);
}
