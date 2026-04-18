package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.repository.ContactRepository;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 액션 노드 — addTag, removeTag, setCustomField 등 데이터 조작
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ActionNodeExecutor implements NodeExecutor {

    private final ContactRepository contactRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String[] supportedTypes() {
        return new String[]{"action"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        String actionType = data.path("actionType").asText("");
        Contact contact = ctx.getContact();

        switch (actionType) {
            case "addTag" -> {
                String tag = data.path("tagName").asText("").trim();
                if (!tag.isEmpty() && contact != null) {
                    contact.getTags().add(tag);
                    contactRepository.save(contact);
                    log.info("태그 추가: contactId={}, tag={}", contact.getId(), tag);
                }
            }
            case "removeTag" -> {
                String tag = data.path("tagName").asText("").trim();
                if (!tag.isEmpty() && contact != null && contact.getTags() != null) {
                    contact.getTags().remove(tag);
                    contactRepository.save(contact);
                    log.info("태그 제거: contactId={}, tag={}", contact.getId(), tag);
                }
            }
            case "setCustomField" -> {
                String fieldName = data.path("fieldName").asText("").trim();
                String fieldValue = data.path("fieldValue").asText("");
                if (!fieldName.isEmpty() && contact != null) {
                    try {
                        Map<String, Object> fields;
                        if (contact.getCustomFields() != null && !contact.getCustomFields().isBlank()) {
                            fields = objectMapper.readValue(contact.getCustomFields(),
                                    objectMapper.getTypeFactory().constructMapType(LinkedHashMap.class, String.class, Object.class));
                        } else {
                            fields = new LinkedHashMap<>();
                        }
                        fields.put(fieldName, fieldValue);
                        contact.setCustomFields(objectMapper.writeValueAsString(fields));
                        contactRepository.save(contact);
                        log.info("커스텀 필드 설정: contactId={}, field={}={}", contact.getId(), fieldName, fieldValue);
                    } catch (Exception e) {
                        log.error("커스텀 필드 설정 실패: {}", e.getMessage());
                    }
                }
            }
            default -> log.info("미지원 액션 타입: {}", actionType);
        }

        return NodeExecResult.ok();
    }
}
