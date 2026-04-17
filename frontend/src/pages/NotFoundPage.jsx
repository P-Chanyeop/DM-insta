import { Link, useNavigate } from 'react-router-dom'
import { getToken } from '../api/client'

/**
 * 404 Not Found 페이지 (S54 fix)
 * - 존재하지 않는 경로 접근 시 표시
 * - 로그인 상태면 대시보드로, 아니면 홈으로 복귀 링크
 */
export default function NotFoundPage() {
  const navigate = useNavigate()
  const loggedIn = !!getToken()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
      background: 'linear-gradient(180deg, #f8f9fb 0%, #ecf0f4 100%)',
    }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{
          fontSize: 96,
          fontWeight: 800,
          color: '#6366f1',
          marginBottom: 8,
          letterSpacing: '-0.05em',
          lineHeight: 1,
        }}>404</div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: '8px 0 12px' }}>
          페이지를 찾을 수 없습니다
        </h1>

        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, margin: '0 0 32px' }}>
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.<br />
          URL을 다시 확인하거나 아래 버튼을 이용해 주세요.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← 이전 페이지
          </button>
          <Link
            to={loggedIn ? '/app' : '/'}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: '#6366f1',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {loggedIn ? '대시보드로 이동' : '홈으로 이동'}
          </Link>
        </div>

        <div style={{ marginTop: 48, fontSize: 12, color: '#9ca3af' }}>
          문제가 지속되면 고객지원으로 문의해주세요.
        </div>
      </div>
    </div>
  )
}
