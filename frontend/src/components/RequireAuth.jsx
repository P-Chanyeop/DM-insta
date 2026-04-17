import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../api/client'

/**
 * 보호 라우트 가드 (S51 fix)
 * - localStorage에 authToken 없으면 /login으로 리다이렉트
 * - 원래 목적지 경로를 state.from 에 담아 로그인 후 복귀 가능
 */
export default function RequireAuth({ children }) {
  const location = useLocation()
  const token = getToken()

  useEffect(() => {
    if (!token) {
      // 한 번만 안내 (react StrictMode 중복 방지는 Toast 내부에서 처리)
      // Toast Provider가 없는 경우도 있어 console 폴백
      // 실제 메시지는 로그인 화면에서도 렌더 가능
    }
  }, [token])

  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return children
}

/** 404 페이지로 떨어뜨리기 위한 캐치올 — 필요 시 확장 */
export function NotFoundRedirect() {
  return <Navigate to="/404" replace />
}
