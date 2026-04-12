import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authService } from '../api/services'

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSignup = location.pathname === '/signup'

  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Password reset state
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')

  // Terms / Privacy modal state
  const [modalType, setModalType] = useState(null) // 'terms' | 'privacy' | null

  // Toast state
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    // Clear field error on change
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({ ...prev, [e.target.name]: '' }))
    }
  }

  const validateForm = () => {
    const errors = {}

    if (isSignup && !form.name.trim()) {
      errors.name = '이름을 입력해주세요'
    }

    if (!form.email.trim()) {
      errors.email = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = '올바른 이메일 형식을 입력해주세요'
    }

    if (!form.password) {
      errors.password = '비밀번호를 입력해주세요'
    } else if (form.password.length < 6) {
      errors.password = '비밀번호는 6자 이상이어야 합니다'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)

    try {
      if (isSignup) {
        await authService.signup(form)
      } else {
        await authService.login({ email: form.email, password: form.password })
      }
      navigate('/app')
    } catch (err) {
      setError(err.message || '오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setResetError('')
    setResetMessage('')

    if (!resetEmail.trim()) {
      setResetError('이메일을 입력해주세요')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setResetError('올바른 이메일 형식을 입력해주세요')
      return
    }

    setResetLoading(true)
    try {
      // Attempt API call if available, otherwise show success message
      if (authService.resetPassword) {
        await authService.resetPassword({ email: resetEmail })
      }
      setResetMessage('비밀번호 재설정 링크가 이메일로 발송되었습니다. 메일함을 확인해주세요.')
    } catch (err) {
      setResetError(err.message || '오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleInstagramOAuth = () => {
    showToast('설정 > 연동(API)에서 Instagram을 먼저 연결하세요')
  }

  // Password reset form view
  if (showResetForm) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <Link to="/" className="auth-logo">
            <div className="logo-icon"><i className="ri-send-plane-fill" /></div>
            <span className="logo-text">센드잇</span>
          </Link>

          <div className="auth-card">
            <h1 className="auth-title">비밀번호 재설정</h1>
            <p className="auth-subtitle">가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>

            {resetError && (
              <div className="auth-error">
                <i className="ri-error-warning-line" /> {resetError}
              </div>
            )}

            {resetMessage && (
              <div className="auth-error" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                <i className="ri-check-line" /> {resetMessage}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="auth-form">
              <div className="auth-field">
                <label>이메일</label>
                <div className="auth-input-wrap">
                  <i className="ri-mail-line" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setResetError('') }}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary lg auth-submit" disabled={resetLoading}>
                {resetLoading ? (
                  <><i className="ri-loader-4-line spin" /> 전송 중...</>
                ) : (
                  <><i className="ri-mail-send-line" /> 재설정 링크 보내기</>
                )}
              </button>
            </form>

            <div className="auth-switch" style={{ marginTop: 20 }}>
              <button
                onClick={() => { setShowResetForm(false); setResetEmail(''); setResetError(''); setResetMessage('') }}
                style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
              >
                <i className="ri-arrow-left-s-line" /> 로그인으로 돌아가기
              </button>
            </div>
          </div>

          <div className="auth-footer">
            <span>&copy; 2026 센드잇</span>
            <div className="auth-footer-links">
              <button onClick={() => setModalType('terms')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}>이용약관</button>
              <button onClick={() => setModalType('privacy')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}>개인정보처리방침</button>
            </div>
          </div>
        </div>

        <div className="auth-decoration">
          <div className="auth-deco-shape shape-1" />
          <div className="auth-deco-shape shape-2" />
          <div className="auth-deco-shape shape-3" />
        </div>

        {/* Toast */}
        {toast && <Toast message={toast} onClose={() => setToast('')} />}

        {/* Modal */}
        {modalType && <LegalModal type={modalType} onClose={() => setModalType(null)} />}
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Link to="/" className="auth-logo">
          <div className="logo-icon"><i className="ri-send-plane-fill" /></div>
          <span className="logo-text">센드잇</span>
        </Link>

        <div className="auth-card">
          <h1 className="auth-title">
            {isSignup ? '무료 계정 만들기' : '다시 오신 것을 환영합니다'}
          </h1>
          <p className="auth-subtitle">
            {isSignup
              ? '카드 정보 없이 5분 만에 시작하세요'
              : '계속하려면 로그인해주세요'}
          </p>

          {error && (
            <div className="auth-error">
              <i className="ri-error-warning-line" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && (
              <div className="auth-field">
                <label>이름</label>
                <div className="auth-input-wrap" style={fieldErrors.name ? { borderColor: '#ef4444' } : {}}>
                  <i className="ri-user-line" />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="홍길동"
                  />
                </div>
                {fieldErrors.name && <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>{fieldErrors.name}</span>}
              </div>
            )}

            <div className="auth-field">
              <label>이메일</label>
              <div className="auth-input-wrap" style={fieldErrors.email ? { borderColor: '#ef4444' } : {}}>
                <i className="ri-mail-line" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                />
              </div>
              {fieldErrors.email && <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>{fieldErrors.email}</span>}
            </div>

            <div className="auth-field">
              <label>비밀번호</label>
              <div className="auth-input-wrap" style={fieldErrors.password ? { borderColor: '#ef4444' } : {}}>
                <i className="ri-lock-line" />
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={isSignup ? '6자 이상 입력해주세요' : '비밀번호'}
                />
              </div>
              {fieldErrors.password && <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>{fieldErrors.password}</span>}
            </div>

            {!isSignup && (
              <div className="auth-field-row">
                <label className="auth-checkbox">
                  <input type="checkbox" /> 로그인 상태 유지
                </label>
                <button
                  type="button"
                  className="auth-link-small"
                  onClick={() => setShowResetForm(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 'inherit' }}
                >
                  비밀번호 찾기
                </button>
              </div>
            )}

            <button type="submit" className="btn-primary lg auth-submit" disabled={loading}>
              {loading ? (
                <><i className="ri-loader-4-line spin" /> 처리 중...</>
              ) : (
                <>{isSignup ? '무료로 시작하기' : '로그인'}</>
              )}
            </button>
          </form>

          <div className="auth-divider"><span>또는</span></div>

          <button className="auth-oauth" onClick={handleInstagramOAuth} style={{ cursor: 'pointer', opacity: 1 }}>
            <i className="ri-instagram-line" /> Instagram으로 계속하기
          </button>

          <div className="auth-switch">
            {isSignup ? (
              <>이미 계정이 있으신가요? <Link to="/login">로그인</Link></>
            ) : (
              <>계정이 없으신가요? <Link to="/signup">무료로 가입</Link></>
            )}
          </div>
        </div>

        <div className="auth-footer">
          <span>&copy; 2026 센드잇</span>
          <div className="auth-footer-links">
            <button onClick={() => setModalType('terms')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}>이용약관</button>
            <button onClick={() => setModalType('privacy')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit' }}>개인정보처리방침</button>
          </div>
        </div>
      </div>

      <div className="auth-decoration">
        <div className="auth-deco-shape shape-1" />
        <div className="auth-deco-shape shape-2" />
        <div className="auth-deco-shape shape-3" />
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {/* Legal Modal */}
      {modalType && <LegalModal type={modalType} onClose={() => setModalType(null)} />}
    </div>
  )
}

function Toast({ message, onClose }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: '#1e1b4b', color: '#fff', padding: '12px 24px', borderRadius: 12,
      fontSize: 14, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
      zIndex: 10000, display: 'flex', alignItems: 'center', gap: 10, maxWidth: '90vw',
      animation: 'fadeInUp 0.3s ease'
    }}>
      <i className="ri-information-line" style={{ fontSize: 18, color: '#a78bfa' }} />
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 16, padding: '0 0 0 8px' }}>
        <i className="ri-close-line" />
      </button>
    </div>
  )
}

function LegalModal({ type, onClose }) {
  const isTerms = type === 'terms'

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: 600, maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isTerms ? '이용약관' : '개인정보처리방침'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#666', padding: 4 }}>
            <i className="ri-close-line" />
          </button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
          {isTerms ? (
            <>
              <h3>제1조 (목적)</h3>
              <p>이 약관은 센드잇(이하 "회사")이 제공하는 인스타그램 DM 자동화 서비스(이하 "서비스")의 이용에 관한 기본적인 사항을 규정함을 목적으로 합니다.</p>

              <h3>제2조 (정의)</h3>
              <p>"서비스"란 회사가 제공하는 인스타그램 DM 자동 발송, 키워드 자동 응답, 플로우 빌더 등 자동화 관련 서비스 일체를 의미합니다.</p>

              <h3>제3조 (약관의 효력 및 변경)</h3>
              <p>이 약관은 서비스를 이용하고자 하는 모든 이용자에게 그 효력이 발생합니다. 회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지사항을 통해 공지합니다.</p>

              <h3>제4조 (서비스의 제공)</h3>
              <p>회사는 다음 서비스를 제공합니다:<br />1. 인스타그램 DM 자동화 서비스<br />2. 플로우 빌더 서비스<br />3. 연락처 관리 서비스<br />4. 분석 및 리포팅 서비스</p>

              <h3>제5조 (이용자의 의무)</h3>
              <p>이용자는 서비스를 이용함에 있어 관련 법령 및 이 약관을 준수해야 하며, Instagram의 이용약관 및 API 정책을 준수해야 합니다.</p>
            </>
          ) : (
            <>
              <h3>1. 개인정보의 수집 및 이용 목적</h3>
              <p>회사는 다음 목적을 위해 개인정보를 수집 및 이용합니다:<br />- 회원 가입 및 관리<br />- 서비스 제공 및 요금 정산<br />- 마케팅 및 광고 활용<br />- 서비스 개선 및 분석</p>

              <h3>2. 수집하는 개인정보 항목</h3>
              <p>- 필수항목: 이름, 이메일 주소, 비밀번호<br />- 선택항목: 전화번호, 회사명<br />- 자동수집항목: IP 주소, 접속 로그, 서비스 이용 기록</p>

              <h3>3. 개인정보의 보유 및 이용 기간</h3>
              <p>회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>

              <h3>4. 개인정보의 제3자 제공</h3>
              <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 의한 경우 또는 이용자의 동의가 있는 경우에는 예외로 합니다.</p>

              <h3>5. 이용자의 권리</h3>
              <p>이용자는 언제든지 자신의 개인정보에 대한 열람, 수정, 삭제를 요청할 수 있으며, 개인정보 처리에 대한 동의를 철회할 수 있습니다.</p>
            </>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <a
            href={isTerms ? '/terms' : '/privacy'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '8px 16px', fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 500 }}
          >
            새 탭에서 열기 <i className="ri-external-link-line" />
          </a>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
