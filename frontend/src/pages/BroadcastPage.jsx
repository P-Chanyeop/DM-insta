import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import { useToast } from '../components/Toast'
import { usePlan } from '../components/PlanContext'
import UpgradeModal from '../components/UpgradeModal'
import { useConfirm } from '../components/ConfirmDialog'
import { broadcastService } from '../api/services'

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value || 0)
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function statusLabel(status) {
  switch (status) {
    case 'SENT': return { label: '발송 완료', className: 'sent', icon: 'ri-check-double-line' }
    case 'SCHEDULED': return { label: '예약됨', className: 'scheduled', icon: 'ri-time-line' }
    case 'DRAFT': return { label: '임시저장', className: 'draft', icon: 'ri-edit-line' }
    case 'CANCELLED': return { label: '취소됨', className: 'cancelled', icon: 'ri-close-line' }
    case 'SENDING': return { label: '발송 중', className: 'sending', icon: 'ri-send-plane-line' }
    default: return { label: status || '알 수 없음', className: '', icon: 'ri-question-line' }
  }
}

const TIMELINE_STEPS = ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT']
const TIMELINE_LABELS = { DRAFT: '작성', SCHEDULED: '예약', SENDING: '발송중', SENT: '완료' }

function StatusTimeline({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="bc-status-timeline">
        <div className="bc-timeline-step" style={{ color: '#DC2626', background: '#FEE2E2' }}>
          <i className="ri-close-circle-line" /> 취소됨
        </div>
      </div>
    )
  }
  const currentIdx = TIMELINE_STEPS.indexOf(status)
  return (
    <div className="bc-status-timeline">
      {TIMELINE_STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div className={`bc-timeline-step${i < currentIdx ? ' done' : i === currentIdx ? ' current' : ''}`}>
            {i < currentIdx && <i className="ri-check-line" />}
            {TIMELINE_LABELS[step]}
          </div>
          {i < TIMELINE_STEPS.length - 1 && <div className={`bc-timeline-line${i < currentIdx ? ' done' : ''}`} />}
        </div>
      ))}
    </div>
  )
}

export default function BroadcastPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { canUse } = usePlan()
  const confirm = useConfirm()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [broadcasts, setBroadcasts] = useState([])
  const [activeTab, setActiveTab] = useState('전체')
  const loadBroadcasts = async () => {
    try {
      setLoading(true)
      const data = await broadcastService.list()
      setBroadcasts(data || [])
    } catch (err) {
      setError(err.message || '브로드캐스트를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBroadcasts() }, [])

  const filtered = broadcasts.filter((b) => {
    if (activeTab === '전체') return true
    if (activeTab === '발송 완료') return b.status === 'SENT'
    if (activeTab === '예약됨') return b.status === 'SCHEDULED'
    if (activeTab === '임시저장') return b.status === 'DRAFT'
    return true
  })

  function handleNewBroadcast() {
    if (canUse('broadcast')) {
      navigate('/app/broadcast/builder')
    } else {
      setUpgradeOpen(true)
    }
  }

  const handleCancel = async (id) => {
    const bc = broadcasts.find(b => b.id === id)
    const ok = await confirm({
      title: '브로드캐스트 취소',
      message: `"${bc?.name || '브로드캐스트'}"를 취소하시겠습니까? 예약된 발송이 중단됩니다.`,
      confirmText: '취소하기',
      cancelText: '돌아가기',
      variant: 'danger',
      icon: 'ri-close-circle-line',
    })
    if (!ok) return
    try {
      await broadcastService.cancel(id)
      toast.success('브로드캐스트가 취소되었습니다.')
      await loadBroadcasts()
    } catch (err) {
      toast.error(err.message || '취소에 실패했습니다.')
    }
  }

  const broadcastAllowed = canUse('broadcast')

  return (
    <>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="브로드캐스팅"
        description="브로드캐스팅은 프로 플랜 이상에서 사용할 수 있습니다. 구독자에게 대량 DM을 발송하려면 업그레이드하세요."
      />
      <div className="page-header">
        <div>
          <h2>브로드캐스팅</h2>
          <p>구독자에게 대량 DM을 발송하세요</p>
        </div>
        <button className="btn-primary" onClick={handleNewBroadcast}>
          <i className="ri-add-line" /> 새 브로드캐스트
        </button>
      </div>

      {error && (
        <div className="alert-banner error">
          <i className="ri-error-warning-line" /> {error}
        </div>
      )}

      <div className="tab-bar">
        {['전체', '발송 완료', '예약됨', '임시저장'].map((t) => (
          <button
            key={t}
            className={`tab${activeTab === t ? ' active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="broadcast-list">
        {loading && <PageLoader text="브로드캐스트를 불러오는 중..." />}
        {!loading && filtered.length === 0 && (
          <EmptyState icon="ri-broadcast-line" title="브로드캐스트가 없습니다" description="대량 DM을 보내려면 첫 브로드캐스트를 만들어 보세요" actionLabel="브로드캐스트 만들기" onAction={handleNewBroadcast} />
        )}
        {filtered.map((b) => {
          const s = statusLabel(b.status)
          return (
            <div className="broadcast-card" key={b.id}>
              <div className={`bc-status ${s.className}`}><i className={s.icon} /></div>
              <div className="bc-info">
                <h4>{b.name}</h4>
                <p>{b.segment || '전체 구독자'} · {s.label}</p>
              </div>
              <StatusTimeline status={b.status} />
              {b.status === 'SENDING' && b.sentCount > 0 && (
                <div className="bc-sending-progress">
                  <div className="bc-sending-fill" style={{ width: `${Math.min(100, b.sentCount)}%` }} />
                </div>
              )}
              <div className="bc-stats-grid">
                <div className="bc-stat"><div className="bc-stat-value">{formatNumber(b.sentCount)}</div><div className="bc-stat-label">발송</div></div>
                <div className="bc-stat"><div className="bc-stat-value">{formatNumber(b.openCount)}</div><div className="bc-stat-label">열림</div></div>
                <div className="bc-stat"><div className="bc-stat-value">{b.openRate != null ? `${Math.round(b.openRate)}%` : '--'}</div><div className="bc-stat-label">열림률</div></div>
                <div className="bc-stat"><div className="bc-stat-value">{formatNumber(b.clickCount)}</div><div className="bc-stat-label">클릭</div></div>
              </div>
              <div className="bc-meta">
                <span><i className="ri-calendar-line" /> {b.sentAt ? `${formatDateTime(b.sentAt)} 발송` : b.scheduledAt ? `${formatDateTime(b.scheduledAt)} 예약` : formatDateTime(b.createdAt)}</span>
                <span><i className="ri-group-line" /> {b.segment || '전체 구독자'}</span>
                {(b.status === 'SCHEDULED' || b.status === 'DRAFT') && (
                  <button className="btn-secondary" onClick={() => handleCancel(b.id)}>
                    <i className="ri-close-line" /> 취소
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </>
  )
}
