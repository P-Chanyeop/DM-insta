-- V25: automations 테이블 DROP (Phase 4)
--
-- Phase 1-3 에서 Flow-native 아키텍처로 전환 완료 — 트리거 매칭 정보가
-- flow.flow_data JSON 안 v2 트리거 노드로 이전되었고, AutomationToFlowBackfill
-- 이 v1 Flow 들의 데이터를 운영에 백필 (upgraded=1, skipped=2 확인됨).
-- 이 시점부터 automations 테이블은 어디서도 읽히지 않음.
--
-- 안전성:
--   - automations 를 참조하는 in-bound FK 없음 (out-bound FK 만 존재 → users/flows)
--   - 백엔드 코드에 automations 테이블 참조 없음 (엔티티/레포지토리/서비스 전부 삭제됨)
--   - 인덱스(idx_automations_user_id, idx_automations_user_type, idx_automations_user_active_type) 는 DROP TABLE 시 자동 제거됨

DROP TABLE IF EXISTS automations;
