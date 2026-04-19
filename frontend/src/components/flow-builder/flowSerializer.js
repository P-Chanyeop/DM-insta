/* ────────────────────────────────────────────
 *  React Flow 노드/엣지 ↔ 백엔드 flowData JSON 변환
 *
 *  v2 (그래프 기반):
 *  {
 *    version: 2,
 *    nodes: [ { id, type, data, position } ],
 *    edges: [ { id, source, target, sourceHandle } ]
 *  }
 *
 *  v1 (레거시 고정 슬롯):
 *  {
 *    trigger: { type, keywords, ... },
 *    openingDm: { enabled, message, ... },
 *    requirements: { followCheck, emailCollection },
 *    mainDm: { message, links },
 *    followUp: { enabled, delay, unit, message },
 *    ...
 *  }
 * ──────────────────────────────────────────── */

const Y_SPACING = 160
const X_CENTER = 300

/* ═══════════════════════════════════════════
 *  flowDataToGraph — 백엔드 JSON → React Flow
 * ═══════════════════════════════════════════ */

export function flowDataToGraph(fd) {
  if (!fd) return getDefaultGraph()

  // ── v2: 그래프를 그대로 복원 ──
  if (fd.version === 2) {
    return flowDataToGraphV2(fd)
  }

  // ── v1: 레거시 고정 슬롯 → 그래프 변환 ──
  return flowDataToGraphV1(fd)
}

/**
 * v2 복원 — nodes/edges를 그대로 반환, React Flow 스타일만 보충
 */
function flowDataToGraphV2(fd) {
  const nodes = (fd.nodes || []).map(n => ({
    id: n.id,
    type: n.type,
    position: n.position || { x: X_CENTER, y: 0 },
    data: { ...n.data },
  }))

  const edges = (fd.edges || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || undefined,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94A3B8', strokeWidth: 2 },
  }))

  // nodeCounter를 기존 노드 중 최대치 이상으로 세팅 (중복 ID 방지)
  const maxNum = nodes.reduce((max, n) => {
    const m = n.id.match(/-(\d+)$/)
    return m ? Math.max(max, parseInt(m[1], 10)) : max
  }, nodeCounter)
  nodeCounter = maxNum + 1

  if (nodes.length === 0) return getDefaultGraph()
  return { nodes, edges }
}

/**
 * v1 레거시 변환 — 기존 고정 슬롯 구조를 그래프로 재구성
 */
function flowDataToGraphV1(fd) {
  if (!fd.trigger && !fd.commentReply) {
    return getDefaultGraph()
  }

  const nodes = []
  const edges = []
  let y = 0
  let prevNodeId = null

  // 1. 트리거 노드
  const triggerId = 'trigger-1'
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x: X_CENTER, y },
    data: {
      triggerType: fd.trigger?.type || 'comment',
      keywords: Array.isArray(fd.trigger?.keywords)
        ? fd.trigger.keywords.join(', ')
        : (fd.trigger?.keywords || ''),
      excludeKeywords: Array.isArray(fd.trigger?.excludeKeywords)
        ? fd.trigger.excludeKeywords.join(', ')
        : (fd.trigger?.excludeKeywords || ''),
      keywordMatch: fd.trigger?.matchType || 'CONTAINS',
      postTarget: fd.trigger?.postTarget || 'any',
    },
  })
  prevNodeId = triggerId
  y += Y_SPACING

  // 2. 댓글 답장
  if (fd.commentReply?.enabled) {
    const id = 'commentReply-1'
    nodes.push({
      id, type: 'commentReply', position: { x: X_CENTER, y },
      data: { replies: fd.commentReply.replies || [''], replyDelay: fd.commentReply.replyDelay ?? 0 },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 3. 오프닝 DM
  if (fd.openingDm?.enabled) {
    const id = 'message-opening'
    nodes.push({
      id, type: 'message', position: { x: X_CENTER, y },
      data: { role: 'opening', message: fd.openingDm.message || '', buttonText: fd.openingDm.buttonText || '' },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 4. 팔로우 체크
  if (fd.requirements?.followCheck?.enabled) {
    const id = 'condition-follow'
    nodes.push({
      id, type: 'condition', position: { x: X_CENTER, y },
      data: { conditionType: 'followCheck', message: fd.requirements.followCheck.message || '' },
    })
    edges.push(makeEdge(prevNodeId, id, 'pass'))
    prevNodeId = id
    y += Y_SPACING
  }

  // 5. 이메일 수집
  if (fd.requirements?.emailCollection?.enabled) {
    const id = 'condition-email'
    nodes.push({
      id, type: 'condition', position: { x: X_CENTER, y },
      data: { conditionType: 'emailCheck', message: fd.requirements.emailCollection.message || '' },
    })
    edges.push(makeEdge(prevNodeId, id, 'pass'))
    prevNodeId = id
    y += Y_SPACING
  }

  // 5-1. 고급 조건들
  ;(fd.conditions || []).forEach((cond, i) => {
    if (!cond.enabled) return
    const id = `condition-adv-${i}`
    nodes.push({
      id, type: 'condition', position: { x: X_CENTER, y },
      data: {
        conditionType: cond.type,
        ...(cond.type === 'tagCheck' && { tagName: cond.tagName || '' }),
        ...(cond.type === 'customField' && { fieldName: cond.fieldName || '', operator: cond.operator || 'equals', fieldValue: cond.fieldValue || '' }),
        ...(cond.type === 'timeRange' && { startHour: cond.startHour ?? 9, endHour: cond.endHour ?? 18, activeDays: cond.activeDays || [0,1,2,3,4,5,6] }),
        ...(cond.type === 'random' && { probability: cond.probability ?? 50 }),
      },
    })
    edges.push(makeEdge(prevNodeId, id, 'pass'))
    prevNodeId = id
    y += Y_SPACING
  })

  // 6. 메인 DM
  const mainId = 'message-main'
  nodes.push({
    id: mainId, type: 'message', position: { x: X_CENTER, y },
    data: {
      role: 'main',
      message: fd.mainDm?.message || '',
      links: (fd.mainDm?.links || []).map(l => ({ label: l.text || '', url: l.url || '' })),
    },
  })
  edges.push(makeEdge(prevNodeId, mainId, prevNodeId.startsWith('condition') ? 'pass' : undefined))
  prevNodeId = mainId
  y += Y_SPACING

  // 7. 액션
  ;(fd.actions || []).forEach((act, i) => {
    const id = `action-${i + 1}`
    nodes.push({
      id, type: 'action', position: { x: X_CENTER, y },
      data: { actionType: act.actionType || 'addTag', value: act.value || '' },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  })

  // 8. 웹훅
  ;(fd.webhooks || []).forEach((wh, i) => {
    const id = `webhook-${i + 1}`
    nodes.push({
      id, type: 'webhook', position: { x: X_CENTER, y },
      data: { method: wh.method || 'POST', url: wh.url || '', headers: wh.headers || '{}', body: wh.body || '' },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  })

  // 9. 인벤토리
  if (fd.inventory?.enabled) {
    const id = 'inventory-1'
    nodes.push({
      id, type: 'inventory', position: { x: X_CENTER, y },
      data: { groupBuyId: fd.inventory.groupBuyId || null, soldOutMessage: fd.inventory.soldOutMessage || '죄송합니다, 이 상품은 매진되었습니다. 😢' },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 10. 캐러셀
  if (fd.carousel?.enabled) {
    const id = 'carousel-1'
    nodes.push({ id, type: 'carousel', position: { x: X_CENTER, y }, data: { cards: fd.carousel.cards || [] } })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 11. A/B 테스트
  if (fd.abtest?.enabled) {
    const id = 'abtest-1'
    nodes.push({
      id, type: 'abtest', position: { x: X_CENTER, y },
      data: { testName: fd.abtest.testName || '', variantA: fd.abtest.variantA ?? 50 },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 12. AI 자동 응답
  if (fd.aiResponse?.enabled) {
    const id = 'aiResponse-1'
    nodes.push({
      id, type: 'aiResponse', position: { x: X_CENTER, y },
      data: {
        mode: fd.aiResponse.mode || 'faq', faqItems: fd.aiResponse.faqItems || [],
        brandTone: fd.aiResponse.brandTone || { style: 'friendly', emoji: true, formality: 3 },
        fallbackAction: fd.aiResponse.fallbackAction || 'default_message',
        fallbackMessage: fd.aiResponse.fallbackMessage || '', maxTokens: fd.aiResponse.maxTokens || 200,
        contextWindow: fd.aiResponse.contextWindow || 3,
      },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 13. 카카오
  if (fd.kakao?.enabled) {
    const id = 'kakao-1'
    nodes.push({
      id, type: 'kakao', position: { x: X_CENTER, y },
      data: { kakaoType: fd.kakao.kakaoType || 'alimtalk', templateCode: fd.kakao.templateCode || '', message: fd.kakao.message || '', imageUrl: fd.kakao.imageUrl || '', buttons: fd.kakao.buttons || [] },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 14. 옵트인
  if (fd.optIn?.enabled) {
    const id = 'optIn-1'
    nodes.push({
      id, type: 'optIn', position: { x: X_CENTER, y },
      data: { topic: fd.optIn.topic || 'general', topicLabel: fd.optIn.topicLabel || '소식 알림', message: fd.optIn.message || '새 소식을 받아보시겠어요?', frequency: fd.optIn.frequency || 'WEEKLY' },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 15. 팔로업 (delay + message)
  if (fd.followUp?.enabled) {
    const unitMap = { '분': 'minutes', '시간': 'hours', '일': 'days' }
    const delayId = 'delay-1'
    nodes.push({
      id: delayId, type: 'delay', position: { x: X_CENTER, y },
      data: { delay: fd.followUp.delay || 30, unit: unitMap[fd.followUp.unit] || 'minutes' },
    })
    edges.push(makeEdge(prevNodeId, delayId))
    prevNodeId = delayId
    y += Y_SPACING

    const followUpId = 'message-followup'
    nodes.push({
      id: followUpId, type: 'message', position: { x: X_CENTER, y },
      data: { role: 'followup', message: fd.followUp.message || '' },
    })
    edges.push(makeEdge(delayId, followUpId))
    y += Y_SPACING
  }

  return { nodes, edges }
}

/* ═══════════════════════════════════════════
 *  graphToFlowData — React Flow → 백엔드 JSON (v2)
 * ═══════════════════════════════════════════ */

/**
 * v2: 그래프를 있는 그대로 저장. position + sourceHandle 완전 보존.
 */
export function graphToFlowData(nodes, edges) {
  return {
    version: 2,
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type,
      data: { ...n.data },
      position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
    })),
  }
}

/* ═══════════════════════════════════════════
 *  그래프 검증 — 저장 전 호출
 * ═══════════════════════════════════════════ */

/**
 * 그래프 유효성 검사. 문제 발견 시 { valid: false, errors: [...] } 반환.
 */
export function validateGraph(nodes, edges) {
  const errors = []
  const nodeIds = new Set(nodes.map(n => n.id))

  // 1. 트리거 노드 반드시 1개
  const triggers = nodes.filter(n => n.type === 'trigger')
  if (triggers.length === 0) {
    errors.push('트리거 노드가 없습니다. 플로우에는 반드시 트리거가 필요합니다.')
  } else if (triggers.length > 1) {
    errors.push('트리거 노드가 2개 이상입니다. 플로우에는 트리거가 1개만 있어야 합니다.')
  }

  // 2. 모든 edge의 source/target이 존재하는 노드를 가리키는지
  edges.forEach(e => {
    if (!nodeIds.has(e.source)) {
      errors.push(`엣지 "${e.id}"의 출발 노드 "${e.source}"가 존재하지 않습니다.`)
    }
    if (!nodeIds.has(e.target)) {
      errors.push(`엣지 "${e.id}"의 도착 노드 "${e.target}"가 존재하지 않습니다.`)
    }
  })

  // 3. 순환 감지 (DFS)
  const adj = {}
  edges.forEach(e => {
    if (!adj[e.source]) adj[e.source] = []
    adj[e.source].push(e.target)
  })
  const visited = new Set()
  const inStack = new Set()
  let hasCycle = false

  function dfs(nodeId) {
    if (hasCycle) return
    if (inStack.has(nodeId)) { hasCycle = true; return }
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    inStack.add(nodeId)
    ;(adj[nodeId] || []).forEach(next => dfs(next))
    inStack.delete(nodeId)
  }

  nodeIds.forEach(id => {
    if (!visited.has(id)) dfs(id)
  })
  if (hasCycle) {
    errors.push('플로우에 순환(무한 루프)이 감지되었습니다. 순환 경로를 제거해 주세요.')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 활성화 전용 심화 검증.
 * 저장은 가능하지만, 활성화(자동화 수행)하려면 이 검증을 통과해야 한다.
 * 반환: { valid, errors: string[], warnings: string[] }
 */
export function validateForActivation(nodes, edges) {
  // 먼저 기본 검증
  const base = validateGraph(nodes, edges)
  const errors = [...base.errors]
  const warnings = []

  if (!base.valid) {
    return { valid: false, errors, warnings }
  }

  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const edgeBySource = new Map()
  edges.forEach(e => {
    if (!edgeBySource.has(e.source)) edgeBySource.set(e.source, [])
    edgeBySource.get(e.source).push(e)
  })
  const inDegree = new Map(nodes.map(n => [n.id, 0]))
  edges.forEach(e => inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1))

  const triggerNode = nodes.find(n => n.type === 'trigger')

  // 1. 트리거에서 연결된 노드가 최소 1개
  if (triggerNode) {
    const triggerOuts = edgeBySource.get(triggerNode.id) || []
    if (triggerOuts.length === 0) {
      errors.push('트리거 노드에 연결된 다음 노드가 없습니다.')
    }
  }

  // 2. 고아 노드 감지 (트리거에서 도달 불가능한 노드)
  const reachable = new Set()
  if (triggerNode) {
    const queue = [triggerNode.id]
    while (queue.length > 0) {
      const cur = queue.shift()
      if (reachable.has(cur)) continue
      reachable.add(cur)
      ;(edgeBySource.get(cur) || []).forEach(e => queue.push(e.target))
    }
  }
  const orphans = nodes.filter(n => n.type !== 'trigger' && !reachable.has(n.id))
  if (orphans.length > 0) {
    const orphanLabels = orphans.map(n => {
      const labels = {
        message: '메시지', condition: '조건', action: '액션', delay: '딜레이',
        webhook: '웹훅', carousel: '캐러셀', abtest: 'A/B 테스트', commentReply: '댓글 답장',
        aiResponse: 'AI 응답', kakao: '카카오', optIn: '알림 구독', inventory: '재고 확인',
      }
      return labels[n.type] || n.type
    })
    errors.push(`연결되지 않은 노드 ${orphans.length}개: ${orphanLabels.join(', ')}. 트리거에서 도달할 수 없는 노드는 실행되지 않습니다.`)
  }

  // 3. 분기 노드(condition, abtest, webhook) 출력 엣지 검사
  const branchingTypes = { condition: true, abtest: true, webhook: true }
  nodes.forEach(n => {
    if (!branchingTypes[n.type]) return
    const outs = edgeBySource.get(n.id) || []
    if (outs.length === 0) {
      const label = n.type === 'condition'
        ? { followCheck: '팔로우 확인', emailCheck: '이메일 수집', tagCheck: '태그 확인', timeRange: '시간 조건', customField: '필드 조건', random: '랜덤 분기' }[n.data?.conditionType] || '조건'
        : n.type === 'abtest' ? 'A/B 테스트' : '웹훅'
      errors.push(`"${label}" 노드에 연결된 분기가 없습니다. 최소 하나의 분기를 연결해 주세요.`)
    }
  })

  // 4. 메시지 노드 내용 비어있는지 확인
  nodes.forEach(n => {
    if (n.type === 'message' && reachable.has(n.id)) {
      const msg = n.data?.message || ''
      if (!msg.trim()) {
        const roleLabel = { opening: '오프닝 DM', main: '메인 DM', followup: '팔로업 DM' }[n.data?.role] || '메시지'
        warnings.push(`"${roleLabel}" 노드의 메시지가 비어있습니다.`)
      }
    }
  })

  // 5. 트리거 키워드 비어있는지
  if (triggerNode) {
    const kw = triggerNode.data?.keywords || ''
    if (!kw.trim()) {
      errors.push('트리거 키워드가 설정되지 않았습니다.')
    }
  }

  // 6. 웹훅 URL 비어있는지
  nodes.forEach(n => {
    if (n.type === 'webhook' && reachable.has(n.id)) {
      if (!(n.data?.url || '').trim()) {
        errors.push('웹훅 노드의 URL이 설정되지 않았습니다.')
      }
    }
  })

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * v2 데이터에서 triggerType 추출 (FlowBuilderPage에서 사용)
 */
export function extractTriggerType(flowData) {
  if (flowData.version === 2) {
    const triggerNode = (flowData.nodes || []).find(n => n.type === 'trigger')
    return (triggerNode?.data?.triggerType || 'comment').toUpperCase()
  }
  return (flowData.trigger?.type || 'comment').toUpperCase()
}

/**
 * 기본 그래프 (새 플로우)
 */
export function getDefaultGraph() {
  return {
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: X_CENTER, y: 0 },
        data: {
          triggerType: 'comment',
          keywords: '',
          excludeKeywords: '',
          keywordMatch: 'CONTAINS',
          postTarget: 'any',
        },
      },
      {
        id: 'message-opening',
        type: 'message',
        position: { x: X_CENTER, y: Y_SPACING },
        data: {
          role: 'opening',
          message: '안녕하세요! 요청하신 정보를 보내드릴게요.',
          buttonText: '링크 받기',
        },
      },
      {
        id: 'message-main',
        type: 'message',
        position: { x: X_CENTER, y: Y_SPACING * 2 },
        data: {
          role: 'main',
          message: '요청하신 링크입니다!',
          links: [{ label: '', url: '' }],
        },
      },
    ],
    edges: [
      makeEdge('trigger-1', 'message-opening'),
      makeEdge('message-opening', 'message-main'),
    ],
  }
}

/**
 * 노드 추가 팔레트 아이템 목록
 */
export const NODE_PALETTE = [
  { type: 'commentReply', label: '댓글 답장', icon: 'ri-chat-smile-2-line', color: '#06B6D4',
    defaultData: { replies: ['댓글 감사합니다! DM으로 링크를 보내드릴게요 :)'] } },
  { type: 'message', label: '오프닝 DM', icon: 'ri-message-3-line', color: '#3B82F6',
    defaultData: { role: 'opening', message: '', buttonText: '링크 받기' } },
  { type: 'condition', label: '팔로우 확인', icon: 'ri-user-follow-line', color: '#8B5CF6',
    defaultData: { conditionType: 'followCheck', message: '팔로우 후 다시 시도해 주세요', retryOnFail: true, retryButton: '확인했어요' } },
  { type: 'condition', label: '이메일 수집', icon: 'ri-mail-line', color: '#8B5CF6',
    defaultData: { conditionType: 'emailCheck', message: '이메일 주소를 입력해 주세요' } },
  { type: 'condition', label: '태그 확인', icon: 'ri-price-tag-3-line', color: '#8B5CF6',
    defaultData: { conditionType: 'tagCheck', tagName: '' } },
  { type: 'condition', label: '필드 조건', icon: 'ri-database-2-line', color: '#8B5CF6',
    defaultData: { conditionType: 'customField', fieldName: '', operator: 'equals', fieldValue: '' } },
  { type: 'condition', label: '시간 조건', icon: 'ri-time-line', color: '#8B5CF6',
    defaultData: { conditionType: 'timeRange', startHour: 9, endHour: 18, activeDays: [0,1,2,3,4,5,6] } },
  { type: 'condition', label: '랜덤 분기', icon: 'ri-dice-line', color: '#8B5CF6',
    defaultData: { conditionType: 'random', probability: 50 } },
  { type: 'message', label: '메인 DM', icon: 'ri-link', color: '#10B981',
    defaultData: { role: 'main', message: '', links: [{ label: '', url: '' }] } },
  { type: 'delay', label: '대기', icon: 'ri-time-line', color: '#F59E0B',
    defaultData: { delay: 30, unit: 'minutes' } },
  { type: 'message', label: '팔로업 DM', icon: 'ri-time-line', color: '#F59E0B',
    defaultData: { role: 'followup', message: '' } },
  { type: 'action', label: '액션', icon: 'ri-lightning-line', color: '#10B981',
    defaultData: { actionType: 'addTag', value: '' } },
  { type: 'webhook', label: '웹훅', icon: 'ri-webhook-line', color: '#6366F1',
    defaultData: { method: 'POST', url: '', headers: '{}', body: '' } },
  { type: 'carousel', label: '캐러셀', icon: 'ri-gallery-line', color: '#EC4899',
    defaultData: { cards: [{ title: '', subtitle: '', imageUrl: '', buttonText: '', buttonUrl: '' }] } },
  { type: 'abtest', label: 'A/B 테스트', icon: 'ri-split-cells-horizontal', color: '#F97316',
    defaultData: { testName: '', variantA: 50 } },
  { type: 'inventory', label: '재고 확인', icon: 'ri-shopping-bag-line', color: '#EF4444',
    defaultData: { groupBuyId: null, soldOutMessage: '죄송합니다, 이 상품은 매진되었습니다. 😢' } },
  { type: 'optIn', label: '알림 구독', icon: 'ri-notification-3-line', color: '#8B5CF6',
    defaultData: { topic: 'general', topicLabel: '소식 알림', message: '새 소식을 받아보시겠어요?', frequency: 'WEEKLY' } },
  { type: 'kakao', label: '카카오 알림톡', icon: 'ri-kakao-talk-fill', color: '#FEE500',
    defaultData: { kakaoType: 'alimtalk', templateCode: '', message: '', imageUrl: '' }, comingSoon: true },
  { type: 'aiResponse', label: 'AI 자동 응답', icon: 'ri-robot-line', color: '#0EA5E9',
    defaultData: {
      mode: 'faq',
      faqItems: [{ keyword: '', answer: '' }],
      brandTone: { style: 'friendly', emoji: true, formality: 3 },
      fallbackAction: 'default_message',
      fallbackMessage: '죄송합니다. 해당 문의는 상담원이 확인 후 답변 드리겠습니다.',
      maxTokens: 200,
      contextWindow: 3,
    } },
]

/* ── 유틸리티 ── */

function makeEdge(sourceId, targetId, sourceHandle) {
  return {
    id: `e-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    sourceHandle: sourceHandle || undefined,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94A3B8', strokeWidth: 2 },
  }
}

let nodeCounter = 100

export function generateNodeId(type) {
  nodeCounter++
  return `${type}-${nodeCounter}`
}
