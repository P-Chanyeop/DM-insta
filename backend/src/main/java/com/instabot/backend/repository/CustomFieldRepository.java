package com.instabot.backend.repository;

import com.instabot.backend.entity.CustomField;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomFieldRepository extends JpaRepository<CustomField, Long> {
    List<CustomField> findByUserIdOrderByNameAsc(Long userId);
}
