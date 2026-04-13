package com.instabot.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.AuthDto;
import com.instabot.backend.entity.User;
import com.instabot.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@org.springframework.context.annotation.Import(TestConfig.class)
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    // @Transactional on the class handles test isolation via rollback

    // ─── Helper ───

    private MvcResult signup(String email, String password, String name) throws Exception {
        AuthDto.SignupRequest request = new AuthDto.SignupRequest(email, password, name);
        return mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
    }

    private MvcResult login(String email, String password) throws Exception {
        AuthDto.LoginRequest request = new AuthDto.LoginRequest(email, password);
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
    }

    private String getVerificationCode(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return user.getVerificationCode();
    }

    private String getResetCode(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return user.getResetCode();
    }

    // ─── Tests ───

    @Test
    @DisplayName("signup -> verify email -> login returns emailVerified=true")
    void testSignupAndVerifyEmail() throws Exception {
        String email = "test@example.com";
        String password = "password123";
        String name = "Test User";

        // Step 1: Signup
        MvcResult signupResult = signup(email, password, name);
        assertThat(signupResult.getResponse().getStatus()).isEqualTo(200);

        AuthDto.AuthResponse signupResponse = objectMapper.readValue(
                signupResult.getResponse().getContentAsString(), AuthDto.AuthResponse.class);
        assertThat(signupResponse.getToken()).isNotBlank();
        assertThat(signupResponse.isEmailVerified()).isFalse();
        assertThat(signupResponse.getEmail()).isEqualTo(email);

        // Step 2: Verify email with the code from DB
        String code = getVerificationCode(email);
        assertThat(code).isNotNull();

        AuthDto.VerifyEmailRequest verifyRequest = new AuthDto.VerifyEmailRequest(email, code);
        MvcResult verifyResult = mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true))
                .andReturn();

        // Step 3: Login should return emailVerified=true
        MvcResult loginResult = login(email, password);
        assertThat(loginResult.getResponse().getStatus()).isEqualTo(200);

        AuthDto.AuthResponse loginResponse = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(), AuthDto.AuthResponse.class);
        assertThat(loginResponse.isEmailVerified()).isTrue();
        assertThat(loginResponse.getToken()).isNotBlank();
    }

    @Test
    @DisplayName("signup twice with same email -> 409 Conflict")
    void testSignupDuplicateEmail() throws Exception {
        String email = "dup@example.com";

        // First signup succeeds
        MvcResult first = signup(email, "password123", "User 1");
        assertThat(first.getResponse().getStatus()).isEqualTo(200);

        // Second signup with same email fails
        MvcResult second = signup(email, "password456", "User 2");
        assertThat(second.getResponse().getStatus()).isEqualTo(409);
    }

    @Test
    @DisplayName("login without email verification -> emailVerified=false")
    void testLoginUnverifiedUser() throws Exception {
        String email = "unverified@example.com";
        String password = "password123";

        signup(email, password, "Unverified User");

        MvcResult loginResult = login(email, password);
        assertThat(loginResult.getResponse().getStatus()).isEqualTo(200);

        AuthDto.AuthResponse response = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(), AuthDto.AuthResponse.class);
        assertThat(response.isEmailVerified()).isFalse();
        assertThat(response.getToken()).isNotBlank();
    }

    @Test
    @DisplayName("forgot password -> reset with code -> login with new password")
    void testForgotAndResetPassword() throws Exception {
        String email = "reset@example.com";
        String oldPassword = "oldPassword123";
        String newPassword = "newPassword456";

        // Signup
        signup(email, oldPassword, "Reset User");

        // Forgot password
        AuthDto.ForgotPasswordRequest forgotRequest = new AuthDto.ForgotPasswordRequest(email);
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forgotRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        // Get reset code from DB
        String resetCode = getResetCode(email);
        assertThat(resetCode).isNotNull();

        // Reset password
        AuthDto.ResetPasswordRequest resetRequest = new AuthDto.ResetPasswordRequest(email, resetCode, newPassword);
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        // Login with new password succeeds
        MvcResult loginResult = login(email, newPassword);
        assertThat(loginResult.getResponse().getStatus()).isEqualTo(200);

        // Login with old password fails
        MvcResult oldLoginResult = login(email, oldPassword);
        assertThat(oldLoginResult.getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    @DisplayName("verify email with wrong code -> 400")
    void testInvalidVerificationCode() throws Exception {
        String email = "wrongcode@example.com";

        signup(email, "password123", "Wrong Code User");

        AuthDto.VerifyEmailRequest verifyRequest = new AuthDto.VerifyEmailRequest(email, "000000");
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isBadRequest());
    }
}
