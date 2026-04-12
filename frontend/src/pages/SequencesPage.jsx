import { useState, useEffect } from 'react'
import { sequenceService } from '../api/services'

const MOCK_SEQUENCES = [
  {
    id: 'seq-1',
    name: '신규 고객 온보딩',
    description: '신규 구독자에게 5일에 걸쳐 브랜드를 소개하는 시퀀스',
    active: true,
    steps: [
      { delay: '즉시', name: '환영 메시지', active: true },
      { delay: '1일 후', name: '브랜드 스토리', active: true },
      { delay: '3일 후', name: '인기 상품 소개', active: true },
      { delay: '5일 후', name: '특별 할인 쿠폰', active: false },
    ],
    stats: { enrolled: 1284, completed: 892, inProgress: 392 },
  },
  {
    id: 'seq-2',
    name: '재구매 유도 캠페인',
    description: '구매 후 7일, 14일, 30일에 걸쳐 재구매를 유도하는 시퀀스',
    active: true,
    steps: [
      { delay: '7일 후', name: '사용 후기 요청', active: true },
      { delay: '14일 후', name: '관련 상품 추천', active: true },
      { delay: '30일 후', name: '재구매 할인 쿠폰', active: false },
    ],
    stats: { enrolled: 456, completed: 234, inProgress: 222 },
  },
  {
    id: 'seq-3',
    name: '장바구니 이탈 복구',
    description: '장바구니에 상품을 담고 떠난 고객에게 리마인드 메시지를 보내는 시퀀스',
    active: false,
    steps: [
      { delay: '1시간 후', name: '장바구니 리마인더', active: true },
      { delay: '1일 후', name: '한정 할인 제안', active: true },
      { delay: '3일 후', name: '마지막 기회 알림', active: false },
    ],
    stats: { enrolled: 723, completed: 318, inProgress: 405 },
  },
]

export default function SequencesPage() {
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadSequences()
  }, [])

  async function loadSequences() {
    setLoading(true)
    try {
      const data = await sequenceService.list()
      if (data && data.length > 0) {
        setSequences(data)
      } else {
        setSequences(MOCK_SEQUENCES)
      }
    } catch {
      setSequences(MOCK_SEQUENCES)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!formData.name.trim()) return
    setCreating(true)
    try {
      const newSeq = await sequenceService.create({
        name: formData.name,
        description: formData.description,
      })
      setSequences((prev) => [...prev, newSeq])
    } catch {
      const mockNew = {
        id: `seq-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        active: false,
        steps: [],
        stats: { enrolled: 0, completed: 0, inProgress: 0 },
      }
      setSequences((prev) => [...prev, mockNew])
    } finally {
      setFormData({ name: '', description: '' })
      setShowForm(false)
      setCreating(false)
    }
  }

  async function handleToggle(id) {
    try {
      await sequenceService.toggle(id)
    } catch {
      // toggle locally as fallback
    }
    setSequences((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    )
  }

  async function handleDelete(id) {
    if (!window.confirm('이 시퀀스를 삭제하시겠습니까?')) return
    try {
      await sequenceService.delete(id)
    } catch {
      // delete locally as fallback
    }
    setSequences((prev) => prev.filter((s) => s.id !== id))
  }

  function formatNumber(n) {
    if (typeof n === 'string') return n
    return n.toLocaleString()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>시퀀스 (드립 캠페인)</h2>
          <p>시간 간격을 두고 자동으로 여러 메시지를 순차 발송하세요</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className="ri-add-line" /> 새 시퀀스
        </button>
      </div>

      {showForm && (
        <div className="sequence-card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div className="seq-header">
              <h4>새 시퀀스 만들기</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
              <input
                type="text"
                className="input"
                placeholder="시퀀스 이름"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
              <input
                type="text"
                className="input"
                placeholder="시퀀스 설명 (선택사항)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn-primary" disabled={creating || !formData.name.trim()}>
                  {creating ? '생성 중...' : '생성'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  취소
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          <i className="ri-loader-4-line" style={{ fontSize: 24 }} /> 시퀀스를 불러오는 중...
        </div>
      ) : sequences.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          <i className="ri-inbox-line" style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
          <p>아직 시퀀스가 없습니다. 첫 시퀀스를 만들어보세요!</p>
        </div>
      ) : (
        sequences.map((seq) => (
          <div className="sequence-card" key={seq.id}>
            <div className="seq-header">
              <h4>{seq.name}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  className={`flow-card-toggle${seq.active ? ' active' : ''}`}
                  onClick={() => handleToggle(seq.id)}
                />
                <button
                  className="btn-icon"
                  title="삭제"
                  onClick={() => handleDelete(seq.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d6a', fontSize: 18 }}
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            </div>
            <p className="seq-desc">{seq.description}</p>

            {seq.steps && seq.steps.length > 0 ? (
              <div className="seq-timeline">
                {seq.steps.map((step, i, arr) => (
                  <div key={`${seq.id}-step-${i}`} style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="seq-step">
                      <div className={`seq-step-dot${step.active ? ' active' : ''}`} />
                      <div className="seq-step-info">
                        <strong>{step.delay}</strong>
                        <span>{step.name}</span>
                      </div>
                    </div>
                    {i < arr.length - 1 && <div className="seq-step-line" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="seq-timeline" style={{ color: '#888', fontStyle: 'italic', padding: '12px 0' }}>
                단계가 아직 없습니다. 시퀀스를 편집하여 단계를 추가하세요.
              </div>
            )}

            <div className="seq-stats">
              <span>등록: {formatNumber(seq.stats?.enrolled ?? 0)}명</span>
              <span>완료: {formatNumber(seq.stats?.completed ?? 0)}명</span>
              <span>진행 중: {formatNumber(seq.stats?.inProgress ?? 0)}명</span>
            </div>
          </div>
        ))
      )}
    </>
  )
}
