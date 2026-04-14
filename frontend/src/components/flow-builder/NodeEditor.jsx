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
        {node.type === 'action' && <ActionEditor data={data} update={update} />}
        {node.type === 'webhook' && <WebhookEditor data={data} update={update} />}
        {node.type === 'carousel' && <CarouselEditor data={data} update={update} />}
        {node.type === 'abtest' && <ABTestEditor data={data} update={update} />}
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
    action: '액션 설정',
    webhook: '웹훅 설정',
    carousel: '캐러셀 설정',
    abtest: 'A/B 테스트 설정',
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
  const replyDelay = data.replyDelay ?? 0 // 0 = 즉시, 그 외 = 최대 초

  const insertVar = (i, token) => {
    const arr = [...replies]
    arr[i] = arr[i] + token
    update({ replies: arr })
  }

  return (
    <>
      <div className="ne-field">
        <label>답장 메시지 (최대 5개, 랜덤 발송)</label>
        {replies.map((reply, i) => (
          <div key={i} className="ne-field-row">
            <span className="ne-field-num">{i + 1}</span>
            <input className="ne-input" value={reply}
              placeholder="예: @{이름} DM 보내드렸어요! 확인해주세요 ✨"
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
        {replies.length < 5 && (
          <button className="ne-add-btn" onClick={() => update({ replies: [...replies, ''] })}>
            + 답장 추가
          </button>
        )}
        <div className="ne-hint">
          <i className="ri-magic-line" style={{ marginRight: 4 }} />
          3개 이상 등록하면 스팸 플래그를 방지하고 자연스러운 답글을 제공합니다
        </div>
        <div className="ne-hint">변수: {'{이름}'}, {'{username}'}, {'{키워드}'}</div>
      </div>

      <div className="ne-field">
        <label>답장 딜레이</label>
        <div className="ne-field-row" style={{ alignItems: 'center', gap: 8 }}>
          <select className="ne-select" value={replyDelay}
            onChange={e => update({ replyDelay: Number(e.target.value) })} style={{ flex: 1 }}>
            <option value={0}>즉시 답장</option>
            <option value={5}>1~5초 랜덤</option>
            <option value={15}>5~15초 랜덤</option>
            <option value={30}>10~30초 랜덤</option>
            <option value={60}>30~60초 랜덤</option>
          </select>
        </div>
        <div className="ne-hint">딜레이를 추가하면 봇 의심을 방지하고 더 자연스럽게 답글이 달립니다</div>
      </div>
    </>
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
          {links.map((link, i) => {
            const urlInvalid = link.url && !/^https?:\/\/.+/.test(link.url)
            return (
              <div key={i}>
                <div className="ne-link-row">
                  <input className="ne-input" placeholder="버튼 텍스트" value={link.label}
                    onChange={e => {
                      const arr = [...links]; arr[i] = { ...arr[i], label: e.target.value }; update({ links: arr })
                    }} style={{ flex: '0 0 120px' }} />
                  <input className={`ne-input${urlInvalid ? ' input-error' : ''}`} placeholder="https://..." value={link.url}
                    onChange={e => {
                      const arr = [...links]; arr[i] = { ...arr[i], url: e.target.value }; update({ links: arr })
                    }} />
                  {links.length > 1 && (
                    <button className="ne-remove-btn" onClick={() => update({ links: links.filter((_, j) => j !== i) })}>
                      <i className="ri-close-line" />
                    </button>
                  )}
                </div>
                {urlInvalid && <div className="ne-field-error">URL은 http:// 또는 https://로 시작해야 합니다</div>}
              </div>
            )
          })}
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

/* ── 액션 편집기 ── */
function ActionEditor({ data, update }) {
  return (
    <>
      <div className="ne-field">
        <label>액션 유형</label>
        <div className="ne-trigger-cards">
          {[
            { value: 'addTag', icon: 'ri-price-tag-3-line', label: '태그 추가', color: '#10B981' },
            { value: 'removeTag', icon: 'ri-price-tag-3-line', label: '태그 제거', color: '#EF4444' },
            { value: 'setVariable', icon: 'ri-braces-line', label: '변수 설정', color: '#8B5CF6' },
            { value: 'addNote', icon: 'ri-sticky-note-line', label: '노트 추가', color: '#F59E0B' },
            { value: 'subscribe', icon: 'ri-user-add-line', label: '구독 처리', color: '#3B82F6' },
            { value: 'unsubscribe', icon: 'ri-user-unfollow-line', label: '구독 해제', color: '#6B7280' },
          ].map(a => (
            <button
              key={a.value}
              className={`ne-trigger-card ${data.actionType === a.value ? 'active' : ''}`}
              onClick={() => update({ actionType: a.value })}
            >
              <i className={a.icon} style={{ color: a.color }} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="ne-field">
        <label>
          {data.actionType === 'addTag' || data.actionType === 'removeTag' ? '태그명' :
           data.actionType === 'setVariable' ? '변수명 = 값 (예: vip=true)' :
           data.actionType === 'addNote' ? '노트 내용' : '설명 (선택)'}
        </label>
        <input className="ne-input"
          value={data.value || ''}
          onChange={e => update({ value: e.target.value })}
          placeholder={
            data.actionType === 'addTag' ? '예: VIP, 관심고객' :
            data.actionType === 'removeTag' ? '예: 신규' :
            data.actionType === 'setVariable' ? '예: score=100' :
            data.actionType === 'addNote' ? '예: 상담 요청 고객' : ''
          }
        />
      </div>
    </>
  )
}

/* ── 웹훅 편집기 ── */
function WebhookEditor({ data, update }) {
  return (
    <>
      <div className="ne-field">
        <label>HTTP 메서드</label>
        <select className="ne-select" value={data.method || 'POST'}
          onChange={e => update({ method: e.target.value })}>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div className="ne-field">
        <label>URL</label>
        <input className="ne-input" value={data.url || ''}
          onChange={e => update({ url: e.target.value })}
          placeholder="https://api.example.com/webhook" />
      </div>
      <div className="ne-field">
        <label>헤더 (JSON)</label>
        <textarea className="ne-textarea" rows={3}
          value={data.headers || '{}'}
          onChange={e => update({ headers: e.target.value })}
          placeholder='{"Authorization": "Bearer xxx"}' />
        <div className="ne-hint">JSON 형식으로 입력하세요</div>
      </div>
      <div className="ne-field">
        <label>요청 본문</label>
        <textarea className="ne-textarea" rows={4}
          value={data.body || ''}
          onChange={e => update({ body: e.target.value })}
          placeholder={'{"user": "{username}", "email": "{이메일}"}'} />
        <div className="ne-hint">변수를 사용할 수 있습니다: {'{이름}'}, {'{username}'}, {'{이메일}'}</div>
      </div>
    </>
  )
}

/* ── 캐러셀 편집기 ── */
function CarouselEditor({ data, update }) {
  const cards = data.cards || [{ title: '', subtitle: '', imageUrl: '', buttonText: '', buttonUrl: '' }]

  const updateCard = (i, patch) => {
    const arr = [...cards]
    arr[i] = { ...arr[i], ...patch }
    update({ cards: arr })
  }

  return (
    <div className="ne-field">
      <label>카드 목록 (최대 10장, 좌우 스와이프)</label>
      {cards.map((card, i) => (
        <div key={i} className="ne-card-block">
          <div className="ne-card-block-header">
            <span>카드 {i + 1}</span>
            {cards.length > 1 && (
              <button className="ne-remove-btn" onClick={() => update({ cards: cards.filter((_, j) => j !== i) })}>
                <i className="ri-close-line" />
              </button>
            )}
          </div>
          <input className="ne-input" placeholder="제목"
            value={card.title || ''} onChange={e => updateCard(i, { title: e.target.value })} />
          <input className="ne-input" placeholder="부제목 (선택)"
            value={card.subtitle || ''} onChange={e => updateCard(i, { subtitle: e.target.value })} />
          <input className="ne-input" placeholder="이미지 URL"
            value={card.imageUrl || ''} onChange={e => updateCard(i, { imageUrl: e.target.value })} />
          <div className="ne-link-row">
            <input className="ne-input" placeholder="버튼 텍스트"
              value={card.buttonText || ''} onChange={e => updateCard(i, { buttonText: e.target.value })}
              style={{ flex: '0 0 120px' }} />
            <input className="ne-input" placeholder="버튼 URL"
              value={card.buttonUrl || ''} onChange={e => updateCard(i, { buttonUrl: e.target.value })} />
          </div>
        </div>
      ))}
      {cards.length < 10 && (
        <button className="ne-add-btn" onClick={() => update({
          cards: [...cards, { title: '', subtitle: '', imageUrl: '', buttonText: '', buttonUrl: '' }]
        })}>
          + 카드 추가
        </button>
      )}
    </div>
  )
}

/* ── A/B 테스트 편집기 ── */
function ABTestEditor({ data, update }) {
  const variantA = data.variantA ?? 50
  const variantB = 100 - variantA

  return (
    <>
      <div className="ne-field">
        <label>테스트 이름</label>
        <input className="ne-input" value={data.testName || ''}
          onChange={e => update({ testName: e.target.value })}
          placeholder="예: 오프닝 메시지 비교" />
      </div>
      <div className="ne-field">
        <label>트래픽 배분</label>
        <div className="ne-abtest-slider">
          <input type="range" min={10} max={90} step={5}
            value={variantA}
            onChange={e => update({ variantA: Number(e.target.value) })} />
          <div className="ne-abtest-labels">
            <span className="ne-abtest-a">A: {variantA}%</span>
            <span className="ne-abtest-b">B: {variantB}%</span>
          </div>
        </div>
        <div className="ne-hint">A와 B 경로로 트래픽을 분배합니다. 각 경로에 다른 메시지 노드를 연결하세요.</div>
      </div>
      <div className="ne-info-box">
        <i className="ri-information-line" />
        <span>A/B 테스트 노드의 두 출력 핸들(A, B)에 각각 다른 노드를 연결하면 트래픽이 설정 비율로 분기됩니다.</span>
      </div>
    </>
  )
}
