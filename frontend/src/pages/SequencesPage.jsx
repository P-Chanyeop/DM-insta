import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import { useToast } from '../components/Toast'
import { usePlan } from '../components/PlanContext'
import UpgradeModal from '../components/UpgradeModal'
import { sequenceService } from '../api/services'

const STEP_TYPE_MAP = {
  MESSAGE: { icon: 'ri-message-3-line', color: '#3B82F6' },
  DELAY: { icon: 'ri-time-line', color: '#F59E0B' },
  CONDITION: { icon: 'ri-git-branch-line', color: '#8B5CF6' },
  TAG: { icon: 'ri-price-tag-3-line', color: '#10B981' },
  NOTIFY: { icon: 'ri-notification-3-line', color: '#EF4444' },
}

function formatDelay(minutes) {
  if (!minutes || minutes <= 0) return '즉시'
  if (minutes < 60) return `${minutes}분`
  if (minutes < 1440) return minutes % 60 === 0 ? `${minutes / 60}시간` : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
  const days = Math.floor(minutes / 1440)
  const rem = minutes % 1440
  if (rem === 0) return `${days}일`
  return `${days}일 ${Math.floor(rem / 60)}시간`
}

export default function SequencesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { canUse } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadSequences() }, [])

  async function loadSequences() {
    setLoading(true)
    setError(null)
    try {
      const data = await sequenceService.list()
      setSequences(data ?? [])
    } catch (err) {
      setError(err.message || '시퀀스를 불러오는 데 실패했습니다.')
      setSequences([])
    } finally {
      setLoading(false)
    }
  }

  function handleNewSequence() {
    if (canUse('sequences')) {
      navigate('/app/sequences/builder')
    } else {
      setUpgradeOpen(true)
    }
  }

  async function handleToggle(e, id) {
    e.stopPropagation()
    const prev = sequences
    setSequences(s => s.map(seq => seq.id === id ? { ...seq, active: !seq.active } : seq))
    try {
      await sequenceService.toggle(id)
    } catch {
      setSequences(prev)
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!window.confirm('이 시퀀스를 삭제하시겠습니까?')) return
    const prev = sequences
    setSequences(s => s.filter(seq => seq.id !== id))
    try {
      await sequenceService.delete(id)
      toast.success('시퀀스가 삭제되었습니다.')
    } catch {
      setSequences(prev)
      toast.error('삭제에 실패했습니다.')
    }
  }

  return (
    <>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="시퀀스 (드립 캠페인)"
        description="시퀀스는 프로 플랜 이상에서 사용할 수 있습니다. 자동 순차 메시지를 보내려면 업그레이드하세요."
      />
      <div className="page-header">
        <div>
          <h2>시퀀스 (드립 캠페인)</h2>
          <p>시간 간격을 두고 자동으로 여러 메시지를 순차 발송하세요</p>
        </div>
        <button className="btn-primary" onClick={handleNewSequence}>
          <i className="ri-add-line" /> 새 시퀀스
        </button>
      </div>

      {loading ? (
        <PageLoader text="시퀀스를 불러오는 중..." />
      ) : error ? (
        <div className="empty-state" style={{ padding: 60 }}>
          <i className="ri-error-warning-line" style={{ fontSize: 48, color: '#ff4d6a' }} />
          <p>{error}</p>
          <button className="btn-primary" onClick={loadSequences}><i className="ri-refresh-line" /> 다시 시도</button>
        </div>
      ) : sequences.length === 0 ? (
        <EmptyState
          icon="ri-list-ordered-2"
          title="아직 시퀀스가 없습니다"
          description="단계별 자동 메시지를 설정하여 고객과 지속적으로 소통하세요"
          actionLabel="시퀀스 만들기"
          onAction={handleNewSequence}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sequences.map(seq => (
            <div className="sequence-card" key={seq.id} style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/app/sequences/builder/${seq.id}`)}>
              <div className="seq-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h4>{seq.name}</h4>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: seq.active ? '#D1FAE5' : '#F3F4F6', color: seq.active ? '#059669' : '#6B7280',
                  }}>{seq.active ? '활성' : '비활성'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={`flow-card-toggle${seq.active ? ' active' : ''}`} onClick={e => handleToggle(e, seq.id)} />
                  <button title="삭제" onClick={e => handleDelete(e, seq.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 18 }}>
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
              {seq.description && <p className="seq-desc">{seq.description}</p>}

              {seq.steps && seq.steps.length > 0 ? (
                <div className="seq-timeline">
                  {seq.steps.map((step, i, arr) => {
                    const st = STEP_TYPE_MAP[step.type] || STEP_TYPE_MAP.MESSAGE
                    return (
                      <div key={step.id || i} style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="seq-step">
                          <div className="seq-step-dot" style={{ background: st.color }} />
                          <div className="seq-step-info">
                            <strong>{formatDelay(step.delayMinutes)}</strong>
                            <span>{step.name || '메시지'}</span>
                          </div>
                        </div>
                        {i < arr.length - 1 && <div className="seq-step-line" />}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ color: '#94A3B8', fontSize: 13, padding: '8px 0', fontStyle: 'italic' }}>
                  단계가 없습니다 — 클릭하여 편집
                </div>
              )}

              <div className="seq-stats">
                <span><i className="ri-user-add-line" style={{ marginRight: 4 }} />{(seq.activeSubscribers ?? 0).toLocaleString()}명 등록</span>
                <span><i className="ri-check-double-line" style={{ marginRight: 4 }} />{seq.completionRate != null ? `${Math.round(seq.completionRate)}%` : '0%'} 완료율</span>
                <span><i className="ri-stack-line" style={{ marginRight: 4 }} />{seq.steps?.length ?? 0}단계</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
