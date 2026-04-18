package com.instabot.backend.service.flow;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Spring이 수집한 모든 NodeExecutor 빈을 타입별로 인덱싱.
 * 새 NodeExecutor 빈을 추가하면 자동으로 등록된다.
 */
@Slf4j
@Component
public class NodeExecutorRegistry {

    private final Map<String, NodeExecutor> byType = new HashMap<>();

    public NodeExecutorRegistry(List<NodeExecutor> executors) {
        for (NodeExecutor exec : executors) {
            for (String type : exec.supportedTypes()) {
                byType.put(type, exec);
                log.debug("NodeExecutor 등록: {} → {}", type, exec.getClass().getSimpleName());
            }
        }
        log.info("NodeExecutorRegistry: {}개 타입 등록 완료", byType.size());
    }

    public NodeExecutor get(String nodeType) {
        NodeExecutor exec = byType.get(nodeType);
        if (exec == null) {
            throw new IllegalStateException("등록되지 않은 노드 타입: " + nodeType);
        }
        return exec;
    }

    public boolean has(String nodeType) {
        return byType.containsKey(nodeType);
    }
}
