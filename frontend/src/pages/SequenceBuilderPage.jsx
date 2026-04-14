import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { sequenceService } from '../api/services'

const STEP_TYPES = [
  { value: 'MESSAGE', label: '메시지', icon: 'ri-message-3-line', color: '#3B82F6' },
  { value: 'DELAY', label: '대기', icon: 'ri-time-line', color: '#F59E0B' },
  { value: 'CONDITION', label: '조건', icon: 'ri-git-branch-line', color: '#8B5CF6' },
  { value: 'TAG', label: '태그', icon: 'ri-price-tag-3-line', color: '#10B981' },
  { value: 'NOTIFY', label: '알림', icon: 'ri-notification-3-line', color: '#EF4444' },
]

const DELAY_PRESETS = [
  { label: '5분', minutes: 5 },
  { label: '30분', minutes: 30 },
  { label: '1시간', minutes: 60 },
  { label: '3시간', minutes: 180 },
  { label: '1일', minutes: 1440 },
  { label: '3일', minutes: 4320 },
  { label: '7일', minutes: 10080 },
]

function formatDelay(minutes) {
  if (minutes < 60) return `${minutes}분`
  if (minutes < 1440) return minutes % 60 === 0 ? `${minutes / 60}시간` : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
  const days = Math.floor(minutes / 1440)
  const rem = minutes % 1440
  if (rem === 0) return `${days}일`
  if (rem < 60) return `${days}일 ${rem}분`
  return `${days}일 ${Math.floor(rem / 60)}시간`
}

function getStepType(type) {
  return STEP_TYPES.find(t => t.value === type) || STEP_TYPES[0]
}

function defaultStep(order) {
  return {
    stepOrder: order,
    name: `단계 ${order}`,
    messageContent: '',
    delayMinutes: order === 1 ? 0 : 60,
    type: 'MESSAGE',
  }
}

/* ──────────────── 단계 편집 패널 ──────────────── */
function StepEditor({ step, index, onChange }) {
  const st = getStepType(step.type)
  const update = (patch) => onChange({ ...step, ...patch })

  return (
    <div className="sb-step-editor">
      <div className="sb-editor-header">
        <div className="sb-editor-icon" style={{ background: `${st.color}15`, color: st.color }}>
          <i className={st.icon} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>단계 {index + 1} 편집</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{st.label}</div>
        </div>
      </div>

      <div className="fb-field">
        <label>단계 이름</label>
        <input className="fb-input" value={step.name} onChange={e => update({ name: e.target.value })} placeholder="예: 환영 메시지" />
      </div>

      <div className="fb-field">
        <label>단계 유형</label>
        <div className="sb-type-cards">
          {STEP_TYPES.map(t => (
            <button key={t.value} className={`sb-type-card${step.type === t.value ? ' active' : ''}`}
              style={{ '--type-color': t.color }} onClick={() => update({ type: t.value })}>
              <i className={t.icon} /><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {index > 0 && (
        <div className="fb-field">
          <label>이전 단계로부터 대기 시간</label>
          <div className="sb-delay-presets">
            {DELAY_PRESETS.map(p => (
              <button key={p.minutes} className={`sb-delay-chip${step.delayMinutes === p.minutes ? ' active' : ''}`}
                onClick={() => update({ delayMinutes: p.minutes })}>{p.label}</button>
            ))}
          </div>
          <div className="sb-delay-custom">
            <input type="number" className="fb-input" value={step.delayMinutes} min={0}
              onChange={e => update({ delayMinutes: Math.max(0, parseInt(e.target.value) || 0) })} style={{ width: 100 }} />
            <span style={{ fontSize: 13, color: '#6B7280' }}>분 = {formatDelay(step.delayMinutes)}</span>
          </div>
        </div>
      )}

      {step.type === 'MESSAGE' && (
        <div className="fb-field">
          <label>메시지 내용</label>
          <textarea className="fb-textarea" rows={5} value={step.messageContent}
            onChange={e => update({ messageContent: e.target.value })}
            placeholder={'DM으로 보낼 메시지를 입력하세요.\n\n변수 사용: {{username}}, {{name}}'} />
          <div className="fb-field-hint"><i className="ri-information-line" /> 변수: {'{{username}}'}, {'{{name}}'} 사용 가능</div>
        </div>
      )}

      {step.type === 'CONDITION' && (
        <div className="fb-field">
          <label>조건 (JSON)</label>
          <textarea className="fb-textarea" rows={4} value={step.messageContent}
            onChange={e => update({ messageContent: e.target.value })}
            placeholder='{"field": "tag", "operator": "contains", "value": "VIP"}' />
          <div className="fb-field-hint">조건이 참이면 다음 단계로, 거짓이면 건너뜁니다</div>
        </div>
      )}

      {step.type === 'TAG' && (
        <div className="fb-field">
          <label>태그 동작</label>
          <input className="fb-input" value={step.messageContent}
            onChange={e => update({ messageContent: e.target.value })} placeholder="예: VIP, 구매완료 (쉼표로 구분)" />
          <div className="fb-field-hint">연락처에 태그를 추가합니다</div>
        </div>
      )}

      {step.type === 'NOTIFY' && (
        <div className="fb-field">
          <label>알림 메시지</label>
          <textarea className="fb-textarea" rows={3} value={step.messageContent}
            onChange={e => update({ messageContent: e.target.value })} placeholder="관리자에게 보낼 알림 내용" />
          <div className="fb-field-hint">이 단계에 도달하면 관리자에게 알림을 보냅니다</div>
        </div>
      )}

      {step.type === 'DELAY' && (
        <div style={{
          display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10,
          background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E',
        }}>
          <i className="ri-time-line" style={{ fontSize: 16, flexShrink: 0 }} />
          <div>이 단계는 지정된 시간만큼 대기한 후 다음 단계로 진행합니다. 위의 대기 시간 설정을 사용하세요.</div>
        </div>
      )}
    </div>
  )
}

/* ──────────────── DM 미리보기 ──────────────── */
function SequencePreview({ steps }) {
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
          {steps.length === 0 && (
            <div className="ig-empty-hint"><p>단계를 추가하면 미리보기가 표시됩니다</p></div>
          )}
          {steps.map((step, i) => {
            const st = getStepType(step.type)
            if (step.type === 'MESSAGE') {
              return (
                <div key={i}>
                  {step.delayMinutes > 0 && i > 0 && (
                    <div className="ig-delay-badge"><i className="ri-time-line" />{formatDelay(step.delayMinutes)} 후</div>
                  )}
                  <div className="ig-step-label"><i className={st.icon} /> {step.name || `단계 ${i + 1}`}</div>
                  <div className="ig-msg-row received">
                    <div className="ig-avatar-small">S</div>
                    <div className="ig-bubble-received">
                      <div className="ig-bubble-text">{step.messageContent || '(메시지 내용을 입력하세요)'}</div>
                    </div>
                  </div>
                </div>
              )
            }
            if (step.type === 'DELAY') {
              return <div key={i} className="ig-delay-badge"><i className="ri-time-line" />{step.delayMinutes > 0 ? `${formatDelay(step.delayMinutes)} 대기` : '대기'}</div>
            }
            if (step.type === 'CONDITION') {
              return <div key={i} className="ig-user-action"><i className="ri-git-branch-line" /> 조건 분기: {step.name || '조건'}</div>
            }
            if (step.type === 'TAG') {
              return <div key={i} className="ig-user-action" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}><i className="ri-price-tag-3-line" /> 태그: {step.messageContent || step.name}</div>
            }
            if (step.type === 'NOTIFY') {
              return <div key={i} className="ig-user-action" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><i className="ri-notification-3-line" /> 관리자 알림</div>
            }
            return null
          })}
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

/* ══════════════════════════════════════════════ */
/*           시퀀스 빌더 페이지 (메인)              */
/* ══════════════════════════════════════════════ */
export default function SequenceBuilderPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()

  const isNew = !id
  const [loading, setLoading] = useState(!!id)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState([defaultStep(1)])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // 기존 시퀀스 로드
  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const seq = await sequenceService.get(id)
        setName(seq.name || '')
        setDescription(seq.description || '')
        if (seq.steps?.length) {
          setSteps(seq.steps.map(s => ({
            stepOrder: s.stepOrder,
            name: s.name || '',
            messageContent: s.messageContent || '',
            delayMinutes: s.delayMinutes ?? 0,
            type: s.type || 'MESSAGE',
          })))
        }
      } catch (err) {
        setError(err.message || '시퀀스를 불러오는 데 실패했습니다')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  // location.state에서 전달된 시퀀스 데이터 사용 (API 호출 불필요한 경우)
  useEffect(() => {
    if (id || !location.state?.sequence) return
    const seq = location.state.sequence
    setName(seq.name || '')
    setDescription(seq.description || '')
    if (seq.steps?.length) {
      setSteps(seq.steps.map(s => ({
        stepOrder: s.stepOrder,
        name: s.name || '',
        messageContent: s.messageContent || '',
        delayMinutes: s.delayMinutes ?? 0,
        type: s.type || 'MESSAGE',
      })))
    }
  }, [id, location.state])

  useEffect(() => { setHasChanges(true) }, [name, description, steps])

  const addStep = (type = 'MESSAGE') => {
    const order = steps.length + 1
    const newStep = { ...defaultStep(order), type, delayMinutes: steps.length === 0 ? 0 : 60 }
    setSteps(prev => [...prev, newStep])
    setSelectedIndex(steps.length)
  }

  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({
      ...s, stepOrder: i + 1, delayMinutes: i === 0 ? 0 : s.delayMinutes,
    })))
    setSelectedIndex(idx => Math.min(idx, steps.length - 2))
  }

  const moveStep = (index, dir) => {
    const newIdx = index + dir
    if (newIdx < 0 || newIdx >= steps.length) return
    setSteps(prev => {
      const next = [...prev]
      ;[next[index], next[newIdx]] = [next[newIdx], next[index]]
      return next.map((s, i) => ({ ...s, stepOrder: i + 1, delayMinutes: i === 0 ? 0 : s.delayMinutes }))
    })
    setSelectedIndex(newIdx)
  }

  const updateStep = useCallback((updated) => {
    setSteps(prev => prev.map((s, i) => i === selectedIndex ? updated : s))
  }, [selectedIndex])

  const handleSave = async () => {
    if (!name.trim()) { setError('시퀀스 이름을 입력하세요'); return }
    if (steps.length === 0) { setError('최소 1개의 단계가 필요합니다'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        steps: steps.map((s, i) => ({
          stepOrder: i + 1, name: s.name, messageContent: s.messageContent,
          delayMinutes: i === 0 ? 0 : s.delayMinutes, type: s.type,
        })),
      }
      if (id) {
        await sequenceService.update(id, payload)
      } else {
        await sequenceService.create(payload)
      }
      navigate('/app/sequences')
    } catch (err) {
      setError(err.message || '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (hasChanges && steps.some(s => s.messageContent)) {
      if (!window.confirm('저장하지 않은 변경 사항이 있습니다. 나가시겠습니까?')) return
    }
    navigate('/app/sequences')
  }

  if (loading) {
    return (
      <div className="flow-builder-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6B7280' }}>
          <i className="ri-loader-4-line spin" style={{ fontSize: 32, marginRight: 12 }} /> 시퀀스를 불러오는 중...
        </div>
      </div>
    )
  }

  return (
    <div className="flow-builder-page">
      {/* 헤더 */}
      <div className="fb-header">
        <div className="fb-header-left">
          <button onClick={handleBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280', display: 'flex', alignItems: 'center' }}>
            <i className="ri-arrow-left-line" />
          </button>
          <input className="fb-title-input" value={name} onChange={e => setName(e.target.value)} placeholder="시퀀스 이름" />
          <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: isNew ? '#FEF3C7' : '#D1FAE5', color: isNew ? '#92400E' : '#059669' }}>
            {isNew ? '새 시퀀스' : '편집 중'}
          </span>
        </div>
        <div className="fb-header-right">
          {error && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}><i className="ri-error-warning-line" /> {error}</span>}
          <button className="btn-secondary" onClick={handleBack}>취소</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><i className="ri-loader-4-line spin" /> 저장 중...</> : <><i className="ri-save-line" /> 저장</>}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="fb-body">
        {/* 좌측: 타임라인 */}
        <div className="fb-wizard" style={{ maxWidth: 400 }}>
          <div className="fb-section" style={{ marginBottom: 16 }}>
            <div style={{ padding: 20 }}>
              <div className="fb-field">
                <label>시퀀스 설명</label>
                <textarea className="fb-textarea" rows={2} value={description}
                  onChange={e => setDescription(e.target.value)} placeholder="이 시퀀스의 목적을 설명하세요 (선택사항)" />
              </div>
            </div>
          </div>

          <div className="sb-timeline">
            {steps.map((step, i) => {
              const st = getStepType(step.type)
              const isSelected = i === selectedIndex
              return (
                <div key={i} className={`sb-timeline-item${isSelected ? ' selected' : ''}`} onClick={() => setSelectedIndex(i)}>
                  {i > 0 && (
                    <div className="sb-timeline-connector">
                      <div className="sb-connector-line" />
                      <span className="sb-connector-delay"><i className="ri-time-line" /> {formatDelay(step.delayMinutes)}</span>
                    </div>
                  )}
                  <div className={`sb-step-card${isSelected ? ' selected' : ''}`}>
                    <div className="sb-step-icon" style={{ background: `${st.color}15`, color: st.color }}>
                      <i className={st.icon} />
                    </div>
                    <div className="sb-step-body">
                      <div className="sb-step-title">{step.name || `단계 ${i + 1}`}</div>
                      <div className="sb-step-subtitle">
                        {st.label}{step.type === 'MESSAGE' && step.messageContent ? ` · ${step.messageContent.slice(0, 30)}${step.messageContent.length > 30 ? '...' : ''}` : ''}
                      </div>
                    </div>
                    <div className="sb-step-actions" onClick={e => e.stopPropagation()}>
                      {i > 0 && <button className="sb-step-act-btn" title="위로" onClick={() => moveStep(i, -1)}><i className="ri-arrow-up-s-line" /></button>}
                      {i < steps.length - 1 && <button className="sb-step-act-btn" title="아래로" onClick={() => moveStep(i, 1)}><i className="ri-arrow-down-s-line" /></button>}
                      {steps.length > 1 && <button className="sb-step-act-btn delete" title="삭제" onClick={() => removeStep(i)}><i className="ri-delete-bin-line" /></button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="sb-add-section">
            <div className="sb-timeline-connector" style={{ marginLeft: 24 }}>
              <div className="sb-connector-line" style={{ height: 20 }} />
            </div>
            <div className="sb-add-buttons">
              {STEP_TYPES.map(t => (
                <button key={t.value} className="sb-add-btn" onClick={() => addStep(t.value)} style={{ '--type-color': t.color }}>
                  <i className={t.icon} /><span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 중앙: 단계 편집 */}
        <div className="fb-wizard" style={{ maxWidth: 420, borderLeft: '1px solid #E2E8F0' }}>
          {steps[selectedIndex] ? (
            <StepEditor step={steps[selectedIndex]} index={selectedIndex} onChange={updateStep} />
          ) : (
            <div className="empty-state" style={{ padding: 60 }}>
              <i className="ri-cursor-line" style={{ fontSize: 40, color: '#CBD5E1' }} />
              <p>왼쪽에서 단계를 선택하세요</p>
            </div>
          )}
        </div>

        {/* 우측: DM 미리보기 */}
        <div className="ig-preview-wrap">
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
            <i className="ri-smartphone-line" style={{ marginRight: 4 }} />DM 미리보기
          </h4>
          <SequencePreview steps={steps} />
        </div>
      </div>
    </div>
  )
}
