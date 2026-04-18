-- v2 그래프 플로우: 실행 중단 노드 ID 저장
ALTER TABLE pending_flow_actions ADD COLUMN current_node_id VARCHAR(255);
