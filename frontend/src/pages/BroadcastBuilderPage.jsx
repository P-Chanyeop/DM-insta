import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useConfirm, useUnsavedChanges } from '../components/ConfirmDialog'
import { broadcastService } from '../api/services'

/* ── 세그먼트 조건 타입 ── */
const CONDITION_TYPES = [
  { value: 'tag', label: '태그', icon: 'ri-price-tag-3-line', description: '특정 태그가 있는 연락처' },
  { value: 'subscribed_days', label: '가입 기간', icon: 'ri-calendar-check-line', description: '가입한 지 N일 이내/이상' },
  { value: 'active', label: '활동 상태', icon: 'ri-user-heart-line', description: '활성/비활성 연락처' },
  { value: 'last_interaction', label: '마지막 대화', icon: 'ri-chat-check-line', description: 'N일 이내 대화한 연락처' },
]

const OPERATORS = {
  tag: [
    { value: 'contains', label: '포함' },
    { value: 'not_contains', label: '미포함' },
  ],
  subscribed_days: [
    { value: 'less_than', label: '이내' },
    { value: 'greater_than', label: '이상' },
  ],
  active: [
    { value: 'is', label: '상태' },
  ],
  last_interaction: [
    { value: 'within', label: '이내' },
    { value: 'not_within', label: '없음 (기간)' },
  ],
}

function defaultCondition() {
  return { type: 'tag', operator: 'contains', value: '' }
}

function conditionSummary(cond) {
  const t = CONDITION_TYPES.find(c => c.value === cond.type)
  if (!t) return '조건'
  if (cond.type === 'tag') return `태그 ${cond.operator === 'contains' ? '포함' : '미포함'}: ${cond.value || '...'}`
  if (cond.type === 'subscribed_days') return `가입 ${cond.value || '?'}일 ${cond.operator === 'less_than' ? '이내' : '이상'}`
  if (cond.type === 'active') return `${cond.value === 'true' ? '활성' : '비활성'} 연락처`
  if (cond.type === 'last_interaction') return `${cond.value || '?'}일 ${cond.operator === 'within' ? '이내 대화' : '이내 대화 없음'}`
  return t.label
}

/* ── 세그먼트 빌더 ── */
function SegmentBuilder({ segmentType, conditions, onSegmentTypeChange, onConditionsChange }) {
  const addCondition = () => onConditionsChange([...conditions, defaultCondition()])
  const removeCondition = (i) => onConditionsChange(conditions.filter((_, idx) => idx !== i))
  const updateCondition = (i, patch) => onConditionsChange(conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c))

  return (
    <div className="bc-segment-builder">
      <div className="fb-field">
        <label>대상 선택</label>
        <div className="sb-type-cards">
          <button className={`sb-type-card${segmentType === 'ALL' ? ' active' : ''}`}
            style={{ '--type-color': '#3B82F6' }} onClick={() => onSegmentTypeChange('ALL')}>
            <i className="ri-group-line" /><span>전체 구독자</span>
          </button>
          <button className={`sb-type-card${segmentType === 'CUSTOM' ? ' active' : ''}`}
            style={{ '--type-color': '#8B5CF6' }} onClick={() => onSegmentTypeChange('CUSTOM')}>
            <i className="ri-filter-3-line" /><span>조건 필터</span>
          </button>
        </div>
      </div>

      {segmentType === 'CUSTOM' && (
        <div className="bc-conditions">
          {conditions.length === 0 && (
            <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic', padding: '8px 0' }}>
              조건을 추가하여 대상을 필터링하세요
            </div>
          )}
          {conditions.map((cond, i) => (
            <div key={i} className="bc-condition-row">
              {i > 0 && <div className="bc-condition-logic">AND</div>}
              <div className="bc-condition-card">
                <select className="fb-select" value={cond.type}
                  onChange={e => updateCondition(i, { type: e.target.value, operator: OPERATORS[e.target.value]?.[0]?.value || '', value: '' })}>
                  {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select className="fb-select" value={cond.operator}
                  onChange={e => updateCondition(i, { operator: e.target.value })}>
                  {(OPERATORS[cond.type] || []).map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                {cond.type === 'active' ? (
                  <select className="fb-select" value={cond.value}
                    onChange={e => updateCondition(i, { value: e.target.value })}>
                    <option value="true">활성</option>
                    <option value="false">비활성</option>
                  </select>
                ) : (
                  <input className="fb-input" value={cond.value}
                    onChange={e => updateCondition(i, { value: e.target.value })}
                    placeholder={cond.type === 'tag' ? '태그 이름' : '일 수'} />
                )}
                <button className="sb-step-act-btn delete" onClick={() => removeCondition(i)}>
                  <i className="ri-close-line" />
                </button>
              </div>
            </div>
          ))}
          <button className="fb-add-btn" onClick={addCondition}>
            <i className="ri-add-line" /> 조건 추가
          </button>
        </div>
      )}

      {segmentType === 'CUSTOM' && conditions.length > 0 && (
        <div className="bc-segment-summary">
          <i className="ri-filter-3-line" />
          <span>{conditions.map(conditionSummary).join(' AND ')}</span>
        </div>
      )}
    </div>
  )
}

/* ── DM 미리보기 ── */
function BroadcastPreview({ messageContent, segmentType, conditions }) {
  const segmentLabel = segmentType === 'ALL'
    ? '전체 구독자'
    : conditions.length > 0 ? conditions.map(conditionSummary).join(', ') : '필터 없음'

  return (
    <div className="ig-phone" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
      <div className="ig-phone-notch" />
      <div className="ig-screen">
        <div className="ig-header">
          <i className="ri-arrow-left-s-line" />
          <div className="ig-header-avatar">
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #FCAF45, #FD1D1D, #833AB4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>S</div>
          </div>
          <div className="ig-header-info"><strong>my_business</strong><span>Instagram</span></div>
        </div>
        <div className="ig-chat">
          <div className="ig-chat-notice"><i className="ri-broadcast-line" /> 브로드캐스트 메시지</div>
          <div style={{ padding: '4px 12px' }}>
            <div style={{ fontSize: 10, color: '#8E8E8E', marginBottom: 4 }}>
              <i className="ri-group-line" style={{ marginRight: 3 }} />{segmentLabel}
            </div>
          </div>
          {messageContent ? (
            <div className="ig-msg-row received">
              <div className="ig-avatar-small">S</div>
              <div className="ig-bubble-received">
                <div className="ig-bubble-text" style={{ whiteSpace: 'pre-wrap' }}>{messageContent}</div>
              </div>
            </div>
          ) : (
            <div className="ig-empty-hint"><p>메시지를 입력하면 미리보기가 표시됩니다</p></div>
          )}
        </div>
        <div className="ig-input-bar">
          <div className="ig-input-camera"><i className="ri-camera-line" /></div>
          <div className="ig-input-field">메시지 보내기...</div>
          <div className="ig-input-icons"><i className="ri-mic-line" /><i className="ri-image-line" /></div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════ */
/*          브로드캐스트 빌더 페이지            */
/* ══════════════════════════════════════════ */
export default function BroadcastBuilderPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [segmentType, setSegmentType] = useState('ALL')
  const [conditions, setConditions] = useState([])
  const [scheduleType, setScheduleType] = useState('immediate')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // 변경 감지
  useEffect(() => { setHasChanges(true) }, [name, messageContent, segmentType, conditions, scheduleType, scheduledDate, scheduledTime])

  // 브라우저 새로고침/탭 닫기 시 미저장 경고
  useUnsavedChanges(hasChanges && (name.trim() || messageContent.trim()))

  const handleCancel = async () => {
    if (hasChanges && (name.trim() || messageContent.trim())) {
      const ok = await confirm({
        title: '변경 사항 저장 안 됨',
        message: '저장하지 않은 변경 사항이 있습니다. 저장하지 않고 나가시겠습니까?',
        confirmText: '나가기',
        cancelText: '계속 편집',
        variant: 'danger',
        icon: 'ri-error-warning-line',
      })
      if (!ok) return
    }
    navigate('/app/broadcast')
  }

  const handleSend = async () => {
    if (!name.trim()) { setError('브로드캐스트 이름을 입력하세요'); return }
    if (!messageContent.trim()) { setError('메시지 내용을 입력하세요'); return }
    if (scheduleType === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      setError('예약 날짜와 시간을 선택하세요'); return
    }
    setSending(true)
    setError('')
    try {
      const segment = segmentType === 'ALL' ? 'ALL' : JSON.stringify({ logic: 'AND', conditions })
      const scheduledAt = scheduleType === 'scheduled' ? `${scheduledDate}T${scheduledTime}` : null
      await broadcastService.create({ name: name.trim(), messageContent: messageContent.trim(), segment, scheduledAt })
      setHasChanges(false)
      toast.success(scheduleType === 'immediate' ? '브로드캐스트가 발송되었습니다!' : '브로드캐스트가 예약되었습니다!')
      navigate('/app/broadcast')
    } catch (err) {
      setError(err.message || '발송에 실패했습니다')
    } finally {
      setSending(false)
    }
  }

  // 최소 날짜: 오늘
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flow-builder-page">
      {/* 헤더 */}
      <div className="fb-header">
        <div className="fb-header-left">
          <button onClick={handleCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280', display: 'flex', alignItems: 'center' }}>
            <i className="ri-arrow-left-line" />
          </button>
          <input className="fb-title-input" value={name} onChange={e => setName(e.target.value)} placeholder="브로드캐스트 이름" />
          <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#EDE9FE', color: '#7C3AED' }}>
            <i className="ri-broadcast-line" style={{ marginRight: 3 }} />새 브로드캐스트
          </span>
        </div>
        <div className="fb-header-right">
          {error && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}><i className="ri-error-warning-line" /> {error}</span>}
          <button className="btn-secondary" onClick={handleCancel}>취소</button>
          <button className="btn-primary" onClick={handleSend} disabled={sending}>
            {sending
              ? <><i className="ri-loader-4-line spin" /> 처리 중...</>
              : scheduleType === 'immediate'
                ? <><i className="ri-send-plane-line" /> 발송하기</>
                : <><i className="ri-calendar-check-line" /> 예약하기</>}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="fb-body">
        {/* 좌측: 설정 */}
        <div className="fb-wizard" style={{ maxWidth: 520 }}>
          {/* 1. 메시지 */}
          <div className="fb-section">
            <div className="fb-section-header" style={{ cursor: 'default' }}>
              <div className="fb-section-num" style={{ background: '#DBEAFE', color: '#2563EB' }}>1</div>
              <div className="fb-section-info">
                <h3><i className="ri-message-3-line" /> 메시지 작성</h3>
                <p>구독자에게 보낼 DM 내용을 작성하세요</p>
              </div>
            </div>
            <div className="fb-section-body">
              <div className="fb-field">
                <label>메시지 내용</label>
                <textarea className="fb-textarea" rows={6} value={messageContent}
                  onChange={e => setMessageContent(e.target.value)}
                  placeholder={'안녕하세요! 특별한 소식을 전해드립니다.\n\n변수: {{username}}, {{name}}'} />
                <div className="fb-field-hint"><i className="ri-information-line" /> 변수: {'{{username}}'}, {'{{name}}'} 사용 가능 · 글자 수: {messageContent.length}</div>
              </div>
            </div>
          </div>

          {/* 2. 대상 세그먼트 */}
          <div className="fb-section">
            <div className="fb-section-header" style={{ cursor: 'default' }}>
              <div className="fb-section-num" style={{ background: '#EDE9FE', color: '#7C3AED' }}>2</div>
              <div className="fb-section-info">
                <h3><i className="ri-group-line" /> 대상 선택</h3>
                <p>메시지를 받을 구독자를 선택하세요</p>
              </div>
            </div>
            <div className="fb-section-body">
              <SegmentBuilder
                segmentType={segmentType}
                conditions={conditions}
                onSegmentTypeChange={setSegmentType}
                onConditionsChange={setConditions}
              />
            </div>
          </div>

          {/* 3. 발송 시점 */}
          <div className="fb-section">
            <div className="fb-section-header" style={{ cursor: 'default' }}>
              <div className="fb-section-num" style={{ background: '#FEF3C7', color: '#D97706' }}>3</div>
              <div className="fb-section-info">
                <h3><i className="ri-time-line" /> 발송 시점</h3>
                <p>즉시 발송하거나 예약할 수 있습니다</p>
              </div>
            </div>
            <div className="fb-section-body">
              <div className="fb-field">
                <div className="bc-schedule-cards">
                  <button className={`bc-schedule-card${scheduleType === 'immediate' ? ' active' : ''}`}
                    onClick={() => setScheduleType('immediate')}>
                    <i className="ri-send-plane-line" />
                    <div>
                      <strong>즉시 발송</strong>
                      <span>지금 바로 발송합니다</span>
                    </div>
                  </button>
                  <button className={`bc-schedule-card${scheduleType === 'scheduled' ? ' active' : ''}`}
                    onClick={() => setScheduleType('scheduled')}>
                    <i className="ri-calendar-schedule-line" />
                    <div>
                      <strong>예약 발송</strong>
                      <span>지정한 시간에 발송합니다</span>
                    </div>
                  </button>
                </div>
              </div>

              {scheduleType === 'scheduled' && (
                <div className="bc-schedule-picker">
                  <div className="fb-field" style={{ flex: 1 }}>
                    <label>날짜</label>
                    <input type="date" className="fb-input" value={scheduledDate} min={today}
                      onChange={e => setScheduledDate(e.target.value)} />
                  </div>
                  <div className="fb-field" style={{ flex: 1 }}>
                    <label>시간</label>
                    <input type="time" className="fb-input" value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)} />
                  </div>
                </div>
              )}

              {scheduleType === 'scheduled' && scheduledDate && scheduledTime && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  background: '#FEF3C7', borderRadius: 10, fontSize: 13, color: '#92400E', marginTop: 8,
                }}>
                  <i className="ri-calendar-check-line" style={{ fontSize: 16 }} />
                  {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true,
                  })}에 발송됩니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측: DM 미리보기 */}
        <div className="ig-preview-wrap">
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
            <i className="ri-smartphone-line" style={{ marginRight: 4 }} />DM 미리보기
          </h4>
          <BroadcastPreview
            messageContent={messageContent}
            segmentType={segmentType}
            conditions={conditions}
          />
        </div>
      </div>
    </div>
  )
}
