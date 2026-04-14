/* ────────────────────────────────────────────
 *  React Flow 노드/엣지 ↔ 백엔드 flowData JSON 변환
 *
 *  백엔드 flowData 형식:
 *  {
 *    trigger: { type, keywords, excludeKeywords, matchType, postTarget },
 *    commentReply: { enabled, replies },
 *    openingDm: { enabled, message, buttonText },
 *    requirements: {
 *      followCheck: { enabled, message },
 *      emailCollection: { enabled, message }
 *    },
 *    mainDm: { message, links },
 *    followUp: { enabled, delay, unit, message }
 *  }
 * ──────────────────────────────────────────── */

const Y_SPACING = 160
const X_CENTER = 300

/**
 * 백엔드 flowData JSON → React Flow 노드/엣지 변환
 */
export function flowDataToGraph(fd) {
  if (!fd || (!fd.trigger && !fd.commentReply)) {
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
      keywords: (fd.trigger?.keywords || []).join(', '),
      excludeKeywords: (fd.trigger?.excludeKeywords || []).join(', '),
      keywordMatch: fd.trigger?.matchType || 'CONTAINS',
      postTarget: fd.trigger?.postTarget || 'any',
    },
  })
  prevNodeId = triggerId
  y += Y_SPACING

  // 2. 댓글 답장 (comment 트리거 + enabled)
  if (fd.commentReply?.enabled) {
    const id = 'commentReply-1'
    nodes.push({
      id,
      type: 'commentReply',
      position: { x: X_CENTER, y },
      data: { replies: fd.commentReply.replies || [''] },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 3. 오프닝 DM
  if (fd.openingDm?.enabled) {
    const id = 'message-opening'
    nodes.push({
      id,
      type: 'message',
      position: { x: X_CENTER, y },
      data: {
        role: 'opening',
        message: fd.openingDm.message || '',
        buttonText: fd.openingDm.buttonText || '',
      },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 4. 팔로우 체크
  if (fd.requirements?.followCheck?.enabled) {
    const id = 'condition-follow'
    nodes.push({
      id,
      type: 'condition',
      position: { x: X_CENTER, y },
      data: {
        conditionType: 'followCheck',
        message: fd.requirements.followCheck.message || '',
      },
    })
    edges.push(makeEdge(prevNodeId, id, 'pass'))
    prevNodeId = id
    y += Y_SPACING
  }

  // 5. 이메일 수집
  if (fd.requirements?.emailCollection?.enabled) {
    const id = 'condition-email'
    nodes.push({
      id,
      type: 'condition',
      position: { x: X_CENTER, y },
      data: {
        conditionType: 'emailCheck',
        message: fd.requirements.emailCollection.message || '',
      },
    })
    edges.push(makeEdge(prevNodeId, id, 'pass'))
    prevNodeId = id
    y += Y_SPACING
  }

  // 6. 메인 DM
  const mainId = 'message-main'
  nodes.push({
    id: mainId,
    type: 'message',
    position: { x: X_CENTER, y },
    data: {
      role: 'main',
      message: fd.mainDm?.message || '',
      links: (fd.mainDm?.links || []).map(l => ({ label: l.text || '', url: l.url || '' })),
    },
  })
  edges.push(makeEdge(prevNodeId, mainId, prevNodeId.startsWith('condition') ? 'pass' : undefined))
  prevNodeId = mainId
  y += Y_SPACING

  // 7. 팔로업
  if (fd.followUp?.enabled) {
    const unitMap = { '분': 'minutes', '시간': 'hours', '일': 'days' }
    const delayId = 'delay-1'
    nodes.push({
      id: delayId,
      type: 'delay',
      position: { x: X_CENTER, y },
      data: {
        delay: fd.followUp.delay || 30,
        unit: unitMap[fd.followUp.unit] || 'minutes',
      },
    })
    edges.push(makeEdge(prevNodeId, delayId))
    prevNodeId = delayId
    y += Y_SPACING

    const followUpId = 'message-followup'
    nodes.push({
      id: followUpId,
      type: 'message',
      position: { x: X_CENTER, y },
      data: {
        role: 'followup',
        message: fd.followUp.message || '',
      },
    })
    edges.push(makeEdge(delayId, followUpId))
    y += Y_SPACING
  }

  return { nodes, edges }
}

/**
 * React Flow 노드/엣지 → 백엔드 flowData JSON 변환
 */
export function graphToFlowData(nodes, edges) {
  const delayUnitMap = { minutes: '분', hours: '시간', days: '일' }

  const triggerNode = nodes.find(n => n.type === 'trigger')
  const commentReplyNode = nodes.find(n => n.type === 'commentReply')
  const openingNode = nodes.find(n => n.type === 'message' && n.data.role === 'opening')
  const followCheckNode = nodes.find(n => n.type === 'condition' && n.data.conditionType === 'followCheck')
  const emailCheckNode = nodes.find(n => n.type === 'condition' && n.data.conditionType === 'emailCheck')
  const mainNode = nodes.find(n => n.type === 'message' && n.data.role === 'main')
  const delayNode = nodes.find(n => n.type === 'delay')
  const followUpNode = nodes.find(n => n.type === 'message' && n.data.role === 'followup')

  const td = triggerNode?.data || {}

  return {
    trigger: {
      type: td.triggerType || 'comment',
      keywords: td.keywords ? td.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      excludeKeywords: td.excludeKeywords ? td.excludeKeywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      matchType: td.keywordMatch || 'CONTAINS',
      postTarget: td.postTarget || 'any',
    },
    commentReply: {
      enabled: !!commentReplyNode,
      replies: commentReplyNode?.data.replies || [],
    },
    openingDm: {
      enabled: !!openingNode,
      message: openingNode?.data.message || '',
      buttonText: openingNode?.data.buttonText || '',
    },
    requirements: {
      followCheck: {
        enabled: !!followCheckNode,
        message: followCheckNode?.data.message || '',
      },
      emailCollection: {
        enabled: !!emailCheckNode,
        message: emailCheckNode?.data.message || '',
      },
    },
    mainDm: {
      message: mainNode?.data.message || '',
      links: (mainNode?.data.links || []).filter(l => l.url).map(l => ({ text: l.label || '', url: l.url })),
    },
    followUp: {
      enabled: !!followUpNode,
      delay: delayNode?.data.delay || 30,
      unit: delayUnitMap[delayNode?.data.unit] || '분',
      message: followUpNode?.data.message || '',
    },
  }
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
    defaultData: { conditionType: 'followCheck', message: '팔로우 후 다시 시도해 주세요' } },
  { type: 'condition', label: '이메일 수집', icon: 'ri-mail-line', color: '#8B5CF6',
    defaultData: { conditionType: 'emailCheck', message: '이메일 주소를 입력해 주세요' } },
  { type: 'message', label: '메인 DM', icon: 'ri-link', color: '#10B981',
    defaultData: { role: 'main', message: '', links: [{ label: '', url: '' }] } },
  { type: 'delay', label: '대기', icon: 'ri-time-line', color: '#F59E0B',
    defaultData: { delay: 30, unit: 'minutes' } },
  { type: 'message', label: '팔로업 DM', icon: 'ri-time-line', color: '#F59E0B',
    defaultData: { role: 'followup', message: '' } },
  { type: '_payment', label: '결제 연동', icon: 'ri-bank-card-line', color: '#10B981',
    comingSoon: true },
  { type: '_ai', label: 'AI 자동 응답', icon: 'ri-robot-line', color: '#06B6D4',
    comingSoon: true },
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
