import { useState } from 'react'
import { Link } from 'react-router-dom'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export default function InquiryPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('이름, 이메일, 문의 내용은 필수 항목입니다.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${BASE_URL}/public/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <div className="inquiry-page">
        <div className="inquiry-container">
          <div className="inquiry-success">
            <div className="inquiry-success-icon">
              <i className="ri-check-line" />
            </div>
            <h2>문의가 접수되었습니다</h2>
            <p>담당자가 확인 후 빠르게 연락드리겠습니다.</p>
            <Link to="/" className="btn-primary inquiry-home-btn">
              <i className="ri-home-line" /> 홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="inquiry-page">
      <div className="inquiry-container">
        <Link to="/" className="inquiry-back">
          <i className="ri-arrow-left-line" /> 돌아가기
        </Link>

        <div className="inquiry-header">
          <div className="inquiry-badge">Business</div>
          <h1>비즈니스 플랜 문의</h1>
          <p>대규모 DM 발송, 전담 매니저, API 연동이 필요하신가요?<br />아래 양식을 작성해 주시면 빠르게 연락드리겠습니다.</p>
        </div>

        <form className="inquiry-form" onSubmit={handleSubmit}>
          <div className="inquiry-row">
            <div className="inquiry-field">
              <label>이름 <span className="required">*</span></label>
              <input
                type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="홍길동" maxLength={50} required
              />
            </div>
            <div className="inquiry-field">
              <label>이메일 <span className="required">*</span></label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="example@company.com" required
              />
            </div>
          </div>
          <div className="inquiry-row">
            <div className="inquiry-field">
              <label>회사명</label>
              <input
                type="text" name="company" value={form.company} onChange={handleChange}
                placeholder="(주) 회사명" maxLength={100}
              />
            </div>
            <div className="inquiry-field">
              <label>연락처</label>
              <input
                type="tel" name="phone" value={form.phone} onChange={handleChange}
                placeholder="010-0000-0000" maxLength={20}
              />
            </div>
          </div>
          <div className="inquiry-field">
            <label>문의 내용 <span className="required">*</span></label>
            <textarea
              name="message" value={form.message} onChange={handleChange}
              placeholder="예상 월 DM 발송량, 필요한 기능, 궁금한 점 등을 자유롭게 작성해 주세요."
              rows={6} maxLength={2000} required
            />
            <span className="inquiry-char-count">{form.message.length} / 2,000</span>
          </div>

          {error && <div className="inquiry-error"><i className="ri-error-warning-line" /> {error}</div>}

          <button type="submit" className="btn-primary inquiry-submit" disabled={submitting}>
            {submitting ? (
              <><i className="ri-loader-4-line ri-spin" /> 접수 중...</>
            ) : (
              <><i className="ri-send-plane-line" /> 문의 접수</>
            )}
          </button>
        </form>

        <div className="inquiry-features">
          <div className="inquiry-feature">
            <i className="ri-infinity-line" />
            <span>무제한 DM 발송</span>
          </div>
          <div className="inquiry-feature">
            <i className="ri-user-star-line" />
            <span>전담 매니저</span>
          </div>
          <div className="inquiry-feature">
            <i className="ri-code-s-slash-line" />
            <span>API & Webhook</span>
          </div>
          <div className="inquiry-feature">
            <i className="ri-shield-check-line" />
            <span>SLA 보장</span>
          </div>
        </div>
      </div>
    </div>
  )
}
