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
  }

  return (
    <div className={`flow-node condition-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-header" style={{ background: nodeColors.condition }}>
        <i className={data.conditionType === 'followCheck' ? 'ri-user-follow-line' : 'ri-mail-line'} />
        <span>{condLabels[data.conditionType] || '조건'}</span>
      </div>
      <div className="flow-node-body">
        {data.message ? (
          <div className="flow-node-preview">"{data.message.slice(0, 40)}{data.message.length > 40 ? '...' : ''}"</div>
        ) : (
          <div className="flow-node-placeholder">조건 메시지를 설정하세요</div>
        )}
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

/* ── 노드 타입 등록 맵 ── */
export const nodeTypeMap = {
  trigger: TriggerNode,
  commentReply: CommentReplyNode,
  message: MessageNode,
  condition: ConditionNode,
  delay: DelayNode,
}
