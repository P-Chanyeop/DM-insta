package com.instabot.backend.repository;

import com.instabot.backend.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TemplateRepository extends JpaRepository<Template, Long> {
    List<Template> findByIsPublicTrueOrderByUsageCountDesc();
    List<Template> findByCategoryAndIsPublicTrueOrderByUsageCountDesc(String category);
}
