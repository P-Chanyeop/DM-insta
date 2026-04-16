package com.instabot.backend.repository;

import com.instabot.backend.entity.Automation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AutomationRepository extends JpaRepository<Automation, Long> {
    List<Automation> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Automation> findByUserIdAndType(Long userId, Automation.AutomationType type);
    long countByUserId(Long userId);
    List<Automation> findByUserIdAndActiveTrue(Long userId);

    // upsert 용 — 키워드 기반 타입(DM_KEYWORD, COMMENT_TRIGGER)은 (user, type, keyword)로 유일 식별
    Optional<Automation> findFirstByUserIdAndTypeAndKeyword(Long userId, Automation.AutomationType type, String keyword);

    // upsert 용 — 싱글톤 타입(WELCOME_MESSAGE, STORY_MENTION, STORY_REPLY, ICEBREAKER)은 (user, type)로 유일 식별
    Optional<Automation> findFirstByUserIdAndType(Long userId, Automation.AutomationType type);

    // upsert 용 — 키워드 없는 경우 name으로 매칭 (온보딩 성장 도구 COMMENT_TRIGGER 시나리오)
    Optional<Automation> findFirstByUserIdAndTypeAndName(Long userId, Automation.AutomationType type, String name);
}
