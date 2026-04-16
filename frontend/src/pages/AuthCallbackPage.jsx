import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken, setStoredUser } from '../api/client'

/**
 * Facebook/Instagram OAuth 콜백 페이지
 * URL: /auth/callback?token=JWT&email=...&name=...
 * 또는: /auth/callback?error=...&reason=...
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const email = params.get('email')
    const name = params.get('name')
    const err = params.get('error')

    if (err) {
      const reason = params.get('reason')
      setError(reason || err)
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    if (token) {
      setToken(token)
      setStoredUser({ email, name, plan: 'FREE', emailVerified: true })
      // 온보딩 완료 여부에 따라 라우팅
      const onboardingDone = localStorage.getItem('onboarding_completed') === 'true'
      navigate(onboardingDone ? '/app' : '/app/onboarding', { replace: true })
    } else {
      setError('토큰이 전달되지 않았습니다.')
      setTimeout(() => navigate('/login'), 3000)
    }
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)',
      flexDirection: 'column',
      gap: 16,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {error ? (
        <>
          <i className="ri-error-warning-line" style={{ fontSize: 48, color: '#ef4444' }} />
          <h2 style={{ margin: 0, color: '#1f2937' }}>로그인에 실패했습니다</h2>
          <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: 400 }}>{error}</p>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>잠시 후 로그인 페이지로 이동합니다...</p>
        </>
      ) : (
        <>
          <i className="ri-loader-4-line spin" style={{ fontSize: 48, color: '#7c3aed' }} />
          <h2 style={{ margin: 0, color: '#1f2937' }}>로그인 처리 중...</h2>
          <p style={{ color: '#6b7280' }}>잠시만 기다려주세요</p>
        </>
      )}
    </div>
  )
}
