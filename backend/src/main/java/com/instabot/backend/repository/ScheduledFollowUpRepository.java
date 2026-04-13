package com.instabot.backend.repository;

import com.instabot.backend.entity.ScheduledFollowUp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduledFollowUpRepository extends JpaRepository<ScheduledFollowUp, Long> {

    /**
     * 발송 시간이 된 PENDING 상태의 팔로업 메시지 조회
     */
    List<ScheduledFollowUp> findByStatusAndScheduledAtBefore(
            ScheduledFollowUp.Status status, LocalDateTime now);
}
