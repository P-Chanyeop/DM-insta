import { useState, useEffect } from 'react'
import { sequenceService } from '../api/services'

export default function SequencesPage() {
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  useEffect(() => {
    loadSequences()
  }, [])

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

  async function handleCreate(e) {
    e.preventDefault()
    if (!formData.name.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const newSeq = await sequenceService.create({
        name: formData.name,
        description: formData.description,
      })
      setSequences((prev) => [...prev, newSeq])
      setFormData({ name: '', description: '' })
      setShowForm(false)
    } catch (err) {
      setCreateError(err.message || '시퀀스 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id) {
    const prev = sequences
    setSequences((s) => s.map((seq) => (seq.id === id ? { ...seq, active: !seq.active } : seq)))
    try {
      await sequenceService.toggle(id)
    } catch {
      setSequences(prev)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('이 시퀀스를 삭제하시겠습니까?')) return
    const prev = sequences
    setSequences((s) => s.filter((seq) => seq.id !== id))
    try {
      await sequenceService.delete(id)
    } catch {
      setSequences(prev)
    }
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
              {createError && (
                <div style={{ color: '#ff4d6a', fontSize: 14 }}>
                  {createError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn-primary" disabled={creating || !formData.name.trim()}>
                  {creating ? '생성 중...' : '생성'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setCreateError(null) }}>
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
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          <i className="ri-error-warning-line" style={{ fontSize: 48, display: 'block', marginBottom: 12, color: '#ff4d6a' }} />
          <p style={{ marginBottom: 16 }}>{error}</p>
          <button className="btn-primary" onClick={loadSequences}>
            <i className="ri-refresh-line" /> 다시 시도
          </button>
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
