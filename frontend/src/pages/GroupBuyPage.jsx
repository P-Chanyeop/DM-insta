import { useState, useEffect, useCallback } from 'react'
import { groupBuyService } from '../api/services'

const STATUS_LABELS = {
  DRAFT: '초안',
  OPEN: '판매 중',
  SOLD_OUT: '매진',
  CLOSED: '마감',
  COMPLETED: '완료',
}
const STATUS_COLORS = {
  DRAFT: '#94A3B8',
  OPEN: '#10B981',
  SOLD_OUT: '#EF4444',
  CLOSED: '#F59E0B',
  COMPLETED: '#6366F1',
}
const PARTICIPANT_STATUS_LABELS = {
  APPLIED: '신청',
  OPTION_SELECTED: '옵션 선택',
  PAYMENT_SENT: '결제 대기',
  PAID: '결제 완료',
  SHIPPING: '배송 중',
  DELIVERED: '배송 완료',
  REVIEWED: '리뷰 완료',
  CANCELLED: '취소',
}

export default function GroupBuyPage() {
  const [groupBuys, setGroupBuys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedGB, setSelectedGB] = useState(null)
  const [participants, setParticipants] = useState([])
  const [stats, setStats] = useState(null)
  const [partLoading, setPartLoading] = useState(false)

  const loadGroupBuys = useCallback(async () => {
    try {
      setLoading(true)
      const data = await groupBuyService.list()
      setGroupBuys(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGroupBuys() }, [loadGroupBuys])

  const loadParticipants = async (gb) => {
    setSelectedGB(gb)
    setPartLoading(true)
    try {
      const [parts, st] = await Promise.all([
        groupBuyService.getParticipants(gb.id),
        groupBuyService.getStats(gb.id),
      ])
      setParticipants(parts)
      setStats(st)
    } catch (err) {
      setError(err.message)
    } finally {
      setPartLoading(false)
    }
  }

  const handleStatusChange = async (gb, newStatus) => {
    try {
      await groupBuyService.updateStatus(gb.id, newStatus)
      loadGroupBuys()
      if (selectedGB?.id === gb.id) {
        setSelectedGB({ ...selectedGB, status: newStatus })
      }
    } catch (err) {
      alert(err.message || '상태 변경 실패')
    }
  }

  const handleParticipantUpdate = async (participantId, data) => {
    try {
      await groupBuyService.updateParticipant(selectedGB.id, participantId, data)
      loadParticipants(selectedGB)
    } catch (err) {
      alert(err.message || '업데이트 실패')
    }
  }

  const handleDelete = async (gb) => {
    if (!confirm(`"${gb.title}" 공동구매를 삭제하시겠습니까?`)) return
    try {
      await groupBuyService.delete(gb.id)
      if (selectedGB?.id === gb.id) setSelectedGB(null)
      loadGroupBuys()
    } catch (err) {
      alert(err.message || '삭제 실패')
    }
  }

  // ═══════════════════════════════════════
  // 참여자 관리 뷰
  // ═══════════════════════════════════════
  if (selectedGB) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <button className="btn btn-ghost" onClick={() => setSelectedGB(null)}>
              <i className="ri-arrow-left-line" /> 목록으로
            </button>
            <h2>{selectedGB.title}</h2>
            <span className="gb-status-badge" style={{ background: STATUS_COLORS[selectedGB.status] }}>
              {STATUS_LABELS[selectedGB.status]}
            </span>
          </div>
          <div className="page-header-actions">
            {selectedGB.status === 'DRAFT' && (
              <button className="btn btn-primary" onClick={() => handleStatusChange(selectedGB, 'OPEN')}>
                <i className="ri-play-line" /> 오픈하기
              </button>
            )}
            {selectedGB.status === 'OPEN' && (
              <button className="btn btn-secondary" onClick={() => handleStatusChange(selectedGB, 'CLOSED')}>
                <i className="ri-stop-line" /> 마감하기
              </button>
            )}
            {(selectedGB.status === 'CLOSED' || selectedGB.status === 'SOLD_OUT') && (
              <button className="btn btn-primary" onClick={() => handleStatusChange(selectedGB, 'COMPLETED')}>
                <i className="ri-check-double-line" /> 완료 처리
              </button>
            )}
          </div>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="gb-stats-grid">
            <div className="gb-stat-card">
              <div className="gb-stat-value">{stats.total}</div>
              <div className="gb-stat-label">전체 참여</div>
            </div>
            <div className="gb-stat-card">
              <div className="gb-stat-value">{stats.applied}</div>
              <div className="gb-stat-label">신청/대기</div>
            </div>
            <div className="gb-stat-card paid">
              <div className="gb-stat-value">{stats.paid}</div>
              <div className="gb-stat-label">결제 완료</div>
            </div>
            <div className="gb-stat-card">
              <div className="gb-stat-value">{stats.shipping}</div>
              <div className="gb-stat-label">배송 중</div>
            </div>
            <div className="gb-stat-card delivered">
              <div className="gb-stat-value">{stats.delivered}</div>
              <div className="gb-stat-label">배송 완료</div>
            </div>
            <div className="gb-stat-card cancelled">
              <div className="gb-stat-value">{stats.cancelled}</div>
              <div className="gb-stat-label">취소</div>
            </div>
          </div>
        )}

        {/* 재고 정보 */}
        <div className="gb-inventory-bar">
          <div className="gb-inventory-info">
            <span><i className="ri-shopping-bag-line" /> 재고: </span>
            {selectedGB.maxQuantity > 0 ? (
              <>
                <strong>{selectedGB.currentCount}</strong> / {selectedGB.maxQuantity}
                {' '}({selectedGB.remainingStock}개 남음)
              </>
            ) : (
              <span>무제한</span>
            )}
          </div>
          {selectedGB.paymentLink && (
            <div className="gb-inventory-info">
              <span><i className="ri-link" /> 결제 링크: </span>
              <a href={selectedGB.paymentLink} target="_blank" rel="noopener noreferrer">
                {selectedGB.paymentLink.length > 40
                  ? selectedGB.paymentLink.slice(0, 40) + '...'
                  : selectedGB.paymentLink}
              </a>
            </div>
          )}
          {selectedGB.flowId && (
            <div className="gb-inventory-info">
              <span><i className="ri-flow-chart" /> 연결 플로우: </span>
              <strong>{selectedGB.flowName || `#${selectedGB.flowId}`}</strong>
            </div>
          )}
        </div>

        {/* 참여자 테이블 */}
        <div className="gb-participants-section">
          <h3>참여자 목록 ({participants.length}명)</h3>
          {partLoading ? (
            <div className="loading-state"><div className="spinner" /> 로딩 중...</div>
          ) : participants.length === 0 ? (
            <div className="empty-state-small">
              <i className="ri-user-line" />
              <p>아직 참여자가 없습니다</p>
            </div>
          ) : (
            <div className="gb-table-wrap">
              <table className="gb-table">
                <thead>
                  <tr>
                    <th>참여자</th>
                    <th>옵션</th>
                    <th>수량</th>
                    <th>상태</th>
                    <th>운송장</th>
                    <th>신청일</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="gb-participant-name">
                          <strong>{p.contactName || '알 수 없음'}</strong>
                          {p.contactUsername && <span className="gb-username">@{p.contactUsername}</span>}
                        </div>
                      </td>
                      <td>{p.selectedOption || '-'}</td>
                      <td>{p.quantity}</td>
                      <td>
                        <select className="gb-status-select"
                          value={p.status}
                          onChange={e => handleParticipantUpdate(p.id, { status: e.target.value })}>
                          {Object.entries(PARTICIPANT_STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="gb-tracking-input"
                          type="text" placeholder="운송장 입력"
                          defaultValue={p.trackingNumber || ''}
                          onBlur={e => {
                            const v = e.target.value.trim()
                            if (v !== (p.trackingNumber || '')) {
                              handleParticipantUpdate(p.id, { trackingNumber: v, status: v ? 'SHIPPING' : p.status })
                            }
                          }} />
                      </td>
                      <td>{p.appliedAt ? new Date(p.appliedAt).toLocaleDateString('ko') : '-'}</td>
                      <td>
                        {p.status === 'APPLIED' && (
                          <button className="btn btn-sm btn-primary"
                            onClick={() => handleParticipantUpdate(p.id, { status: 'PAYMENT_SENT' })}>
                            결제 요청
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // 공동구매 목록 뷰
  // ═══════════════════════════════════════
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>공동구매 관리</h2>
          <p className="page-subtitle">공동구매 캠페인을 관리하고 참여자를 추적하세요</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <i className="ri-add-line" /> 새 공동구매
        </button>
      </div>

      {error && <div className="alert alert-error"><i className="ri-error-warning-line" /> {error}</div>}

      {loading ? (
        <div className="loading-state"><div className="spinner" /> 로딩 중...</div>
      ) : groupBuys.length === 0 ? (
        <div className="empty-state">
          <i className="ri-shopping-bag-line" />
          <h3>공동구매가 없습니다</h3>
          <p>새 공동구매를 만들어 시작하세요</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <i className="ri-add-line" /> 첫 공동구매 만들기
          </button>
        </div>
      ) : (
        <div className="gb-grid">
          {groupBuys.map(gb => (
            <div key={gb.id} className="gb-card" onClick={() => loadParticipants(gb)}>
              <div className="gb-card-header">
                <h3>{gb.title}</h3>
                <span className="gb-status-badge" style={{ background: STATUS_COLORS[gb.status] }}>
                  {STATUS_LABELS[gb.status]}
                </span>
              </div>
              <div className="gb-card-body">
                {gb.price && <div className="gb-card-price">{gb.price}</div>}
                <div className="gb-card-stats">
                  <div className="gb-card-stat">
                    <i className="ri-user-line" /> {gb.participantCount}명 참여
                  </div>
                  <div className="gb-card-stat">
                    <i className="ri-shopping-bag-line" />
                    {gb.maxQuantity > 0
                      ? `${gb.currentCount}/${gb.maxQuantity}`
                      : '무제한'}
                  </div>
                </div>
                {gb.maxQuantity > 0 && (
                  <div className="gb-progress-bar">
                    <div className="gb-progress-fill"
                      style={{ width: `${Math.min(100, (gb.currentCount / gb.maxQuantity) * 100)}%` }} />
                  </div>
                )}
              </div>
              <div className="gb-card-footer">
                <span className="gb-card-date">
                  {gb.createdAt ? new Date(gb.createdAt).toLocaleDateString('ko') : ''}
                </span>
                <div className="gb-card-actions" onClick={e => e.stopPropagation()}>
                  {gb.status === 'DRAFT' && (
                    <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(gb, 'OPEN')}>
                      오픈
                    </button>
                  )}
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(gb)}>
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 생성 모달 */}
      {showCreate && (
        <CreateGroupBuyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadGroupBuys() }}
        />
      )}
    </div>
  )
}

/* ── 공동구매 생성 모달 ── */
function CreateGroupBuyModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', maxQuantity: 0,
    price: '', paymentLink: '', imageUrl: '', options: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return alert('제목을 입력하세요')
    setSaving(true)
    try {
      await groupBuyService.create(form)
      onCreated()
    } catch (err) {
      alert(err.message || '생성 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal gb-create-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>새 공동구매</h3>
          <button className="icon-btn" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>공동구매 제목 *</label>
              <input type="text" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="예: 봄 시즌 한정 세트" />
            </div>
            <div className="form-group">
              <label>설명</label>
              <textarea rows={3} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="상품에 대한 설명을 입력하세요" />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>가격 (표시용)</label>
                <input type="text" value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="예: 29,000원" />
              </div>
              <div className="form-group">
                <label>최대 수량 (0=무제한)</label>
                <input type="number" min="0" value={form.maxQuantity}
                  onChange={e => setForm({ ...form, maxQuantity: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="form-group">
              <label>결제 링크</label>
              <input type="url" value={form.paymentLink}
                onChange={e => setForm({ ...form, paymentLink: e.target.value })}
                placeholder="스마트스토어/토스 결제 링크" />
            </div>
            <div className="form-group">
              <label>상품 이미지 URL</label>
              <input type="url" value={form.imageUrl}
                onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '생성 중...' : '생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
