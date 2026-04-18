package com.instabot.backend.service.flow.executor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import com.instabot.backend.service.flow.NodeExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 웹훅 노드 — 외부 URL로 HTTP 요청 전송.
 * 프론트엔드에서 method, url, headers(JSON 문자열), body(문자열, 변수 치환 가능) 제공.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookNodeExecutor implements NodeExecutor {

    private final ObjectMapper objectMapper;
    private final NodeExecutorUtils utils;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public String[] supportedTypes() {
        return new String[]{"webhook"};
    }

    @Override
    public NodeExecResult execute(FlowContext ctx, FlowNode node) {
        JsonNode data = node.getData();
        if (data == null) return NodeExecResult.ok();

        String url = data.path("url").asText("");
        if (url.isBlank()) {
            log.warn("웹훅 URL 비어있음");
            return NodeExecResult.ok();
        }

        String method = data.path("method").asText("POST").toUpperCase();

        try {
            // 요청 본문: 사용자가 직접 지정한 body 우선, 없으면 기본 페이로드
            String bodyStr = data.path("body").asText("");
            if (!bodyStr.isBlank()) {
                bodyStr = utils.replaceVariables(bodyStr, ctx);
            } else {
                // 기본 페이로드 구성
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("flowId", ctx.getFlow().getId());
                payload.put("flowName", ctx.getFlow().getName());
                payload.put("senderIgId", ctx.getSenderIgId());
                payload.put("triggerKeyword", ctx.getTriggerKeyword());
                if (ctx.getContact() != null) {
                    payload.put("contactName", ctx.getContact().getName());
                    payload.put("contactUsername", ctx.getContact().getUsername());
                }
                bodyStr = objectMapper.writeValueAsString(payload);
            }

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15));

            // 사용자 정의 헤더 적용
            String headersJson = data.path("headers").asText("{}");
            try {
                JsonNode headersNode = objectMapper.readTree(headersJson);
                if (headersNode.isObject()) {
                    headersNode.fields().forEachRemaining(entry -> {
                        String headerValue = entry.getValue().asText("");
                        if (!headerValue.isBlank()) {
                            reqBuilder.header(entry.getKey(), headerValue);
                        }
                    });
                }
            } catch (Exception e) {
                log.warn("웹훅 헤더 파싱 실패, 기본 헤더만 사용: {}", e.getMessage());
            }

            final String finalBody = bodyStr;
            HttpRequest request = switch (method) {
                case "GET" -> reqBuilder.GET().build();
                case "PUT" -> reqBuilder.PUT(HttpRequest.BodyPublishers.ofString(finalBody)).build();
                case "PATCH" -> reqBuilder.method("PATCH", HttpRequest.BodyPublishers.ofString(finalBody)).build();
                case "DELETE" -> reqBuilder.DELETE().build();
                default -> reqBuilder.POST(HttpRequest.BodyPublishers.ofString(finalBody)).build();
            };

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("웹훅 전송 완료: url={}, method={}, status={}", url, method, response.statusCode());

            if (response.statusCode() >= 400) {
                log.warn("웹훅 응답 오류: status={}, body={}", response.statusCode(), response.body());
                return NodeExecResult.branch("fail");
            }

            return NodeExecResult.branch("pass");
        } catch (Exception e) {
            log.error("웹훅 전송 실패: url={}, error={}", url, e.getMessage());
            return NodeExecResult.branch("fail");
        }
    }
}
