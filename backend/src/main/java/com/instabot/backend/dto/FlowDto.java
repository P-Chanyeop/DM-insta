package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class FlowDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "플로우 이름은 필수입니다")
        private String name;
        @NotBlank(message = "트리거 타입은 필수입니다")
        private String triggerType;
        private String flowData;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRequest {
        private String name;
        private String flowData;
        private Boolean active;
        private String status;
        private Integer priority;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String triggerType;
        private String status;
        private boolean active;
        private String flowData;
        private Integer priority;
        private Long sentCount;
        private Double openRate;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    /**
     * 드래그로 순서 변경 시 전체 id 목록을 순서대로 보냄.
     * 배열 index 가 곧 priority 가 됨.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ReorderRequest {
        private List<Long> orderedIds;
    }

    /**
     * 충돌 1건 설명. severity: "HARD_BLOCK" | "WARN".
     * reason 은 사용자에게 보여줄 한국어 메시지.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Conflict {
        private String severity;
        private String reason;
        private List<Long> conflictingFlowIds;
        private List<String> conflictingFlowNames;
    }

    /**
     * flowId → [Conflict...] 매핑. 목록 페이지에서 뱃지 판정 및 저장/활성화 시 표시.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ConflictReport {
        private Long flowId;
        private List<Conflict> conflicts;
    }
}
