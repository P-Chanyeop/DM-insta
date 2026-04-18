package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.repository.ContactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 노드 실행기 공용 유틸리티.
 * 변수 치환, 커스텀 필드 조회, 이메일 보유 여부 등 공통 로직.
 */
@Component
@RequiredArgsConstructor
public class NodeExecutorUtils {

    private final ContactRepository contactRepository;
    private final ObjectMapper objectMapper;

    private static final Pattern VARIABLE_PATTERN = Pattern.compile(
            "\\{(이름|name|username|키워드|keyword|날짜|date|custom\\.[\\w]+)\\}");
    private static final DateTimeFormatter KOREAN_DATE_FORMAT =
            DateTimeFormatter.ofPattern("M월 d일");

    /**
     * 템플릿 문자열의 {변수} 를 실제 값으로 치환
     */
    public String replaceVariables(String template, FlowContext ctx) {
        if (template == null || template.isBlank()) return template;
        Contact contact = ctx.getContact();
        String triggerKeyword = ctx.getTriggerKeyword();

        Matcher matcher = VARIABLE_PATTERN.matcher(template);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String varName = matcher.group(1);
            String replacement = switch (varName) {
                case "이름", "name" -> contact != null && contact.getName() != null ? contact.getName() : "고객";
                case "username" -> contact != null && contact.getUsername() != null ? "@" + contact.getUsername() : "";
                case "키워드", "keyword" -> triggerKeyword != null ? triggerKeyword : "";
                case "날짜", "date" -> LocalDateTime.now().format(KOREAN_DATE_FORMAT);
                default -> {
                    if (varName.startsWith("custom.") && contact != null) {
                        yield getCustomFieldValue(contact, varName.substring(7));
                    }
                    yield matcher.group(0);
                }
            };
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    /**
     * Contact의 customFields JSON에서 특정 필드 값 조회
     */
    public String getCustomFieldValue(Contact contact, String fieldName) {
        if (contact == null) return "";
        String customFields = contact.getCustomFields();
        if (customFields == null || customFields.isBlank()) return "";
        try {
            JsonNode fields = objectMapper.readTree(customFields);
            return fields.path(fieldName).asText("");
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * 해당 사용자의 Contact이 이메일을 보유하고 있는지 확인
     */
    public boolean contactHasEmail(Long userId, String senderIgId) {
        return contactRepository.findByUserIdAndIgUserId(userId, senderIgId)
                .map(contact -> {
                    String fields = contact.getCustomFields();
                    return fields != null && fields.contains("\"email\":");
                })
                .orElse(false);
    }

    /**
     * 숫자 비교 (문자열 → double 변환 시도, 실패하면 문자열 비교)
     */
    public int compareNumeric(String actual, String expected) {
        try {
            double a = actual != null ? Double.parseDouble(actual) : 0;
            double e = Double.parseDouble(expected);
            return Double.compare(a, e);
        } catch (NumberFormatException e) {
            return (actual != null ? actual : "").compareTo(expected);
        }
    }
}
