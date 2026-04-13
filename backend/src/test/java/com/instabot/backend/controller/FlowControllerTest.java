package com.instabot.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.exception.GlobalExceptionHandler;
import com.instabot.backend.service.FlowService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FlowController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class FlowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private FlowService flowService;

    private static final Long USER_ID = 1L;

    @BeforeEach
    void setUpAuth() {
        setAuthenticatedUser(USER_ID);
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private void setAuthenticatedUser(Long userId) {
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                        userId, null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private FlowDto.Response sampleFlow(Long id) {
        return FlowDto.Response.builder()
                .id(id)
                .name("Welcome Flow")
                .triggerType("KEYWORD")
                .status("DRAFT")
                .active(false)
                .flowData("{}")
                .sentCount(0L)
                .openRate(0.0)
                .createdAt(LocalDateTime.of(2026, 1, 1, 0, 0))
                .updatedAt(LocalDateTime.of(2026, 1, 1, 0, 0))
                .build();
    }

    // ── GET /api/flows ──────────────────────────────────────

    @Test
    @DisplayName("GET /api/flows - authenticated returns 200 with list")
    void getFlows_authenticated() throws Exception {
        given(flowService.getFlows(USER_ID)).willReturn(List.of(sampleFlow(1L)));

        mockMvc.perform(get("/api/flows"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Welcome Flow"));
    }

    // ── POST /api/flows ─────────────────────────────────────

    @Test
    @DisplayName("POST /api/flows - valid request returns 200")
    void createFlow_authenticated() throws Exception {
        FlowDto.CreateRequest request = new FlowDto.CreateRequest("New Flow", "KEYWORD", "{}");
        given(flowService.createFlow(eq(USER_ID), any(FlowDto.CreateRequest.class)))
                .willReturn(sampleFlow(2L));

        mockMvc.perform(post("/api/flows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2));
    }

    @Test
    @DisplayName("POST /api/flows - missing name returns 400")
    void createFlow_missingName() throws Exception {
        // name is null -> @NotBlank violation
        FlowDto.CreateRequest request = new FlowDto.CreateRequest(null, "KEYWORD", "{}");

        mockMvc.perform(post("/api/flows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PATCH /api/flows/{id}/toggle ────────────────────────

    @Test
    @DisplayName("PATCH /api/flows/1/toggle - returns 200 with toggled flow")
    void toggleFlow() throws Exception {
        FlowDto.Response toggled = sampleFlow(1L);
        toggled.setActive(true);
        given(flowService.toggleFlow(1L)).willReturn(toggled);

        mockMvc.perform(patch("/api/flows/1/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    // ── DELETE /api/flows/{id} ──────────────────────────────

    @Test
    @DisplayName("DELETE /api/flows/1 - returns 204")
    void deleteFlow() throws Exception {
        doNothing().when(flowService).deleteFlow(1L);

        mockMvc.perform(delete("/api/flows/1"))
                .andExpect(status().isNoContent());
    }

    // ── Unauthenticated ─────────────────────────────────────

    @Test
    @DisplayName("GET /api/flows - unauthenticated (no principal) returns 500 due to SecurityUtils")
    void unauthenticated_returnsError() throws Exception {
        // Clear the security context so SecurityUtils.currentUserId() throws
        SecurityContextHolder.clearContext();

        mockMvc.perform(get("/api/flows"))
                .andExpect(status().isUnauthorized());
    }
}
