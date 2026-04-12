package com.instabot.backend.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DashboardDto {
    private long totalContacts;
    private long activeContacts;
    private long vipContacts;
    private long totalFlows;
    private long activeFlows;
    private long openConversations;
    private long totalMessagesSent;
    private double avgOpenRate;
    private double avgClickRate;
}
