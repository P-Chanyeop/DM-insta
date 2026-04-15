package com.instabot.backend.service;

import com.instabot.backend.entity.ABTest;
import com.instabot.backend.repository.ABTestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class ABTestService {

    private final ABTestRepository abTestRepository;

    /**
     * A/B 테스트 분기 결정 + 카운트 증가
     * @return "A" 또는 "B"
     */
    @Transactional
    public String assignVariant(Long flowId, String testName, int variantAPercent) {
        ABTest test = abTestRepository.findByFlowIdAndTestName(flowId, testName)
                .orElseGet(() -> abTestRepository.save(ABTest.builder()
                        .flowId(flowId)
                        .testName(testName)
                        .variantAPercent(variantAPercent)
                        .build()));

        int roll = ThreadLocalRandom.current().nextInt(100);
        String variant;
        if (roll < test.getVariantAPercent()) {
            variant = "A";
            test.setVariantACount(test.getVariantACount() + 1);
        } else {
            variant = "B";
            test.setVariantBCount(test.getVariantBCount() + 1);
        }
        abTestRepository.save(test);

        log.debug("A/B 테스트 분기: flow={}, test={}, variant={}", flowId, testName, variant);
        return variant;
    }

    /**
     * variant 완료 카운트 증가 (DM 발송 완료 시)
     */
    @Transactional
    public void markCompleted(Long flowId, String testName, String variant) {
        abTestRepository.findByFlowIdAndTestName(flowId, testName).ifPresent(test -> {
            if ("A".equals(variant)) {
                test.setVariantACompleted(test.getVariantACompleted() + 1);
            } else {
                test.setVariantBCompleted(test.getVariantBCompleted() + 1);
            }
            abTestRepository.save(test);
        });
    }

    public List<ABTest> getTestsByFlow(Long flowId) {
        return abTestRepository.findByFlowIdOrderByCreatedAtDesc(flowId);
    }

    public List<ABTest> getRunningTests(Long flowId) {
        return abTestRepository.findByFlowIdAndStatus(flowId, ABTest.TestStatus.RUNNING);
    }

    @Transactional
    public ABTest endTest(Long testId) {
        ABTest test = abTestRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("테스트를 찾을 수 없습니다"));
        test.setStatus(ABTest.TestStatus.COMPLETED);
        test.setEndedAt(LocalDateTime.now());
        return abTestRepository.save(test);
    }

    @Transactional
    public void resetTest(Long testId) {
        ABTest test = abTestRepository.findById(testId)
                .orElseThrow(() -> new RuntimeException("테스트를 찾을 수 없습니다"));
        test.setVariantACount(0);
        test.setVariantBCount(0);
        test.setVariantACompleted(0);
        test.setVariantBCompleted(0);
        test.setStatus(ABTest.TestStatus.RUNNING);
        test.setEndedAt(null);
        abTestRepository.save(test);
    }

    public void deleteTest(Long testId) {
        abTestRepository.deleteById(testId);
    }
}
