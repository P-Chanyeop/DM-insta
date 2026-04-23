package com.instabot.backend.service.flow;

/**
 * Postback / Quick Reply payload 인코딩·디코딩.
 *
 * 여러 플로우가 같은 발신자에 대해 병렬로 실행될 수 있으므로,
 * 버튼 클릭 시 어느 플로우의 어느 노드에서 발생한 것인지 정확히 라우팅해야 한다.
 *
 * 포맷:
 *   fa:{flowId}:{nodeId}:{action}          — v2 그래프 (nodeId 있음)
 *   fa:{flowId}::{action}                   — v1 레거시 (nodeId 없음)
 *   OPENING_DM_CLICKED / FOLLOW_CHECK       — 과거 배포 버튼 (deploy 이전 발송분 호환)
 *
 * action:
 *   opening — 오프닝 DM 버튼 클릭
 *   follow  — 팔로우 확인 버튼 클릭
 */
public final class PostbackPayload {

    public enum Action {
        OPENING, FOLLOW, UNKNOWN;

        public static Action fromString(String s) {
            if (s == null) return UNKNOWN;
            return switch (s.toLowerCase()) {
                case "opening" -> OPENING;
                case "follow"  -> FOLLOW;
                default -> UNKNOWN;
            };
        }
    }

    private final Long flowId;
    private final String nodeId; // v1 경로면 null
    private final Action action;

    private PostbackPayload(Long flowId, String nodeId, Action action) {
        this.flowId = flowId;
        this.nodeId = nodeId;
        this.action = action;
    }

    public Long getFlowId() { return flowId; }
    public String getNodeId() { return nodeId; }
    public Action getAction() { return action; }

    /** 새 포맷으로 인코딩 */
    public static String encode(Long flowId, String nodeId, Action action) {
        String safeNode = (nodeId == null) ? "" : nodeId;
        String act = action.name().toLowerCase();
        return "fa:" + flowId + ":" + safeNode + ":" + act;
    }

    /**
     * 문자열 payload 파싱.
     * @return 파싱 성공 시 PostbackPayload, 실패(레거시/알 수 없음) 시 null
     */
    public static PostbackPayload parse(String payload) {
        if (payload == null || payload.isBlank()) return null;

        // 레거시 매핑 — deploy 이전에 발송된 버튼 호환
        if ("OPENING_DM_CLICKED".equals(payload)) {
            return new PostbackPayload(null, null, Action.OPENING);
        }
        if ("FOLLOW_CHECK".equals(payload)) {
            return new PostbackPayload(null, null, Action.FOLLOW);
        }

        if (!payload.startsWith("fa:")) return null;

        String[] parts = payload.split(":", 4);
        // 기대: ["fa", "{flowId}", "{nodeId or empty}", "{action}"]
        if (parts.length != 4) return null;

        Long flowId;
        try {
            flowId = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            return null;
        }
        String nodeId = parts[2].isBlank() ? null : parts[2];
        Action action = Action.fromString(parts[3]);
        if (action == Action.UNKNOWN) return null;

        return new PostbackPayload(flowId, nodeId, action);
    }
}
