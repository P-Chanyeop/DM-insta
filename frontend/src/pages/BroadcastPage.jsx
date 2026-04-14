import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import { useToast } from '../components/Toast'
import { usePlan } from '../components/PlanContext'
import UpgradeModal from '../components/UpgradeModal'
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

export default function BroadcastPage() {
  const toast = useToast()
  const { canUse } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [broadcasts, setBroadcasts] = useState([])
  const [activeTab, setActiveTab] = useState('전체')
  const [form, setForm] = useState({
    name: '',
    messageContent: '',
    segment: 'ALL',
    scheduleType: 'immediate',
    scheduledAt: '',
  })

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

  const handleCreate = async () => {
    if (!form.name || !form.messageContent) {
      toast.warning('이름과 메시지를 입력해주세요.')
      return
    }
    try {
      const payload = {
        name: form.name,
        messageContent: form.messageContent,
        segment: form.segment,
        scheduledAt: form.scheduleType === 'scheduled' && form.scheduledAt ? form.scheduledAt : null,
      }
      await broadcastService.create(payload)
      setForm({ name: '', messageContent: '', segment: 'ALL', scheduleType: 'immediate', scheduledAt: '' })
      setModal(false)
      toast.success('브로드캐스트가 생성되었습니다.')
      await loadBroadcasts()
    } catch (err) {
      toast.error(err.message || '생성에 실패했습니다.')
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('이 브로드캐스트를 취소하시겠습니까?')) return
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
        <button className="btn-primary" onClick={() => broadcastAllowed ? setModal(true) : setUpgradeOpen(true)}>
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
          <EmptyState icon="ri-broadcast-line" title="브로드캐스트가 없습니다" description="대량 DM을 보내려면 첫 브로드캐스트를 만들어 보세요" actionLabel="브로드캐스트 만들기" onAction={() => setModal(true)} />
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

      {modal && (
        <div
          className="modal-overlay active"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(false) }}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>새 브로드캐스트</h3>
              <button className="icon-btn" onClick={() => setModal(false)}>
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>브로드캐스트 이름</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="예: 봄 시즌 세일 안내"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>대상 세그먼트</label>
                <select
                  className="form-input"
                  value={form.segment}
                  onChange={(e) => setForm({ ...form, segment: e.target.value })}
                >
                  <option value="ALL">전체 구독자</option>
                  <option value="VIP">VIP</option>
                  <option value="NEW">신규 구독자</option>
                  <option value="ACTIVE">활성 구독자</option>
                </select>
              </div>
              <div className="form-group">
                <label>메시지 내용</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="메시지를 입력하세요..."
                  value={form.messageContent}
                  onChange={(e) => setForm({ ...form, messageContent: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>발송 시점</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="time"
                      checked={form.scheduleType === 'immediate'}
                      onChange={() => setForm({ ...form, scheduleType: 'immediate' })}
                    />
                    즉시 발송
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="time"
                      checked={form.scheduleType === 'scheduled'}
                      onChange={() => setForm({ ...form, scheduleType: 'scheduled' })}
                    />
                    예약 발송
                  </label>
                </div>
                {form.scheduleType === 'scheduled' && (
                  <input
                    type="datetime-local"
                    className="form-input"
                    style={{ marginTop: 8 }}
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(false)}>취소</button>
              <button className="btn-primary" onClick={handleCreate}>
                <i className="ri-send-plane-line" /> {form.scheduleType === 'immediate' ? '발송하기' : '예약하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
