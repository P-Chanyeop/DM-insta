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

  // 5-1. 고급 조건들 (즉시 평가형)
  const advConditions = fd.conditions || []
  advConditions.forEach((cond, i) => {
    if (!cond.enabled) return
    const id = `condition-adv-${i}`
    nodes.push({
      id,
      type: 'condition',
      position: { x: X_CENTER, y },
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

  // 7. 액션 노드들
  if (fd.actions?.length > 0) {
    fd.actions.forEach((act, i) => {
      const id = `action-${i + 1}`
      nodes.push({
        id,
        type: 'action',
        position: { x: X_CENTER, y },
        data: {
          actionType: act.actionType || 'addTag',
          value: act.value || '',
        },
      })
      edges.push(makeEdge(prevNodeId, id))
      prevNodeId = id
      y += Y_SPACING
    })
  }

  // 8. 웹훅 노드들
  if (fd.webhooks?.length > 0) {
    fd.webhooks.forEach((wh, i) => {
      const id = `webhook-${i + 1}`
      nodes.push({
        id,
        type: 'webhook',
        position: { x: X_CENTER, y },
        data: {
          method: wh.method || 'POST',
          url: wh.url || '',
          headers: wh.headers || '{}',
          body: wh.body || '',
        },
      })
      edges.push(makeEdge(prevNodeId, id))
      prevNodeId = id
      y += Y_SPACING
    })
  }

  // 9. 재고 확인(인벤토리) 노드
  if (fd.inventory?.enabled) {
    const id = 'inventory-1'
    nodes.push({
      id,
      type: 'inventory',
      position: { x: X_CENTER, y },
      data: {
        groupBuyId: fd.inventory.groupBuyId || null,
        soldOutMessage: fd.inventory.soldOutMessage || '죄송합니다, 이 상품은 매진되었습니다. 😢',
      },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 10. 캐러셀 노드
  if (fd.carousel?.enabled) {
    const id = 'carousel-1'
    nodes.push({
      id,
      type: 'carousel',
      position: { x: X_CENTER, y },
      data: {
        cards: fd.carousel.cards || [],
      },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 10. A/B 테스트 노드
  if (fd.abtest?.enabled) {
    const id = 'abtest-1'
    nodes.push({
      id,
      type: 'abtest',
      position: { x: X_CENTER, y },
      data: {
        testName: fd.abtest.testName || '',
        variantA: fd.abtest.variantA ?? 50,
      },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 11. AI 자동 응답 노드
  if (fd.aiResponse?.enabled) {
    const id = 'aiResponse-1'
    nodes.push({
      id,
      type: 'aiResponse',
      position: { x: X_CENTER, y },
      data: {
        mode: fd.aiResponse.mode || 'faq',
        faqItems: fd.aiResponse.faqItems || [],
        brandTone: fd.aiResponse.brandTone || { style: 'friendly', emoji: true, formality: 3 },
        fallbackAction: fd.aiResponse.fallbackAction || 'default_message',
        fallbackMessage: fd.aiResponse.fallbackMessage || '',
        maxTokens: fd.aiResponse.maxTokens || 200,
        contextWindow: fd.aiResponse.contextWindow || 3,
      },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 12-1. 옵트인(Recurring Notification) 노드
  if (fd.optIn?.enabled) {
    const id = 'optIn-1'
    nodes.push({
      id,
      type: 'optIn',
      position: { x: X_CENTER, y },
      data: {
        topic: fd.optIn.topic || 'general',
        topicLabel: fd.optIn.topicLabel || '소식 알림',
        message: fd.optIn.message || '새 소식을 받아보시겠어요?',
        frequency: fd.optIn.frequency || 'WEEKLY',
      },
    })
    edges.push(makeEdge(prevNodeId, id))
    prevNodeId = id
    y += Y_SPACING
  }

  // 13. 팔로업
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
  const advConditionNodes = nodes.filter(n => n.type === 'condition' && !['followCheck', 'emailCheck'].includes(n.data.conditionType))
  const mainNode = nodes.find(n => n.type === 'message' && n.data.role === 'main')
  const delayNode = nodes.find(n => n.type === 'delay')
  const followUpNode = nodes.find(n => n.type === 'message' && n.data.role === 'followup')
  const actionNodes = nodes.filter(n => n.type === 'action')
  const webhookNodes = nodes.filter(n => n.type === 'webhook')
  const inventoryNode = nodes.find(n => n.type === 'inventory')
  const carouselNode = nodes.find(n => n.type === 'carousel')
  const abtestNode = nodes.find(n => n.type === 'abtest')
  const aiResponseNode = nodes.find(n => n.type === 'aiResponse')
  const optInNode = nodes.find(n => n.type === 'optIn')

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
      replyDelay: commentReplyNode?.data.replyDelay ?? 0,
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
    conditions: advConditionNodes.map(n => ({
      enabled: true,
      type: n.data.conditionType,
      ...(n.data.conditionType === 'tagCheck' && { tagName: n.data.tagName || '' }),
      ...(n.data.conditionType === 'customField' && {
        fieldName: n.data.fieldName || '',
        operator: n.data.operator || 'equals',
        fieldValue: n.data.fieldValue || '',
      }),
      ...(n.data.conditionType === 'timeRange' && {
        startHour: n.data.startHour ?? 9,
        endHour: n.data.endHour ?? 18,
        activeDays: n.data.activeDays || [0,1,2,3,4,5,6],
      }),
      ...(n.data.conditionType === 'random' && { probability: n.data.probability ?? 50 }),
    })),
    mainDm: {
      message: mainNode?.data.message || '',
      links: (mainNode?.data.links || []).filter(l => l.url).map(l => ({ text: l.label || '', url: l.url })),
    },
    actions: actionNodes.map(n => ({
      actionType: n.data.actionType || 'addTag',
      value: n.data.value || '',
    })),
    webhooks: webhookNodes.map(n => ({
      method: n.data.method || 'POST',
      url: n.data.url || '',
      headers: n.data.headers || '{}',
      body: n.data.body || '',
    })),
    inventory: {
      enabled: !!inventoryNode,
      groupBuyId: inventoryNode?.data.groupBuyId || null,
      soldOutMessage: inventoryNode?.data.soldOutMessage || '죄송합니다, 이 상품은 매진되었습니다. 😢',
    },
    carousel: {
      enabled: !!carouselNode,
      cards: carouselNode?.data.cards || [],
    },
    abtest: {
      enabled: !!abtestNode,
      testName: abtestNode?.data.testName || '',
      variantA: abtestNode?.data.variantA ?? 50,
    },
    aiResponse: {
      enabled: !!aiResponseNode,
      mode: aiResponseNode?.data.mode || 'faq',
      faqItems: aiResponseNode?.data.faqItems || [],
      brandTone: aiResponseNode?.data.brandTone || { style: 'friendly', emoji: true, formality: 3 },
      fallbackAction: aiResponseNode?.data.fallbackAction || 'default_message',
      fallbackMessage: aiResponseNode?.data.fallbackMessage || '',
      maxTokens: aiResponseNode?.data.maxTokens || 200,
      contextWindow: aiResponseNode?.data.contextWindow || 3,
    },
    optIn: {
      enabled: !!optInNode,
      topic: optInNode?.data.topic || 'general',
      topicLabel: optInNode?.data.topicLabel || '소식 알림',
      message: optInNode?.data.message || '새 소식을 받아보시겠어요?',
      frequency: optInNode?.data.frequency || 'WEEKLY',
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
