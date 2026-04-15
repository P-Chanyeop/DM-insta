import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

/* ────────────────────────────────────────────
 *  ManyChat-style 커스텀 노드 컴포넌트들
 *  각 노드는 캔버스에 표시되는 카드 형태
 * ──────────────────────────────────────────── */

const nodeColors = {
  trigger: '#EF4444',
  commentReply: '#06B6D4',
  message: '#3B82F6',
  condition: '#8B5CF6',
  action: '#10B981',
  delay: '#F59E0B',
  webhook: '#6366F1',
  carousel: '#EC4899',
  abtest: '#F97316',
  aiResponse: '#0EA5E9',
  inventory: '#EF4444',
  optIn: '#8B5CF6',
}

/* ── 트리거 노드 ── */
export const TriggerNode = memo(({ data, selected }) => {
  const triggerLabels = {
    comment: '게시물/릴스 댓글',
    keyword: 'DM 키워드',
    story_mention: '스토리 멘션',
    story_reply: '스토리 답장',
    welcome: '환영 메시지',
  }
  const triggerIcons = {
    comment: 'ri-chat-3-line',
    keyword: 'ri-chat-1-line',
    story_mention: 'ri-camera-line',
    story_reply: 'ri-reply-line',
    welcome: 'ri-hand-heart-line',
  }

  return (
    <div className={`flow-node trigger-node ${selected ? 'selected' : ''}`}>
      <div className="flow-node-header" style={{ background: nodeColors.trigger }}>
        <i className={triggerIcons[data.triggerType] || 'ri-flashlight-line'} />
        <span>트리거</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-label">{triggerLabels[data.triggerType] || '트리거 선택'}</div>
        {data.keywords && (
          <div className="flow-node-detail">
            <i className="ri-key-2-line" /> {data.keywords}
          </div>
        )}
        {data.postTarget && data.triggerType === 'comment' && (
          <div className="flow-node-detail">
            <i className="ri-image-line" /> {data.postTarget === 'any' ? '모든 게시물' : data.postTarget === 'next' ? '다음 게시물' : '특정 게시물'}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  )
})
TriggerNode.displayName = 'TriggerNode'

/* ── 댓글 답장 노드 ── */
export const CommentReplyNode = memo(({ data, selected }) => (
  <div className={`flow-node comment-reply-node ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Top} className="flow-handle" />
    <div className="flow-node-header" style={{ background: nodeColors.commentReply }}>
      <i className="ri-chat-smile-2-line" />
      <span>공개 댓글 답장</span>
    </div>
    <div className="flow-node-body">
      {data.replies?.[0] ? (
        <div className="flow-node-preview">"{data.replies[0].slice(0, 40)}{data.replies[0].length > 40 ? '...' : ''}"</div>
      ) : (
        <div className="flow-node-placeholder">답장 메시지를 설정하세요</div>
      )}
      {data.replies?.length > 1 && (
        <div className="flow-node-detail">+{data.replies.length - 1}개 랜덤 답장</div>
      )}
    </div>
    <Handle type="source" position={Position.Bottom} className="flow-handle" />
  </div>
))
CommentReplyNode.displayName = 'CommentReplyNode'

/* ── 메시지 노드 (DM 발송) ── */
export const MessageNode = memo(({ data, selected }) => {
  const roleLabels = {
    opening: '오프닝 DM',
    main: '메인 DM',
    followup: '팔로업 DM',
  }
  const roleIcons = {
    opening: 'ri-message-3-line',
    main: 'ri-link',
    followup: 'ri-time-line',
  }
  const roleColors = {
    opening: '#3B82F6',
    main: '#10B981',
    followup: '#F59E0B',
  }

  return (
    <div className={`flow-node message-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: roleColors[data.role] || nodeColors.message }}>
        <i className={roleIcons[data.role] || 'ri-message-3-line'} />
        <span>{roleLabels[data.role] || 'DM 메시지'}</span>
      </div>
      <div className="flow-node-body">
        {data.message ? (
          <div className="flow-node-preview">"{data.message.slice(0, 50)}{data.message.length > 50 ? '...' : ''}"</div>
        ) : (
          <div className="flow-node-placeholder">메시지를 입력하세요</div>
        )}
        {data.buttonText && (
          <div className="flow-node-button-preview">
            <i className="ri-cursor-line" /> {data.buttonText}
          </div>
        )}
        {data.links?.filter(l => l.url)?.length > 0 && (
          <div className="flow-node-detail">
            <i className="ri-link" /> {data.links.filter(l => l.url).length}개 링크
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  )
})
MessageNode.displayName = 'MessageNode'

/* ── 조건 노드 (팔로우 체크 등) ── */
export const ConditionNode = memo(({ data, selected }) => {
  const condLabels = {
    followCheck: '팔로우 확인',
    emailCheck: '이메일 수집',
    tagCheck: '태그 확인',
    customField: '필드 조건',
    timeRange: '시간 조건',
    random: '랜덤 분기',
  }
  const condIcons = {
    followCheck: 'ri-user-follow-line',
    emailCheck: 'ri-mail-line',
    tagCheck: 'ri-price-tag-3-line',
    customField: 'ri-database-2-line',
    timeRange: 'ri-time-line',
    random: 'ri-dice-line',
  }

  const renderDetail = () => {
    const ct = data.conditionType
    if (ct === 'tagCheck' && data.tagName) return <div className="flow-node-detail"><i className="ri-price-tag-3-line" /> {data.tagName}</div>
    if (ct === 'customField' && data.fieldName) return <div className="flow-node-detail"><i className="ri-database-2-line" /> {data.fieldName} {data.operator || '='} {data.fieldValue || '?'}</div>
    if (ct === 'timeRange') return <div className="flow-node-detail"><i className="ri-time-line" /> {data.startHour ?? 9}시~{data.endHour ?? 18}시</div>
    if (ct === 'random') return <div className="flow-node-detail"><i className="ri-dice-line" /> {data.probability ?? 50}% 확률</div>
    if (data.message) return <div className="flow-node-preview">"{data.message.slice(0, 40)}{data.message.length > 40 ? '...' : ''}"</div>
    return <div className="flow-node-placeholder">조건을 설정하세요</div>
  }

  return (
    <div className={`flow-node condition-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: nodeColors.condition }}>
        <i className={condIcons[data.conditionType] || 'ri-question-line'} />
        <span>{condLabels[data.conditionType] || '조건'}</span>
      </div>
      <div className="flow-node-body">
        {renderDetail()}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="pass"
        className="flow-handle flow-handle-pass"
        style={{ left: '35%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="fail"
        className="flow-handle flow-handle-fail"
        style={{ left: '65%' }}
      />
      <div className="flow-node-handle-labels">
        <span className="pass-label">통과</span>
        <span className="fail-label">실패</span>
      </div>
    </div>
  )
})
ConditionNode.displayName = 'ConditionNode'

/* ── 딜레이 노드 ── */
export const DelayNode = memo(({ data, selected }) => {
  const unitLabels = { minutes: '분', hours: '시간', days: '일' }
  return (
    <div className={`flow-node delay-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: nodeColors.delay }}>
        <i className="ri-time-line" />
        <span>대기</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-delay-value">
          {data.delay || 30}{unitLabels[data.unit] || '분'} 후 진행
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  )
})
DelayNode.displayName = 'DelayNode'

/* ── 액션 노드 (태그, 변수, 노트 등) ── */
export const ActionNode = memo(({ data, selected }) => {
  const actionLabels = {
    addTag: '태그 추가',
    removeTag: '태그 제거',
    setVariable: '변수 설정',
    addNote: '노트 추가',
    subscribe: '구독 처리',
    unsubscribe: '구독 해제',
  }
  const actionIcons = {
    addTag: 'ri-price-tag-3-line',
    removeTag: 'ri-price-tag-3-line',
    setVariable: 'ri-braces-line',
    addNote: 'ri-sticky-note-line',
    subscribe: 'ri-user-add-line',
    unsubscribe: 'ri-user-unfollow-line',
  }

  return (
    <div className={`flow-node action-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: nodeColors.action }}>
        <i className={actionIcons[data.actionType] || 'ri-lightning-line'} />
        <span>액션</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-label">{actionLabels[data.actionType] || '액션 선택'}</div>
        {data.value && (
          <div className="flow-node-detail">
            <i className="ri-arrow-right-s-line" /> {data.value}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  )
})
ActionNode.displayName = 'ActionNode'

/* ── 웹훅 노드 (외부 API 호출) ── */
export const WebhookNode = memo(({ data, selected }) => (
  <div className={`flow-node webhook-node ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Top} className="flow-handle" />
    <div className="flow-node-header" style={{ background: nodeColors.webhook }}>
      <i className="ri-webhook-line" />
      <span>웹훅</span>
    </div>
    <div className="flow-node-body">
      <div className="flow-node-label">{data.method || 'POST'} 요청</div>
      {data.url ? (
        <div className="flow-node-detail">
          <i className="ri-link" /> {data.url.length > 35 ? data.url.slice(0, 35) + '...' : data.url}
        </div>
      ) : (
        <div className="flow-node-placeholder">URL을 설정하세요</div>
      )}
    </div>
    <Handle type="source" position={Position.Bottom} className="flow-handle" />
  </div>
))
WebhookNode.displayName = 'WebhookNode'

/* ── 캐러셀 노드 (이미지 카드 슬라이더) ── */
export const CarouselNode = memo(({ data, selected }) => {
  const cards = data.cards || []
  return (
    <div className={`flow-node carousel-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: nodeColors.carousel }}>
        <i className="ri-gallery-line" />
        <span>캐러셀</span>
      </div>
      <div className="flow-node-body">
        {cards.length > 0 ? (
          <>
            <div className="flow-node-preview">"{cards[0].title || '제목 없음'}"</div>
            {cards.length > 1 && (
              <div className="flow-node-detail">
                <i className="ri-stack-line" /> 총 {cards.length}장의 카드
              </div>
            )}
          </>
        ) : (
          <div className="flow-node-placeholder">카드를 추가하세요</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  )
})
CarouselNode.displayName = 'CarouselNode'

/* ── A/B 테스트 노드 (트래픽 분기) ── */
export const ABTestNode = memo(({ data, selected }) => {
  const variantA = data.variantA ?? 50
  const variantB = 100 - variantA

  return (
    <div className={`flow-node abtest-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: nodeColors.abtest }}>
        <i className="ri-split-cells-horizontal" />
        <span>A/B 테스트</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-abtest-bars">
          <div className="flow-node-abtest-bar a" style={{ flex: variantA }}>A {variantA}%</div>
          <div className="flow-node-abtest-bar b" style={{ flex: variantB }}>B {variantB}%</div>
        </div>
        {data.testName && (
          <div className="flow-node-detail" style={{ marginTop: 4 }}>
            <i className="ri-test-tube-line" /> {data.testName}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        className="flow-handle flow-handle-pass"
        style={{ left: '35%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        className="flow-handle flow-handle-fail"
        style={{ left: '65%' }}
      />
      <div className="flow-node-handle-labels">
        <span className="pass-label">A</span>
        <span className="fail-label">B</span>
      </div>
    </div>
  )
})
ABTestNode.displayName = 'ABTestNode'

/* ── AI 자동 응답 노드 ── */
export const AIResponseNode = memo(({ data, selected }) => {
  const modeLabels = { faq: 'FAQ 자동 응답', smart: '스마트 AI 응답' }
  const modeIcons = { faq: 'ri-questionnaire-line', smart: 'ri-robot-line' }
  const toneLabels = { friendly: '친근한', professional: '전문적', casual: '캐주얼' }
  const faqCount = (data.faqItems || []).filter(f => f.keyword && f.answer).length

  return (
    <div className={`flow-node ai-response-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: nodeColors.aiResponse }}>
        <i className={modeIcons[data.mode] || 'ri-robot-line'} />
        <span>AI 응답</span>
        <span className="flow-node-ai-badge">{data.mode === 'faq' ? 'FAQ' : 'GPT'}</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-label">{modeLabels[data.mode] || 'AI 응답'}</div>
        {data.mode === 'faq' && faqCount > 0 && (
          <div className="flow-node-detail">
            <i className="ri-list-check-2" /> {faqCount}개 FAQ 항목
          </div>
        )}
        {data.mode === 'smart' && (
          <div className="flow-node-detail">
            <i className="ri-palette-line" /> {toneLabels[data.brandTone?.style] || '친근한'} 톤
          </div>
        )}
        {data.mode === 'faq' && faqCount === 0 && (
          <div className="flow-node-placeholder">FAQ 항목을 추가하세요</div>
        )}
        <div className="flow-node-detail" style={{ marginTop: 4 }}>
          <i className="ri-arrow-go-back-line" /> {data.fallbackAction === 'human_handoff' ? '상담원 전환' : data.fallbackAction === 'retry' ? '재시도 요청' : '기본 메시지'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  )
})
AIResponseNode.displayName = 'AIResponseNode'

/* ── 알림 구독(OptIn) 노드 ── */
export const OptInNode = memo(({ data, selected }) => {
  const freqLabels = { DAILY: '매일', WEEKLY: '매주', MONTHLY: '매월' }
  return (
    <div className={`flow-node optin-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: nodeColors.optIn }}>
        <i className="ri-notification-3-line" />
        <span>알림 구독</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-label">{data.topicLabel || '소식 알림'}</div>
        {data.message && (
          <div className="flow-node-preview">"{data.message.slice(0, 40)}{data.message.length > 40 ? '...' : ''}"</div>
        )}
        <div className="flow-node-detail">
          <i className="ri-time-line" /> {freqLabels[data.frequency] || '매주'} 발송
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </div>
  )
})
OptInNode.displayName = 'OptInNode'

/* ── 재고 확인(인벤토리) 노드 ── */
export const InventoryNode = memo(({ data, selected }) => (
  <div className={`flow-node inventory-node ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Top} className="flow-handle" />
    <div className="flow-node-header" style={{ background: nodeColors.inventory }}>
      <i className="ri-shopping-bag-line" />
      <span>재고 확인</span>
    </div>
    <div className="flow-node-body">
      {data.groupBuyId ? (
        <div className="flow-node-detail">
          <i className="ri-store-2-line" /> 공동구매 #{data.groupBuyId}
        </div>
      ) : (
        <div className="flow-node-placeholder">공동구매를 연결하세요</div>
      )}
      <div className="flow-node-detail" style={{ marginTop: 4 }}>
        <i className="ri-close-circle-line" /> 매진 시 플로우 중단
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="flow-handle" />
  </div>
))
InventoryNode.displayName = 'InventoryNode'

/* ── 노드 타입 등록 맵 ── */
export const nodeTypeMap = {
  trigger: TriggerNode,
  commentReply: CommentReplyNode,
  message: MessageNode,
  condition: ConditionNode,
  delay: DelayNode,
  action: ActionNode,
  webhook: WebhookNode,
  carousel: CarouselNode,
  abtest: ABTestNode,
  aiResponse: AIResponseNode,
  inventory: InventoryNode,
  optIn: OptInNode,
}
