package com.instabot.backend.dto.flow;

import com.instabot.backend.entity.Contact;
import com.instabot.backend.entity.Flow;
import com.instabot.backend.entity.InstagramAccount;
import lombok.*;

import java.util.*;

/**
 * 플로우 실행 컨텍스트 — 그래프 순회 중 모든 노드 실행기에 전달
 */
@Getter
@Setter
@Builder
public class FlowContext {

    // ── 식별 ──
    private Flow flow;
    private InstagramAccount igAccount;
    private String senderIgId;
    private String commentId;
    private String triggerKeyword;

    // ── 파생 (한번 세팅) ──
    private Contact contact;
    private String accessToken;
    private String botIgId;

    // ── 실행 상태 ──
    @Builder.Default
    private Map<String, Object> variables = new HashMap<>();

    @Builder.Default
    private Set<String> visitedNodeIds = new LinkedHashSet<>();

    @Builder.Default
    private int stepCount = 0;
}
