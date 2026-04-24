package com.instabot.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

public class InstagramAccountDto {

    @Getter @Setter
    public static class ConnectRequest {
        @NotBlank private String igUserId;
        @NotBlank private String username;
        @NotBlank private String accessToken;
        private String profilePictureUrl;
        private String accountType;
        private Long followersCount;
    }

    @Getter @Setter
    public static class UpdateRequest {
        private String username;
        private String accessToken;
        private String profilePictureUrl;
        private String accountType;
        private Long followersCount;
    }

    @Getter @Setter @Builder
    public static class AccountResponse {
        private Long id;
        private String igUserId;
        private String username;
        private String profilePictureUrl;
        private Long followersCount;
        private String accountType;
        private boolean connected;
        private boolean active;
        private LocalDateTime connectedAt;
        private LocalDateTime tokenExpiresAt;
    }

    @Getter @Setter @Builder
    public static class AccountSummary {
        private Long id;
        private String username;
        private String profilePictureUrl;
        private String accountType;
        private boolean connected;
        private boolean active;
        private AccountStats stats;
    }

    @Getter @Setter @Builder
    public static class AccountStats {
        private Long followersCount;
        private long flowCount;
        private long contactCount;
    }

    @Getter @Setter @Builder
    public static class AgencyOverview {
        private int totalAccounts;
        private int connectedAccounts;
        private int maxAccounts;
        private long totalFollowers;
        private long totalContacts;
        private long totalFlows;
        private java.util.List<AccountSummary> accounts;
    }
}
