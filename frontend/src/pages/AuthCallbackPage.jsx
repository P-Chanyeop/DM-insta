import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken, setStoredUser } from '../api/client'
import { userService } from '../api/services'

/**
 * Facebook/Instagram OAuth 콜백 페이지
 * URL: /auth/callback?token=JWT&email=...&name=...&ig_status=connected|none&ig_error=...&ig_reason=...
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

    // IG 연결 상태 (signup 플로우에서 전달됨)
    const igStatus = params.get('ig_status')   // "connected" | "none" | null
    const igError = params.get('ig_error')     // e.g. "NO_FB_PAGE", "NO_IG_BUSINESS", null
    const igReason = params.get('ig_reason')   // 에러 메시지

    // 쿼리 파라미터가 전혀 없으면 StrictMode 재마운트 or 잘못된 진입 — 아무 것도 하지 않음
    if (!token && !err) {
      return
    }

    let redirectTimer = null

    if (err) {
      const reason = params.get('reason')
      setError(reason || err)
      redirectTimer = setTimeout(() => navigate('/login'), 5000)
    } else if (token) {
      setToken(token)
      setStoredUser({ email, name, plan: 'FREE', emailVerified: true })

      // 백엔드에서 onboardingCompleted 조회 (모든 디바이스에 영속)
      ;(async () => {
        let onboardingDone = false
        try {
          const me = await userService.getMe()
          onboardingDone = !!me.onboardingCompleted
          // 캐시 동기화 + storedUser 업데이트
          setStoredUser({ email: me.email, name: me.name, plan: me.plan, emailVerified: true, onboardingCompleted: onboardingDone })
          if (onboardingDone && email) {
            localStorage.setItem(`onboarding_completed_${email}`, 'true')
          }
        } catch {
          // 백엔드 실패 시 localStorage 캐시 fallback
          const scopedKey = email ? `onboarding_completed_${email}` : null
          onboardingDone = scopedKey ? localStorage.getItem(scopedKey) === 'true' : false
        }

        // IG 연결 성공 여부와 무관하게 온보딩으로 이동 (이미 완료된 경우엔 대시보드)
        if (onboardingDone) {
          navigate('/app', { replace: true })
          return
        }

        // 온보딩으로 이동하면서 IG 상태 전달
        const onboardingParams = new URLSearchParams()
        if (igStatus === 'connected') {
          onboardingParams.set('ig_connected', 'true')
        } else if (igError) {
          onboardingParams.set('ig_error', igError)
          if (igReason) onboardingParams.set('ig_reason', igReason)
        }
        const qs = onboardingParams.toString()
        navigate(qs ? `/app/onboarding?${qs}` : '/app/onboarding', { replace: true })
      })()
    }

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer)
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
