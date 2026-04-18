package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.entity.Contact;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 조건 분기 노드 — 조건 평가 후 "pass" / "fail" 분기
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConditionNodeExecutor implements NodeExecutor {

    private final NodeExecutorUtils utils;

    @Override
    public String[] supportedTypes() {
        return new String[]{"condition"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.branch("pass");

        String condType = data.path("conditionType").asText(data.path("type").asText(""));
        boolean passed = evaluateCondition(condType, data, ctx.getContact());
        return NodeExecResult.branch(passed ? "pass" : "fail");
    }

    private boolean evaluateCondition(String condType, JsonNode data, Contact contact) {
        return switch (condType) {
            case "followCheck" -> true;
            case "tagCheck" -> {
                String tagName = data.path("tagName").asText("").trim();
                if (tagName.isEmpty()) yield true;
                yield contact != null && contact.getTags() != null && contact.getTags().contains(tagName);
            }
            case "customField" -> {
                String fieldName = data.path("fieldName").asText("").trim();
                if (fieldName.isEmpty()) yield true;
                String operator = data.path("operator").asText("equals");
                String expected = data.path("fieldValue").asText("");
                String actual = utils.getCustomFieldValue(contact, fieldName);
                yield switch (operator) {
                    case "equals" -> expected.equals(actual);
                    case "not_equals" -> !expected.equals(actual);
                    case "contains" -> actual != null && actual.contains(expected);
                    case "gt" -> utils.compareNumeric(actual, expected) > 0;
                    case "gte" -> utils.compareNumeric(actual, expected) >= 0;
                    case "lt" -> utils.compareNumeric(actual, expected) < 0;
                    case "lte" -> utils.compareNumeric(actual, expected) <= 0;
                    case "exists" -> actual != null && !actual.isEmpty();
                    default -> true;
                };
            }
            case "emailCheck" -> true;
            case "timeRange" -> {
                int startHour = data.path("startHour").asInt(9);
                int endHour = data.path("endHour").asInt(18);
                ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
                int currentHour = now.getHour();
                int currentDow = now.getDayOfWeek().getValue() - 1;
                JsonNode activeDays = data.get("activeDays");
                if (activeDays != null && activeDays.isArray() && !activeDays.isEmpty()) {
                    boolean dayMatch = false;
                    for (JsonNode d : activeDays) {
                        if (d.asInt(-1) == currentDow) { dayMatch = true; break; }
                    }
                    if (!dayMatch) yield false;
                }
                if (startHour == endHour) yield true;
                else if (startHour < endHour) yield currentHour >= startHour && currentHour < endHour;
                else yield currentHour >= startHour || currentHour < endHour;
            }
            case "random" -> {
                int probability = data.path("probability").asInt(50);
                yield ThreadLocalRandom.current().nextInt(100) < probability;
            }
            default -> true;
        };
    }
}
