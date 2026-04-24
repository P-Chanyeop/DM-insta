package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.instabot.backend.entity.InstagramAccount;
import com.instabot.backend.exception.BadRequestException;
import com.instabot.backend.repository.InstagramAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Flow 저장 직전에 flowData JSON 을 정규화.
 *
 * 핵심 역할:
 *  - 프론트는 COMMENT 트리거에 {@code specificPostUrl} (사용자가 붙여넣은 Instagram 퍼머링크) 만 저장.
 *  - 하지만 FlowTriggerMatcher / FlowConflictService / 웹훅은 숫자 media id ({@code postId}) 로 매칭함.
 *  - 이 정규화를 안 돌리면 post 필터가 항상 공백 → 모든 게시물에 반응 (심각한 버그) 또는
 *    서로 다른 게시물인데도 postId 가 둘 다 비어 있어 false-positive 충돌 경고가 발생.
 *
 * 동작:
 *  - v2 flowData 의 type==trigger 노드를 찾아 COMMENT + postTarget=="specific" + specificPostUrl 존재 시
 *    Graph API 로 permalink → 숫자 media id 를 해석해 {@code data.postId} 에 기록.
 *  - 해석 실패면 {@link BadRequestException} 으로 저장 차단 (활성 계정 없음 / 해당 URL 게시물 없음 둘 다).
 *  - postTarget="any" 이거나 URL 이 비어 있으면 손대지 않음.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowTriggerNormalizer {

    private final ObjectMapper objectMapper;
    private final InstagramApiService instagramApiService;
    private final InstagramAccountRepository instagramAccountRepository;

    /**
     * flowData JSON 을 받아 정규화된 JSON 을 반환.
     * <p>
     * v2 구조의 type==trigger 노드를 훑어 COMMENT + postTarget=="specific" + specificPostUrl 이
     * 모두 설정된 경우 Graph API 로 URL 을 숫자 media id 로 해석해 {@code data.postId} 에 기록.
     * postTarget 이 "any" 로 돌아가면 이전 postId 흔적 제거. 손댈 게 없으면 원본 문자열 그대로 반환.
     * <p>
     * null / 빈 문자열 / v1 구조는 정규화 없이 통과 (v1 은 legacy, 이미 사용되지 않음).
     *
     * @param flowDataJson React-Flow 가 직렬화한 노드/엣지 JSON. null/blank 허용.
     * @param userId       저장 주체 — 활성 Instagram 계정 조회에 사용 (로그인된 유저 id).
     * @return 정규화된 JSON 문자열. mutate 가 없거나 v1/null 인 경우 입력 그대로 반환 (non-null 입력 → non-null 반환).
     * @throws BadRequestException postTarget=="specific" 인데 URL 이 비었거나,
     *                             활성 Instagram 계정이 없거나, URL 이 연결 계정의 게시물과 매칭되지 않을 때.
     */
    public String normalize(String flowDataJson, Long userId) {
        if (flowDataJson == null || flowDataJson.isBlank()) return flowDataJson;

        JsonNode root;
        try {
            root = objectMapper.readTree(flowDataJson);
        } catch (Exception e) {
            log.warn("flowData 파싱 실패 — 정규화 건너뜀: userId={}, err={}", userId, e.getMessage());
            return flowDataJson;
        }

        int version = root.path("version").asInt(1);
        if (version < 2) return flowDataJson; // v1 은 legacy — 건드리지 않음

        JsonNode nodes = root.path("nodes");
        if (!nodes.isArray()) return flowDataJson;

        boolean mutated = false;
        InstagramAccount cachedAccount = null;

        for (JsonNode node : nodes) {
            if (!"trigger".equals(node.path("type").asText())) continue;
            JsonNode dataNode = node.path("data");
            if (!(dataNode instanceof ObjectNode data)) continue;

            String triggerType = data.path("triggerType").asText("");
            String postTarget = data.path("postTarget").asText("any");
            String specificUrl = data.path("specificPostUrl").asText("").trim();
            String existingPostId = data.path("postId").asText("").trim();

            // COMMENT + specific + URL 있을 때만 처리
            if (!"COMMENT".equalsIgnoreCase(triggerType)) continue;
            if (!"specific".equalsIgnoreCase(postTarget)) {
                // "any" 로 돌아간 경우 예전 postId 흔적 제거 (충돌 체크가 잘못 걸리지 않도록)
                if (data.has("postId") && !existingPostId.isBlank()) {
                    data.remove("postId");
                    mutated = true;
                }
                continue;
            }
            if (specificUrl.isBlank()) {
                throw new BadRequestException("댓글 트리거에서 '특정 게시물' 을 선택한 경우 게시물 URL 을 입력해주세요.");
            }

            // 동일 URL 에 대해 이미 resolve 된 postId 가 있으면 재사용 (저장 때마다 API 호출 안 하려고)
            String cachedResolvedUrl = data.path("resolvedFromUrl").asText("");
            if (!existingPostId.isBlank() && specificUrl.equals(cachedResolvedUrl)) {
                continue;
            }

            if (cachedAccount == null) {
                cachedAccount = instagramAccountRepository.findByUserIdAndActiveTrue(userId)
                        .orElseThrow(() -> new BadRequestException(
                                "활성 Instagram 계정이 없습니다. 계정을 연결한 뒤 다시 저장해주세요."));
            }

            String resolvedId = instagramApiService.resolveMediaIdFromPermalink(
                    specificUrl, cachedAccount.getIgUserId(),
                    instagramApiService.getDecryptedToken(cachedAccount));

            if (resolvedId == null || resolvedId.isBlank()) {
                throw new BadRequestException(
                        "게시물 URL 을 확인해주세요. 연결된 Instagram 계정에서 해당 URL 의 게시물을 찾을 수 없습니다: "
                                + specificUrl);
            }

            data.put("postId", resolvedId);
            data.put("resolvedFromUrl", specificUrl);
            mutated = true;
            log.info("Flow 정규화: specificPostUrl={} → postId={} (userId={})", specificUrl, resolvedId, userId);
        }

        if (!mutated) return flowDataJson;

        try {
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            log.error("정규화 후 직렬화 실패 — 원본 반환: userId={}, err={}", userId, e.getMessage());
            return flowDataJson;
        }
    }
}
