package com.instabot.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.AuthDto;
import com.instabot.backend.dto.FlowDto;
import com.instabot.backend.repository.FlowRepository;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@org.springframework.context.annotation.Import(TestConfig.class)
class FlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FlowRepository flowRepository;

    private String jwtToken;

    @BeforeEach
    void setUp() throws Exception {
        // @Transactional on the class handles test isolation via rollback
        jwtToken = signupAndGetToken("flowtest@example.com", "password123", "Flow Tester");
    }

    // ─── Helpers ───

    private String signupAndGetToken(String email, String password, String name) throws Exception {
        AuthDto.SignupRequest request = new AuthDto.SignupRequest(email, password, name);
        MvcResult result = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        AuthDto.AuthResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(), AuthDto.AuthResponse.class);
        return response.getToken();
    }

    private Long createFlow(String name, String triggerType, String flowData) throws Exception {
        FlowDto.CreateRequest request = new FlowDto.CreateRequest(name, triggerType, flowData);
        MvcResult result = mockMvc.perform(post("/api/flows")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        FlowDto.Response response = objectMapper.readValue(
                result.getResponse().getContentAsString(), FlowDto.Response.class);
        return response.getId();
    }

    // ─── Tests ───

    @Test
    @DisplayName("create flow -> list flows -> verify it exists")
    void testCreateAndListFlows() throws Exception {
        // Create a flow
        FlowDto.CreateRequest request = new FlowDto.CreateRequest("Welcome Flow", "KEYWORD", "{\"nodes\":[]}");
        mockMvc.perform(post("/api/flows")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Welcome Flow"))
                .andExpect(jsonPath("$.triggerType").value("KEYWORD"))
                .andExpect(jsonPath("$.active").value(false));

        // List flows
        mockMvc.perform(get("/api/flows")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Welcome Flow"));
    }

    @Test
    @DisplayName("create -> update flowData -> verify changes")
    void testUpdateFlow() throws Exception {
        Long flowId = createFlow("Original Flow", "KEYWORD", "{\"nodes\":[]}");

        // Update flowData and name
        FlowDto.UpdateRequest updateRequest = new FlowDto.UpdateRequest();
        updateRequest.setName("Updated Flow");
        updateRequest.setFlowData("{\"nodes\":[{\"id\":\"1\"}]}");

        mockMvc.perform(put("/api/flows/" + flowId)
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Flow"))
                .andExpect(jsonPath("$.flowData").value("{\"nodes\":[{\"id\":\"1\"}]}"));

        // Verify via GET
        mockMvc.perform(get("/api/flows/" + flowId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Flow"));
    }

    @Test
    @DisplayName("create -> toggle active -> verify state change")
    void testToggleFlow() throws Exception {
        Long flowId = createFlow("Toggle Flow", "COMMENT", null);

        // Flow starts inactive
        mockMvc.perform(get("/api/flows/" + flowId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        // Toggle to active
        mockMvc.perform(patch("/api/flows/" + flowId + "/toggle")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));

        // Toggle back to inactive
        mockMvc.perform(patch("/api/flows/" + flowId + "/toggle")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    @DisplayName("create -> delete -> list -> verify gone")
    void testDeleteFlow() throws Exception {
        Long flowId = createFlow("Delete Me", "KEYWORD", null);

        // Confirm it exists
        mockMvc.perform(get("/api/flows")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        // Delete
        mockMvc.perform(delete("/api/flows/" + flowId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNoContent());

        // Confirm it is gone
        mockMvc.perform(get("/api/flows")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("request without JWT -> 403")
    void testUnauthorizedAccess() throws Exception {
        mockMvc.perform(get("/api/flows"))
                .andExpect(status().isForbidden());
    }
}
