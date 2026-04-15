package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class GroupBuyDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "공동구매 제목은 필수입니다")
        private String title;
        private String description;
        private int maxQuantity;  // 0 = 무제한
        private String price;
        private String paymentLink;
        private String imageUrl;
        private String options;   // JSON array string
        private Long flowId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateRequest {
        private String title;
        private String description;
        private int maxQuantity;
        private String price;
        private String paymentLink;
        private String imageUrl;
        private String options;
        private Long flowId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String title;
        private String description;
        private int maxQuantity;
        private int currentCount;
        private int remainingStock;
        private String price;
        private String paymentLink;
        private String imageUrl;
        private String options;
        private String status;
        private Long flowId;
        private String flowName;
        private int participantCount;
        private LocalDateTime openedAt;
        private LocalDateTime closedAt;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ParticipantResponse {
        private Long id;
        private Long contactId;
        private String contactName;
        private String contactUsername;
        private String selectedOption;
        private int quantity;
        private String amount;
        private String trackingNumber;
        private String memo;
        private String status;
        private LocalDateTime appliedAt;
        private LocalDateTime paidAt;
        private LocalDateTime shippedAt;
        private LocalDateTime deliveredAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateParticipantRequest {
        private String status;
        private String trackingNumber;
        private String memo;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Stats {
        private long total;
        private long applied;
        private long paid;
        private long shipping;
        private long delivered;
        private long cancelled;
    }
}
