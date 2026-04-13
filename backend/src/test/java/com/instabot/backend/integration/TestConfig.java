package com.instabot.backend.integration;

import com.instabot.backend.service.EmailService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;

@TestConfiguration
public class TestConfig {

    /**
     * Mock EmailService to prevent actual mail sending in tests.
     */
    @Bean
    @Primary
    public EmailService emailService() {
        EmailService mockEmail = mock(EmailService.class);
        doNothing().when(mockEmail).sendVerificationEmail(anyString(), anyString());
        doNothing().when(mockEmail).sendPasswordResetEmail(anyString(), anyString());
        return mockEmail;
    }
}
