package com.instabot.backend.repository;

import com.instabot.backend.entity.ABTest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ABTestRepository extends JpaRepository<ABTest, Long> {
    List<ABTest> findByFlowIdOrderByCreatedAtDesc(Long flowId);
    Optional<ABTest> findByFlowIdAndTestName(Long flowId, String testName);
    List<ABTest> findByFlowIdAndStatus(Long flowId, ABTest.TestStatus status);
}
