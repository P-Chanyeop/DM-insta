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
 * 액션 노드 — addTag, removeTag, setVariable, addNote, subscribe, unsubscribe 등 데이터 조작.
 * 프론트엔드에서 모든 액션의 입력값을 data.value 하나에 저장한다.
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
        // 프론트엔드는 모든 액션의 입력값을 "value" 필드 하나에 저장
        String value = data.path("value").asText("").trim();
        Contact contact = ctx.getContact();

        switch (actionType) {
            case "addTag" -> {
                if (!value.isEmpty() && contact != null) {
                    contact.getTags().add(value);
                    contactRepository.save(contact);
                    log.info("태그 추가: contactId={}, tag={}", contact.getId(), value);
                }
            }
            case "removeTag" -> {
                if (!value.isEmpty() && contact != null && contact.getTags() != null) {
                    contact.getTags().remove(value);
                    contactRepository.save(contact);
                    log.info("태그 제거: contactId={}, tag={}", contact.getId(), value);
                }
            }
            case "setCustomField", "setVariable" -> {
                // 프론트엔드에서 "변수명=값" 형식으로 전달 (예: "vip=true", "score=100")
                String fieldName;
                String fieldValue;
                int eqIdx = value.indexOf('=');
                if (eqIdx > 0) {
                    fieldName = value.substring(0, eqIdx).trim();
                    fieldValue = value.substring(eqIdx + 1).trim();
                } else {
                    fieldName = value;
                    fieldValue = "";
                }
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
            case "addNote" -> {
                // 노트를 커스텀 필드의 notes에 append
                if (!value.isEmpty() && contact != null) {
                    try {
                        Map<String, Object> fields;
                        if (contact.getCustomFields() != null && !contact.getCustomFields().isBlank()) {
                            fields = objectMapper.readValue(contact.getCustomFields(),
                                    objectMapper.getTypeFactory().constructMapType(LinkedHashMap.class, String.class, Object.class));
                        } else {
                            fields = new LinkedHashMap<>();
                        }
                        String existing = fields.getOrDefault("notes", "").toString();
                        fields.put("notes", existing.isEmpty() ? value : existing + "\n" + value);
                        contact.setCustomFields(objectMapper.writeValueAsString(fields));
                        contactRepository.save(contact);
                        log.info("노트 추가: contactId={}, note={}", contact.getId(), value);
                    } catch (Exception e) {
                        log.error("노트 추가 실패: {}", e.getMessage());
                    }
                }
            }
            case "subscribe" -> {
                if (contact != null) {
                    contact.getTags().add("subscribed");
                    if (!value.isEmpty()) contact.getTags().add(value);
                    contactRepository.save(contact);
                    log.info("구독 처리: contactId={}", contact.getId());
                }
            }
            case "unsubscribe" -> {
                if (contact != null) {
                    contact.getTags().remove("subscribed");
                    if (!value.isEmpty()) contact.getTags().remove(value);
                    contactRepository.save(contact);
                    log.info("구독 해제: contactId={}", contact.getId());
                }
            }
            default -> log.info("미지원 액션 타입: {}", actionType);
        }

        return NodeExecResult.ok();
    }
}
