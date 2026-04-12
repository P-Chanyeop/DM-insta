package com.instabot.backend.repository;

import com.instabot.backend.entity.Sequence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SequenceRepository extends JpaRepository<Sequence, Long> {
    List<Sequence> findByUserIdOrderByCreatedAtDesc(Long userId);
}
