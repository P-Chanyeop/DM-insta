package com.instabot.backend.service.flow;

import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class NodeExecutorRegistryTest {

    static class StubExecutor implements NodeExecutor {
        private final String[] types;

        StubExecutor(String... types) {
            this.types = types;
        }

        @Override
        public String[] supportedTypes() {
            return types;
        }

        @Override
        public NodeExecResult execute(FlowContext ctx, FlowNode node) {
            return NodeExecResult.ok();
        }
    }

    @Test
    void get_registeredType_returnsExecutor() {
        StubExecutor exec = new StubExecutor("message", "trigger");
        NodeExecutorRegistry registry = new NodeExecutorRegistry(List.of(exec));

        assertThat(registry.get("message")).isSameAs(exec);
        assertThat(registry.get("trigger")).isSameAs(exec);
    }

    @Test
    void get_unregisteredType_throws() {
        NodeExecutorRegistry registry = new NodeExecutorRegistry(List.of(new StubExecutor("message")));

        assertThatThrownBy(() -> registry.get("nonexistent"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("등록되지 않은 노드 타입");
    }

    @Test
    void has_returnsCorrectly() {
        NodeExecutorRegistry registry = new NodeExecutorRegistry(List.of(new StubExecutor("message")));

        assertThat(registry.has("message")).isTrue();
        assertThat(registry.has("unknown")).isFalse();
    }

    @Test
    void multipleExecutors_allRegistered() {
        StubExecutor exec1 = new StubExecutor("trigger");
        StubExecutor exec2 = new StubExecutor("message", "carousel");
        NodeExecutorRegistry registry = new NodeExecutorRegistry(List.of(exec1, exec2));

        assertThat(registry.get("trigger")).isSameAs(exec1);
        assertThat(registry.get("message")).isSameAs(exec2);
        assertThat(registry.get("carousel")).isSameAs(exec2);
    }
}
