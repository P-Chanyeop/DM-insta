import { useState, useRef } from 'react'
import VariableInserter from './VariableInserter'

/* ────────────────────────────────────────────
 *  노드 속성 편집 사이드바
 *  캔버스에서 노드 클릭 시 오른쪽에 표시
 * ──────────────────────────────────────────── */

export default function NodeEditor({ node, onUpdate, onClose }) {
  if (!node) return null

  const data = node.data
  const update = (patch) => onUpdate(node.id, { ...data, ...patch })

  return (
    <div className="node-editor">
      <div className="node-editor-header">
        <h3>{getNodeTitle(node)}</h3>
        <button className="icon-btn" onClick={onClose}>
          <i className="ri-close-line" />
        </button>
      </div>
      <div className="node-editor-body">
        {node.type === 'trigger' && <TriggerEditor data={data} update={update} />}
        {node.type === 'commentReply' && <CommentReplyEditor data={data} update={update} />}
        {node.type === 'message' && <MessageEditor data={data} update={update} />}
        {node.type === 'condition' && <ConditionEditor data={data} update={update} />}
        {node.type === 'delay' && <DelayEditor data={data} update={update} />}
      </div>
    </div>
  )
}

function getNodeTitle(node) {
  const titles = {
    trigger: '트리거 설정',
    commentReply: '댓글 답장 설정',
    message: node.data.role === 'opening' ? '오프닝 DM 설정' : node.data.role === 'main' ? '메인 DM 설정' : '팔로업 DM 설정',
    condition: node.data.conditionType === 'followCheck' ? '팔로우 확인 설정' : '이메일 수집 설정',
    delay: '대기 시간 설정',
  }
  return titles[node.type] || '설정'
}

/* ── 트리거 편집기 ── */
function TriggerEditor({ data, update }) {
  return (
    <>
      <div className="ne-field">
        <label>트리거 유형</label>
        <div className="ne-trigger-cards">
          {[
            { value: 'comment', icon: 'ri-chat-3-line', label: '게시물/릴스 댓글', color: '#EF4444' },
            { value: 'keyword', icon: 'ri-chat-1-line', label: 'DM 키워드', color: '#F59E0B' },
            { value: 'story_mention', icon: 'ri-camera-line', label: '스토리 멘션', color: '#8B5CF6' },
            { value: 'story_reply', icon: 'ri-reply-line', label: '스토리 답장', color: '#EC4899' },
            { value: 'welcome', icon: 'ri-hand-heart-line', label: '환영 메시지', color: '#10B981' },
          ].map(t => (
            <button
              key={t.value}
              className={`ne-trigger-card ${data.triggerType === t.value ? 'active' : ''}`}
              onClick={() => update({ triggerType: t.value })}
            >
              <i className={t.icon} style={{ color: t.color }} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {data.triggerType === 'comment' && (
        <div className="ne-field">
          <label>게시물 선택</label>
          <div className="ne-radio-group">
            {[
              { value: 'any', label: '모든 게시물/릴스' },
              { value: 'next', label: '다음 게시물/릴스' },
              { value: 'specific', label: '특정 게시물/릴스' },
            ].map(o => (
              <label key={o.value} className="ne-radio">
                <input type="radio" name="postTarget" value={o.value}
                  checked={data.postTarget === o.value}
                  onChange={e => update({ postTarget: e.target.value })} />
                <span className="ne-radio-dot" />
                {o.label}
              </label>
            ))}
          </div>
          {data.postTarget === 'specific' && (
            <input className="ne-input" placeholder="게시물 URL"
              value={data.specificPostUrl || ''} onChange={e => update({ specificPostUrl: e.target.value })} />
          )}
        </div>
      )}

      <div className="ne-field">
        <label>키워드</label>
        <input className="ne-input" placeholder="예: 가격, 예약, 링크 (쉼표로 구분)"
          value={data.keywords || ''} onChange={e => update({ keywords: e.target.value })} />
        <div className="ne-hint">비워두면 모든 {data.triggerType === 'comment' ? '댓글' : '메시지'}에 반응</div>
      </div>

      <div className="ne-field">
        <label>키워드 매칭</label>
        <select className="ne-select" value={data.keywordMatch || 'CONTAINS'}
          onChange={e => update({ keywordMatch: e.target.value })}>
          <option value="CONTAINS">포함</option>
          <option value="EXACT">정확히 일치</option>
          <option value="ANY">모든 댓글</option>
        </select>
      </div>

      <div className="ne-field">
        <label>제외 키워드 (선택)</label>
        <input className="ne-input" placeholder="이 키워드가 포함된 댓글은 무시"
          value={data.excludeKeywords || ''} onChange={e => update({ excludeKeywords: e.target.value })} />
      </div>
    </>
  )
}

/* ── 댓글 답장 편집기 ── */
function CommentReplyEditor({ data, update }) {
  const replies = data.replies || ['']

  const insertVar = (i, token) => {
    const arr = [...replies]
    arr[i] = arr[i] + token
    update({ replies: arr })
  }

  return (
    <div className="ne-field">
      <label>답장 메시지 (최대 3개, 랜덤 발송)</label>
      {replies.map((reply, i) => (
        <div key={i} className="ne-field-row">
          <span className="ne-field-num">{i + 1}</span>
          <input className="ne-input" value={reply}
            placeholder="예: {이름}님 감사합니다! DM 확인해주세요"
            onChange={e => {
              const arr = [...replies]
              arr[i] = e.target.value
              update({ replies: arr })
            }} />
          <button className="ne-var-quick-btn" title="변수 삽입" onClick={() => insertVar(i, '{이름}')}>
            <i className="ri-braces-line" />
          </button>
          {replies.length > 1 && (
            <button className="ne-remove-btn" onClick={() => update({ replies: replies.filter((_, j) => j !== i) })}>
              <i className="ri-close-line" />
            </button>
          )}
        </div>
      ))}
      {replies.length < 3 && (
        <button className="ne-add-btn" onClick={() => update({ replies: [...replies, ''] })}>
          + 답장 추가
        </button>
      )}
      <div className="ne-hint">여러 개 등록하면 랜덤으로 하나가 선택됩니다 · 변수: {'{이름}'}, {'{username}'}, {'{키워드}'}</div>
    </div>
  )
}

/* ── 메시지(DM) 편집기 ── */
function MessageEditor({ data, update }) {
  const links = data.links || [{ label: '', url: '' }]
  const textareaRef = useRef(null)

  return (
    <>
      {data.role === 'opening' && (
        <div className="ne-info-box">
          <i className="ri-information-line" />
          <span>Instagram 정책상, 사용자가 버튼을 탭해야 봇이 추가 메시지를 보낼 수 있습니다.</span>
        </div>
      )}

      <div className="ne-field">
        <div className="ne-field-header">
          <label>메시지</label>
          <VariableInserter
            textareaRef={textareaRef}
            value={data.message || ''}
            onChange={(val) => update({ message: val })}
          />
        </div>
        <textarea className="ne-textarea" rows={4} ref={textareaRef}
          value={data.message || ''} onChange={e => update({ message: e.target.value })}
          placeholder="메시지를 입력하세요&#10;예: {이름}님, 요청하신 정보를 보내드릴게요!" />
      </div>

      {data.role === 'opening' && (
        <div className="ne-field">
          <label>버튼 텍스트</label>
          <input className="ne-input" value={data.buttonText || ''}
            onChange={e => update({ buttonText: e.target.value })} placeholder="링크 받기" />
          <div className="ne-hint">사용자가 이 버튼을 탭하면 다음 단계로 진행</div>
        </div>
      )}

      {data.role === 'main' && (
        <div className="ne-field">
          <label>링크 (최대 3개)</label>
          {links.map((link, i) => (
            <div key={i} className="ne-link-row">
              <input className="ne-input" placeholder="버튼 텍스트" value={link.label}
                onChange={e => {
                  const arr = [...links]; arr[i] = { ...arr[i], label: e.target.value }; update({ links: arr })
                }} style={{ flex: '0 0 120px' }} />
              <input className="ne-input" placeholder="https://..." value={link.url}
                onChange={e => {
                  const arr = [...links]; arr[i] = { ...arr[i], url: e.target.value }; update({ links: arr })
                }} />
              {links.length > 1 && (
                <button className="ne-remove-btn" onClick={() => update({ links: links.filter((_, j) => j !== i) })}>
                  <i className="ri-close-line" />
                </button>
              )}
            </div>
          ))}
          {links.length < 3 && (
            <button className="ne-add-btn" onClick={() => update({ links: [...links, { label: '', url: '' }] })}>
              + 링크 추가
            </button>
          )}
        </div>
      )}
    </>
  )
}

/* ── 조건 편집기 ── */
function ConditionEditor({ data, update }) {
  const textareaRef = useRef(null)

  return (
    <>
      <div className="ne-field">
        <label>조건 유형</label>
        <select className="ne-select" value={data.conditionType || 'followCheck'}
          onChange={e => update({ conditionType: e.target.value })}>
          <option value="followCheck">팔로우 확인</option>
          <option value="emailCheck">이메일 수집</option>
        </select>
      </div>
      <div className="ne-field">
        <div className="ne-field-header">
          <label>{data.conditionType === 'followCheck' ? '미팔로우 시 안내 메시지' : '이메일 요청 메시지'}</label>
          <VariableInserter
            textareaRef={textareaRef}
            value={data.message || ''}
            onChange={(val) => update({ message: val })}
          />
        </div>
        <textarea className="ne-textarea" rows={3} ref={textareaRef}
          value={data.message || ''} onChange={e => update({ message: e.target.value })}
          placeholder={data.conditionType === 'followCheck' ? '팔로우 후 다시 시도해 주세요' : '이메일 주소를 입력해 주세요'} />
      </div>
    </>
  )
}

/* ── 딜레이 편집기 ── */
function DelayEditor({ data, update }) {
  return (
    <div className="ne-field">
      <label>대기 시간</label>
      <div className="ne-delay-row">
        <input type="number" className="ne-input" value={data.delay || 30}
          onChange={e => update({ delay: Number(e.target.value) })} min={1} style={{ width: 80 }} />
        <select className="ne-select" value={data.unit || 'minutes'}
          onChange={e => update({ unit: e.target.value })}>
          <option value="minutes">분</option>
          <option value="hours">시간</option>
          <option value="days">일</option>
        </select>
        <span className="ne-hint" style={{ margin: 0 }}>후 다음 단계 실행</span>
      </div>
    </div>
  )
}
