package com.instabot.backend.service.flow;

import com.instabot.backend.dto.flow.FlowContext;
import com.instabot.backend.dto.flow.FlowNode;
import com.instabot.backend.dto.flow.NodeExecResult;

/**
 * 노드 실행기 인터페이스.
 * 각 노드 타입(trigger, message, condition, delay 등)마다
 * 이 인터페이스를 구현하는 Spring 빈을 만든다.
 */
public interface NodeExecutor {

    /**
     * 이 실행기가 처리하는 노드 타입 목록.
     * 예: {"message"}, {"condition"}, {"trigger", "commentReply"}
     */
    String[] supportedTypes();

    /**
     * 노드 실행. 결과로 분기/종료/대기 등을 반환.
     */
    NodeExecResult execute(FlowContext ctx, FlowNode node);
}
