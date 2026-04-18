package com.instabot.backend.dto.flow;

import com.instabot.backend.entity.PendingFlowAction;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NodeExecResult {

    @Builder.Default
    private boolean success = true;

    /** 분기 선택: "pass", "fail", "a", "b", null(기본) */
    private String branch;

    /** true면 여기서 플로우 종료 */
    @Builder.Default
    private boolean haltFlow = false;

    /** true면 사용자 응답 대기 (PendingFlowAction 저장 후 중단) */
    @Builder.Default
    private boolean awaitUser = false;

    /** awaitUser=true일 때 어떤 단계를 기다리는지 */
    private PendingFlowAction.PendingStep awaitStep;

    public static NodeExecResult ok() {
        return NodeExecResult.builder().success(true).build();
    }

    public static NodeExecResult branch(String branch) {
        return NodeExecResult.builder().success(true).branch(branch).build();
    }

    public static NodeExecResult halt() {
        return NodeExecResult.builder().success(false).haltFlow(true).build();
    }

    public static NodeExecResult await(PendingFlowAction.PendingStep step) {
        return NodeExecResult.builder().success(true).awaitUser(true).awaitStep(step).build();
    }
}
