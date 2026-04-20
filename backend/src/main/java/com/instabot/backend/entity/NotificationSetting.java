package com.instabot.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationSetting {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default private boolean newMessage = true;
    @Builder.Default private boolean automationError = true;
    @Builder.Default private boolean dailyReport = false;
    @Builder.Default private boolean weeklyReport = true;
    @Builder.Default private boolean billingAlerts = true;
    @Builder.Default private boolean systemUpdates = true;
}
