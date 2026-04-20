import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const INQUIRY_TYPES = [
  { value: '기능 문의', label: '기능 문의' },
  { value: '버그 신고', label: '버그 신고' },
  { value: '결제 문의', label: '결제 문의' },
  { value: '기타', label: '기타' },
]

export default function SupportPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ type: '기능 문의', title: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim() || !form.content.trim()) {
      setError('제목과 내용은 필수 항목입니다.')
      return
    }
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE_URL}/public/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || '문의 접수에 실패했습니다.')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="inquiry-page" style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
        <div className="inquiry-container" style={{ maxWidth: 560, width: '100%' }}>
          <div className="inquiry-success" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="inquiry-success-icon" style={{ fontSize: 48, color: '#10B981', marginBottom: 16 }}>
              <i className="ri-check-line" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>문의가 접수되었습니다</h2>
            <p style={{ color: '#64748B', margin: '0 0 24px' }}>담당자가 확인 후 빠르게 답변드리겠습니다.</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/app')}
              style={{ padding: '10px 24px', borderRadius: 8 }}
            >
              <i className="ri-home-line" /> 대시보드로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="inquiry-page" style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div className="inquiry-container" style={{ maxWidth: 560, width: '100%' }}>
        <div className="inquiry-header" style={{ marginBottom: 32 }}>
          <div className="inquiry-badge" style={{
            display: 'inline-block', background: '#EEF2FF', color: '#4F46E5',
            fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, marginBottom: 12
          }}>Support</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>1:1 문의</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            궁금한 점이나 불편한 점이 있으시면 아래 양식을 작성해 주세요.<br />
            빠르게 확인 후 답변드리겠습니다.
          </p>
        </div>

        <form className="inquiry-form" onSubmit={handleSubmit}>
          <div className="inquiry-field" style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              문의 유형 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="setting-input"
              style={{ width: '100%', height: 40, borderRadius: 8 }}
            >
              {INQUIRY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="inquiry-field" style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              제목 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="문의 제목을 입력해 주세요"
              maxLength={100}
              required
              className="setting-input"
              style={{ width: '100%', borderRadius: 8 }}
            />
          </div>

          <div className="inquiry-field" style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              내용 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="문의 내용을 자세히 작성해 주세요."
              rows={8}
              maxLength={3000}
              required
              className="setting-input"
              style={{ width: '100%', borderRadius: 8, resize: 'vertical', minHeight: 160 }}
            />
            <span style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, display: 'block', textAlign: 'right' }}>
              {form.content.length} / 3,000
            </span>
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, color: '#DC2626', fontSize: 13
            }}>
              <i className="ri-error-warning-line" /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ width: '100%', padding: '12px 0', borderRadius: 8, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {submitting ? (
              <><i className="ri-loader-4-line ri-spin" /> 접수 중...</>
            ) : (
              <><i className="ri-send-plane-line" /> 문의 접수</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
