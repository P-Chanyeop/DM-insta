package com.instabot.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.AuthDto;
import com.instabot.backend.exception.DuplicateEmailException;
import com.instabot.backend.exception.GlobalExceptionHandler;
import com.instabot.backend.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthService authService;

    // ── Signup ──────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/signup - success returns 200 with token")
    void signup_success() throws Exception {
        AuthDto.AuthResponse response = AuthDto.AuthResponse.builder()
                .token("jwt-token-123")
                .email("test@example.com")
                .name("Test User")
                .plan("FREE")
                .build();

        given(authService.signup(any(AuthDto.SignupRequest.class))).willReturn(response);

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AuthDto.SignupRequest("test@example.com", "password123", "Test User"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token-123"))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.name").value("Test User"))
                .andExpect(jsonPath("$.plan").value("FREE"));
    }

    @Test
    @DisplayName("POST /api/auth/signup - duplicate email returns 409")
    void signup_duplicateEmail() throws Exception {
        given(authService.signup(any(AuthDto.SignupRequest.class)))
                .willThrow(new DuplicateEmailException("이미 등록된 이메일입니다."));

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AuthDto.SignupRequest("dup@example.com", "password123", "Dup User"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    @DisplayName("POST /api/auth/signup - missing email returns 400")
    void signup_invalidEmail() throws Exception {
        // email is null, violating @NotBlank @Email
        AuthDto.SignupRequest request = new AuthDto.SignupRequest(null, "password123", "Test User");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── Login ───────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/login - success returns 200 with token")
    void login_success() throws Exception {
        AuthDto.AuthResponse response = AuthDto.AuthResponse.builder()
                .token("jwt-token-456")
                .email("user@example.com")
                .name("User")
                .plan("PRO")
                .build();

        given(authService.login(any(AuthDto.LoginRequest.class))).willReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AuthDto.LoginRequest("user@example.com", "password123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token-456"))
                .andExpect(jsonPath("$.email").value("user@example.com"))
                .andExpect(jsonPath("$.plan").value("PRO"));
    }

    @Test
    @DisplayName("POST /api/auth/login - wrong credentials returns 401")
    void login_wrongCredentials() throws Exception {
        given(authService.login(any(AuthDto.LoginRequest.class)))
                .willThrow(new RuntimeException("이메일 또는 비밀번호가 올바르지 않습니다."));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AuthDto.LoginRequest("wrong@example.com", "badpassword"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }
}
