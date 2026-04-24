package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.repository.FlowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 같은 유저의 활성 Flow 들 사이의 충돌(trigger signature 겹침)을 정적 분석으로 감지.
 *
 * 검사 타이밍:
 *  1) Flow 저장 시 — 경고 배너용 (조용히)
 *  2) Flow 활성화 전환 시 — HARD_BLOCK 은 거부, WARN 은 확인 모달
 *  3) 목록 페이지 — 충돌 있는 Flow 에 ⚠️ 뱃지
 *
 * 분류:
 *  - HARD_BLOCK : 싱글톤 트리거(WELCOME / STORY_MENTION / ICEBREAKER) 가 2개 이상 활성.
 *                 실행 순서 보장 불가 + Meta 정책상 애매하므로 원천 차단.
 *  - WARN       : 그 외 모든 "같이 매칭될 가능성이 있는" 조합 — shadowing 경고만 하고 저장/활성화는 허용.
 *                 현재 webhook dispatch 는 "첫 매칭만 실행" 이므로 이중 발사는 일어나지 않지만,
 *                 유저가 의도한 플로우가 다른 플로우에 가려져 실행 안 될 수 있음을 알려줌.
 *  - PASS       : 안전. 충돌 없음.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowConflictService {

    private final FlowRepository flowRepository;
    private final FlowTriggerMatcher flowTriggerMatcher;

    /**
     * 특정 Flow(이미 저장된 것)에 대한 충돌 목록을 반환.
     * 자기 자신은 제외하고, 같은 유저의 다른 활성 Flow 와 비교.
     */
    public List<FlowDto.Conflict> detectConflictsFor(Flow target, Long userId) {
        List<Flow> peers = flowRepository
                .findByUserIdAndActiveTrueOrderByTriggerTypeAscPriorityAscCreatedAtAsc(userId)
                .stream()
                .filter(f -> !Objects.equals(f.getId(), target.getId()))
                .toList();

        return detectAgainst(target, peers);
    }

    /**
     * 아직 저장 전 Flow(혹은 변경 후 Flow)에 대한 충돌 검사.
     * 예: 활성화 전환 직전의 상태로 가상 매칭 시나리오 확인.
     */
    public List<FlowDto.Conflict> detectAgainst(Flow target, List<Flow> peers) {
        List<FlowDto.Conflict> result = new ArrayList<>();

        // 1. 싱글톤 트리거 HARD_BLOCK — 같은 타입의 활성 Flow 가 이미 있으면 차단
        if (isSingletonTrigger(target.getTriggerType())) {
            List<Flow> sameTypeActives = peers.stream()
                    .filter(p -> p.getTriggerType() == target.getTriggerType())
                    .toList();
            if (!sameTypeActives.isEmpty()) {
                result.add(FlowDto.Conflict.builder()
                        .severity("HARD_BLOCK")
                        .reason("이미 활성화된 [" + triggerLabel(target.getTriggerType())
                                + "] 플로우가 있습니다. 이 트리거는 하나만 활성화할 수 있습니다.")
                        .conflictingFlowIds(sameTypeActives.stream().map(Flow::getId).toList())
                        .conflictingFlowNames(sameTypeActives.stream().map(Flow::getName).toList())
                        .build());
            }
            return result; // 싱글톤은 다른 비교 필요 없음
        }

        // 2. 멀티 트리거 (KEYWORD / COMMENT / STORY_REPLY) — 같은 타입 내 shadowing 검사
        TriggerSignature targetSig = extractSignature(target);
        if (targetSig == null) return result; // v1 또는 파싱 실패 — 검사 skip

        List<Flow> sameTypePeers = peers.stream()
                .filter(p -> p.getTriggerType() == target.getTriggerType())
                .toList();

        List<Long> shadowingIds = new ArrayList<>();
        List<String> shadowingNames = new ArrayList<>();

        for (Flow peer : sameTypePeers) {
            TriggerSignature peerSig = extractSignature(peer);
            if (peerSig == null) continue;

            if (signaturesOverlap(targetSig, peerSig)) {
                shadowingIds.add(peer.getId());
                shadowingNames.add(peer.getName());
            }
        }

        if (!shadowingIds.isEmpty()) {
            result.add(FlowDto.Conflict.builder()
                    .severity("WARN")
                    .reason(buildShadowingReason(target, targetSig, shadowingNames))
                    .conflictingFlowIds(shadowingIds)
                    .conflictingFlowNames(shadowingNames)
                    .build());
        }

        return result;
    }

    /**
     * 유저의 모든 활성 플로우를 검사해 flowId → 충돌 리스트 매핑 반환.
     * 목록 페이지에서 한번에 호출하여 뱃지 판정.
     */
    public List<FlowDto.ConflictReport> detectAllForUser(Long userId) {
        List<Flow> flows = flowRepository
                .findByUserIdAndActiveTrueOrderByTriggerTypeAscPriorityAscCreatedAtAsc(userId);
        List<FlowDto.ConflictReport> reports = new ArrayList<>();
        for (Flow f : flows) {
            List<Flow> others = flows.stream()
                    .filter(x -> !Objects.equals(x.getId(), f.getId()))
                    .toList();
            List<FlowDto.Conflict> conflicts = detectAgainst(f, others);
            if (!conflicts.isEmpty()) {
                reports.add(FlowDto.ConflictReport.builder()
                        .flowId(f.getId())
                        .conflicts(conflicts)
                        .build());
            }
        }
        return reports;
    }

    // ─────────────────────────────────────────────────────────────

    private boolean isSingletonTrigger(Flow.TriggerType type) {
        return type == Flow.TriggerType.WELCOME
                || type == Flow.TriggerType.STORY_MENTION
                || type == Flow.TriggerType.ICEBREAKER;
    }

    /** Flow 엔티티에서 트리거 매칭 시그니처(매칭 파라미터 조합)를 추출. */
    private TriggerSignature extractSignature(Flow flow) {
        JsonNode triggerData = flowTriggerMatcher.extractTriggerData(flow);
        if (triggerData == null) return null;

        String matchMode = triggerData.path("keywordMatch").asText("CONTAINS").toUpperCase();
        String keywordsRaw = triggerData.path("keywords").asText("");
        String postTarget = triggerData.path("postTarget").asText("any");
        String postId = triggerData.path("postId").asText("");

        Set<String> keywords = new HashSet<>();
        for (String part : keywordsRaw.split(",")) {
            String k = part.trim().toLowerCase();
            if (!k.isEmpty()) keywords.add(k);
        }

        return new TriggerSignature(matchMode, keywords, postTarget, postId);
    }

    /** 두 시그니처가 같은 입력에서 동시 매칭될 수 있으면 true. */
    private boolean signaturesOverlap(TriggerSignature a, TriggerSignature b) {
        // COMMENT 전용 postTarget 필터
        if (!postsOverlap(a, b)) return false;

        // ANY (모든 메시지) 는 어느 키워드 조합과도 겹친다.
        if ("ANY".equals(a.matchMode) || "ANY".equals(b.matchMode)) return true;

        // 둘 다 키워드 비어있으면 — 이론적으로 둘 다 "모두 매칭" 이므로 겹침
        if (a.keywords.isEmpty() && b.keywords.isEmpty()) return true;
        if (a.keywords.isEmpty() || b.keywords.isEmpty()) return false;

        // 키워드 쌍 비교. 하나라도 겹치면 true.
        for (String ka : a.keywords) {
            for (String kb : b.keywords) {
                if (keywordsOverlap(a.matchMode, ka, b.matchMode, kb)) return true;
            }
        }
        return false;
    }

    private boolean postsOverlap(TriggerSignature a, TriggerSignature b) {
        boolean aAny = "any".equalsIgnoreCase(a.postTarget) || a.postId.isBlank();
        boolean bAny = "any".equalsIgnoreCase(b.postTarget) || b.postId.isBlank();
        if (aAny || bAny) return true;                  // 한 쪽이 any 면 다른 쪽 어떤 post 건 커버
        return Objects.equals(a.postId, b.postId);      // 둘 다 specific — 같은 post 에서만 겹침
    }

    /**
     * 모드별 키워드 겹침.
     *  - EXACT vs EXACT        : 문자열 동일이어야 겹침
     *  - CONTAINS vs CONTAINS  : substring 관계가 있거나 동일해도 겹침(좁은 판정). 외의 조합은 shadowing 가능성만 있어도 WARN 대상이므로 true 로 둠.
     *  - STARTS_WITH           : CONTAINS 와 동등 처리(지금 FE 미사용)
     *  - EXACT vs CONTAINS     : EXACT 단어가 CONTAINS 단어를 포함(또는 동일)이면 EXACT 매칭 순간 CONTAINS 도 매칭 → 겹침.
     *
     * "포함 관계 없음" CONTAINS 끼리도 한 문장에 두 키워드가 함께 들어올 수 있어 WARN 대상.
     * 유저가 결정하도록 true 반환.
     */
    private boolean keywordsOverlap(String modeA, String kwA, String modeB, String kwB) {
        if ("EXACT".equals(modeA) && "EXACT".equals(modeB)) {
            return kwA.equals(kwB);
        }
        if ("EXACT".equals(modeA)) {
            return kwA.contains(kwB); // EXACT 입력이 CONTAINS 키워드 포함 시 겹침
        }
        if ("EXACT".equals(modeB)) {
            return kwB.contains(kwA);
        }
        // 둘 다 CONTAINS(또는 STARTS_WITH) — 항상 가능성 있음 (shadowing 유도)
        return true;
    }

    private String buildShadowingReason(Flow target, TriggerSignature sig, List<String> names) {
        String label = triggerLabel(target.getTriggerType());
        String list = names.size() > 3
                ? String.join(", ", names.subList(0, 3)) + " 외 " + (names.size() - 3) + "개"
                : String.join(", ", names);
        return "[" + label + "] 트리거가 다음 플로우와 같은 메시지에 매칭될 수 있습니다: "
                + list + ". 우선순위가 높은 플로우만 실행됩니다(드래그로 순서 변경 가능).";
    }

    private String triggerLabel(Flow.TriggerType type) {
        return switch (type) {
            case KEYWORD -> "DM 키워드";
            case COMMENT -> "댓글";
            case STORY_MENTION -> "스토리 멘션";
            case STORY_REPLY -> "스토리 답장";
            case WELCOME -> "첫 메시지";
            case ICEBREAKER -> "아이스브레이커";
        };
    }

    /** 비교용 시그니처. record 대신 static class — 기존 프로젝트 스타일과 통일. */
    private record TriggerSignature(
            String matchMode,
            Set<String> keywords,
            String postTarget,
            String postId
    ) {}
}
