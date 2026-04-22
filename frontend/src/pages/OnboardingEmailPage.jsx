import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api, setToken, setStoredUser } from '../api/client'
import { authService } from '../api/services'

/**
 * Instagram OAuth 직후 신규 가입 흐름에서만 진입하는 이메일 입력 페이지.
 * URL: /onboarding/email?pending_token=JWT&ig_username=...&ig_name=...
 *
 * 이메일/비밀번호/이름을 받아 POST /api/auth/complete-ig-signup 호출 →
 * 서버가 User 생성 + IG 연결 + 정식 JWT 발급.
 */
export default function OnboardingEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const pendingToken = params.get('pending_token')
  const igUsername = params.get('ig_username') || ''
  const igName = params.get('ig_name') || ''

  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: igName || igUsername || '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  // 이메일 인증 단계 — complete-ig-signup 이후 emailVerified=false 이면 이 화면으로 전환.
  const [step, setStep] = useState('signup')        // 'signup' | 'verify'
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifyMessage, setVerifyMessage] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    if (!pendingToken) {
      // 직접 접근하거나 만료 — 로그인으로
      navigate('/login', { replace: true })
    }
  }, [pendingToken, navigate])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = '이름을 입력해주세요.'
    if (!form.email.trim()) next.email = '이메일을 입력해주세요.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = '올바른 이메일 형식이 아닙니다.'
    if (!form.password) next.password = '비밀번호를 입력해주세요.'
    else if (form.password.length < 6) next.password = '비밀번호는 6자 이상이어야 합니다.'
    if (form.password !== form.passwordConfirm) next.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.post('/auth/complete-ig-signup', {
        pendingToken,
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
      })
      setToken(res.token)
      setStoredUser({
        email: res.email,
        name: res.name,
        plan: res.plan,
        emailVerified: res.emailVerified,
        onboardingCompleted: res.onboardingCompleted,
      })
      // 일반 이메일 가입과 동일하게, emailVerified=false 이면 인증 코드 입력 단계로 전환.
      if (!res.emailVerified) {
        setVerifyMessage('인증 코드가 이메일로 발송되었습니다.')
        setStep('verify')
      } else {
        window.dispatchEvent(new CustomEvent('auth:login'))
        navigate('/app/onboarding?ig_connected=true', { replace: true })
      }
    } catch (err) {
      setServerError(err.message || '가입 처리에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmitVerify = async (e) => {
    e.preventDefault()
    setVerifyError('')
    if (!verifyCode.trim()) {
      setVerifyError('인증 코드를 입력해주세요.')
      return
    }
    setVerifyLoading(true)
    try {
      await authService.verifyEmail({ email: form.email.trim(), code: verifyCode.trim() })
      window.dispatchEvent(new CustomEvent('auth:login'))
      navigate('/app/onboarding?ig_connected=true', { replace: true })
    } catch (err) {
      setVerifyError(err.message || '인증에 실패했습니다. 코드를 확인하고 다시 시도해주세요.')
    } finally {
      setVerifyLoading(false)
    }
  }

  const onResendCode = async () => {
    setResendLoading(true)
    setVerifyError('')
    try {
      await authService.resendVerification({ email: form.email.trim() })
      setVerifyMessage('인증 코드를 다시 보냈습니다. 메일함을 확인해주세요.')
    } catch (err) {
      setVerifyError(err.message || '재발송에 실패했습니다.')
    } finally {
      setResendLoading(false)
    }
  }

  if (!pendingToken) return null

  if (step === 'verify') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <i className="ri-mail-check-line" style={{ fontSize: 40, color: '#7c3aed' }} />
            <h1 style={{ fontSize: 22, margin: '12px 0 6px', color: '#1f2937' }}>
              이메일 인증
            </h1>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
              <strong>{form.email}</strong> 으로 6자리 인증 코드를 보냈습니다.
            </p>
          </div>

          <form onSubmit={onSubmitVerify} noValidate>
            <Field label="인증 코드" error={verifyError} help="메일이 안 오면 스팸함도 확인해주세요.">
              <input
                value={verifyCode}
                onChange={(e) => { setVerifyCode(e.target.value); setVerifyError('') }}
                placeholder="6자리 코드"
                maxLength={6}
                style={{ ...inputStyle(!!verifyError), letterSpacing: 4, textAlign: 'center', fontSize: 18 }}
                inputMode="numeric"
                autoFocus
              />
            </Field>

            {verifyMessage && !verifyError && (
              <div style={{
                padding: '10px 12px', borderRadius: 8, background: '#eef2ff',
                color: '#4338ca', fontSize: 13, marginBottom: 12,
              }}>
                {verifyMessage}
              </div>
            )}

            <button type="submit" disabled={verifyLoading} style={submitStyle(verifyLoading)}>
              {verifyLoading ? (
                <><i className="ri-loader-4-line spin" /> 인증 중...</>
              ) : (
                <>인증 완료하기</>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={onResendCode}
              disabled={resendLoading}
              style={{
                background: 'none', border: 'none', color: '#7c3aed', fontSize: 13,
                cursor: resendLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {resendLoading ? '재발송 중...' : '인증 코드 다시 받기'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <i className="ri-instagram-line" style={{ fontSize: 40, color: '#E1306C' }} />
          <h1 style={{ fontSize: 22, margin: '12px 0 6px', color: '#1f2937' }}>
            Instagram 인증 완료!
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            가입 마무리를 위해 이메일과 비밀번호를 설정해주세요.
          </p>
          {igUsername && (
            <p style={{ color: '#7c3aed', fontSize: 13, marginTop: 8 }}>
              연결된 Instagram: <strong>@{igUsername}</strong>
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} noValidate>
          <Field label="이름" error={errors.name}>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="홍길동"
              style={inputStyle(errors.name)}
              autoComplete="name"
            />
          </Field>

          <Field label="이메일" error={errors.email} help="영수증·비밀번호 재설정·팀 초대에 사용됩니다.">
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              style={inputStyle(errors.email)}
              autoComplete="email"
            />
          </Field>

          <Field label="비밀번호" error={errors.password}>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="6자 이상"
              style={inputStyle(errors.password)}
              autoComplete="new-password"
            />
          </Field>

          <Field label="비밀번호 확인" error={errors.passwordConfirm}>
            <input
              name="passwordConfirm"
              type="password"
              value={form.passwordConfirm}
              onChange={onChange}
              placeholder="비밀번호를 다시 입력"
              style={inputStyle(errors.passwordConfirm)}
              autoComplete="new-password"
            />
          </Field>

          {serverError && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, background: '#fef2f2',
              color: '#b91c1c', fontSize: 13, marginBottom: 12,
            }}>
              {serverError}
            </div>
          )}

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading ? (
              <><i className="ri-loader-4-line spin" /> 가입 처리 중...</>
            ) : (
              <>가입 완료하기</>
            )}
          </button>
        </form>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
          다음 로그인부터는 여기서 설정한 <strong>이메일+비밀번호</strong> 또는
          동일한 <strong>Instagram 계정</strong>으로 로그인할 수 있습니다.
        </p>
      </div>
    </div>
  )
}

function Field({ label, error, help, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{error}</div>}
      {!error && help && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{help}</div>}
    </div>
  )
}

const wrapStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)',
  fontFamily: 'system-ui, sans-serif',
}

const cardStyle = {
  width: '100%',
  maxWidth: 440,
  background: '#fff',
  borderRadius: 16,
  padding: 32,
  boxShadow: '0 10px 40px rgba(0,0,0,.08)',
}

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '10px 12px',
  border: `1px solid ${hasError ? '#dc2626' : '#d1d5db'}`,
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color .15s',
  boxSizing: 'border-box',
})

const submitStyle = (loading) => ({
  width: '100%',
  padding: '12px 16px',
  background: loading ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed, #ec4899)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: loading ? 'not-allowed' : 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
})
