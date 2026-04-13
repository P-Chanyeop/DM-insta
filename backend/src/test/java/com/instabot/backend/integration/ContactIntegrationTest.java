package com.instabot.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.AuthDto;
import com.instabot.backend.dto.ContactDto;
import com.instabot.backend.repository.ContactRepository;
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

import java.util.List;

import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@org.springframework.context.annotation.Import(TestConfig.class)
class ContactIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ContactRepository contactRepository;

    private String jwtToken;

    @BeforeEach
    void setUp() throws Exception {
        // @Transactional on the class handles test isolation via rollback
        jwtToken = signupAndGetToken("contacttest@example.com", "password123", "Contact Tester");
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

    private List<Long> importContacts(List<ContactDto.ImportRequest> requests) throws Exception {
        mockMvc.perform(post("/api/contacts/import")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requests)))
                .andExpect(status().isOk());

        // Get the contact IDs from the list endpoint
        MvcResult listResult = mockMvc.perform(get("/api/contacts")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andReturn();

        // Parse the page response to get contact IDs
        var jsonNode = objectMapper.readTree(listResult.getResponse().getContentAsString());
        var content = jsonNode.get("content");
        List<Long> ids = new java.util.ArrayList<>();
        if (content != null && content.isArray()) {
            for (var node : content) {
                ids.add(node.get("id").asLong());
            }
        }
        return ids;
    }

    // ─── Tests ───

    @Test
    @DisplayName("import contacts -> list contacts -> verify they exist")
    void testCreateAndListContacts() throws Exception {
        // Import contacts via the import endpoint
        List<ContactDto.ImportRequest> importRequests = List.of(
                new ContactDto.ImportRequest("Alice", "alice_ig", "memo1"),
                new ContactDto.ImportRequest("Bob", "bob_ig", "memo2")
        );

        mockMvc.perform(post("/api/contacts/import")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(importRequests)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(2))
                .andExpect(jsonPath("$.skipped").value(0))
                .andExpect(jsonPath("$.total").value(2));

        // List contacts (paginated)
        mockMvc.perform(get("/api/contacts")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[*].username", containsInAnyOrder("alice_ig", "bob_ig")));
    }

    @Test
    @DisplayName("import contacts -> bulk delete -> verify they are gone")
    void testBulkDeleteContacts() throws Exception {
        // Import 3 contacts
        List<ContactDto.ImportRequest> importRequests = List.of(
                new ContactDto.ImportRequest("User1", "user1_ig", null),
                new ContactDto.ImportRequest("User2", "user2_ig", null),
                new ContactDto.ImportRequest("User3", "user3_ig", null)
        );

        List<Long> contactIds = importContacts(importRequests);
        org.assertj.core.api.Assertions.assertThat(contactIds).hasSize(3);

        // Bulk delete first two contacts
        List<Long> toDelete = List.of(contactIds.get(0), contactIds.get(1));
        mockMvc.perform(post("/api/contacts/bulk-delete")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toDelete)))
                .andExpect(status().isNoContent());

        // Verify only 1 contact remains
        mockMvc.perform(get("/api/contacts")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));
    }
}
