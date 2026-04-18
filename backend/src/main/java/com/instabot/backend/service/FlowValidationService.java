package com.instabot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 플로우 활성화 전 구조 검증.
 * 저장은 항상 가능하지만, 활성화(자동화 수행)는 이 검증을 통과해야 한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlowValidationService {

    private final ObjectMapper objectMapper;

    /**
     * 플로우 데이터를 파싱하여 활성화 가능 여부 검증.
     * @return 에러 메시지 리스트 (비어있으면 검증 통과)
     */
    public List<String> validateForActivation(String flowDataJson) {
        List<String> errors = new ArrayList<>();

        if (flowDataJson == null || flowDataJson.isBlank()) {
            errors.add("플로우 데이터가 비어있습니다.");
            return errors;
        }

        try {
            JsonNode root = objectMapper.readTree(flowDataJson);
            int version = root.path("version").asInt(1);

            if (version < 2) {
                // v1은 레거시 — 기본 검증만
                return errors;
            }

            JsonNode nodesArr = root.path("nodes");
            JsonNode edgesArr = root.path("edges");

            if (!nodesArr.isArray() || nodesArr.isEmpty()) {
                errors.add("노드가 없습니다.");
                return errors;
            }

            // 노드/엣지 맵 구성
            Map<String, JsonNode> nodeById = new LinkedHashMap<>();
            for (JsonNode n : nodesArr) {
                nodeById.put(n.path("id").asText(), n);
            }

            Map<String, List<JsonNode>> edgeBySource = new HashMap<>();
            if (edgesArr.isArray()) {
                for (JsonNode e : edgesArr) {
                    edgeBySource.computeIfAbsent(e.path("source").asText(), k -> new ArrayList<>()).add(e);
                }
            }

            // 1. 트리거 노드 1개 필수
            List<String> triggerIds = new ArrayList<>();
            nodeById.forEach((id, n) -> {
                if ("trigger".equals(n.path("type").asText())) triggerIds.add(id);
            });
            if (triggerIds.isEmpty()) {
                errors.add("트리거 노드가 없습니다.");
                return errors;
            }
            if (triggerIds.size() > 1) {
                errors.add("트리거 노드가 2개 이상입니다.");
            }

            String triggerId = triggerIds.get(0);

            // 2. 트리거에 연결된 노드 필수
            List<JsonNode> triggerOuts = edgeBySource.getOrDefault(triggerId, List.of());
            if (triggerOuts.isEmpty()) {
                errors.add("트리거 노드에 연결된 다음 노드가 없습니다.");
            }

            // 3. 트리거 키워드 필수
            JsonNode triggerData = nodeById.get(triggerId).path("data");
            String keywords = triggerData.path("keywords").asText("");
            if (keywords.isBlank()) {
                errors.add("트리거 키워드가 설정되지 않았습니다.");
            }

            // 4. 고아 노드 감지 (BFS)
            Set<String> reachable = new HashSet<>();
            Queue<String> queue = new LinkedList<>();
            queue.add(triggerId);
            while (!queue.isEmpty()) {
                String cur = queue.poll();
                if (reachable.contains(cur)) continue;
                reachable.add(cur);
                for (JsonNode e : edgeBySource.getOrDefault(cur, List.of())) {
                    queue.add(e.path("target").asText());
                }
            }

            long orphanCount = nodeById.keySet().stream()
                    .filter(id -> !reachable.contains(id) && !"trigger".equals(nodeById.get(id).path("type").asText()))
                    .count();
            if (orphanCount > 0) {
                errors.add("연결되지 않은 노드가 " + orphanCount + "개 있습니다. 트리거에서 도달할 수 없는 노드는 실행되지 않습니다.");
            }

            // 5. 분기 노드 출력 엣지 검사
            Set<String> branchingTypes = Set.of("condition", "abtest", "webhook");
            nodeById.forEach((id, n) -> {
                String type = n.path("type").asText();
                if (!branchingTypes.contains(type)) return;
                if (!reachable.contains(id)) return; // 고아 노드는 이미 에러

                List<JsonNode> outs = edgeBySource.getOrDefault(id, List.of());
                if (outs.isEmpty()) {
                    String label = switch (type) {
                        case "condition" -> {
                            String ct = n.path("data").path("conditionType").asText("");
                            yield switch (ct) {
                                case "followCheck" -> "팔로우 확인";
                                case "emailCheck" -> "이메일 수집";
                                case "tagCheck" -> "태그 확인";
                                case "timeRange" -> "시간 조건";
                                case "random" -> "랜덤 분기";
                                default -> "조건";
                            };
                        }
                        case "abtest" -> "A/B 테스트";
                        case "webhook" -> "웹훅";
                        default -> type;
                    };
                    errors.add("\"" + label + "\" 노드에 연결된 분기가 없습니다.");
                }
            });

            // 6. 웹훅 URL 필수
            nodeById.forEach((id, n) -> {
                if (!"webhook".equals(n.path("type").asText())) return;
                if (!reachable.contains(id)) return;
                String url = n.path("data").path("url").asText("");
                if (url.isBlank()) {
                    errors.add("웹훅 노드의 URL이 설정되지 않았습니다.");
                }
            });

        } catch (Exception e) {
            log.error("플로우 검증 실패: {}", e.getMessage());
            errors.add("플로우 데이터를 파싱할 수 없습니다.");
        }

        return errors;
    }
}
