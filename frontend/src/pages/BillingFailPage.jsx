import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * 토스페이먼츠 빌링키 발급 실패 콜백 페이지.
 *
 * 사용자가 결제창을 닫거나 카드 등록에 실패하면 토스가 이 페이지로 리다이렉트한다.
 * 쿼리에 code / message 가 포함됨.
 */
export default function BillingFailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const code = params.get('code')
  const message = params.get('message') || '결제가 취소되었거나 실패했습니다.'

  // sessionStorage 컨텍스트 정리
  try { sessionStorage.removeItem('toss_billing_ctx') } catch { /* noop */ }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={iconStyle}><i className="ri-close-circle-fill" /></div>
        <h2 style={titleStyle}>결제가 완료되지 않았습니다</h2>
        <p style={descStyle}>{message}</p>
        {code && <p style={codeStyle}>오류 코드: {code}</p>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={btnPrimary} onClick={() => navigate('/app/settings?tab=billing', { replace: true })}>
            다시 시도하기
          </button>
          <button style={btnSecondary} onClick={() => navigate('/app', { replace: true })}>
            대시보드로
          </button>
        </div>
      </div>
    </div>
  )
}

const wrapStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: 'linear-gradient(135deg, #FEF2F2 0%, #F8FAFC 100%)',
}

const cardStyle = {
  maxWidth: 460,
  width: '100%',
  padding: '3rem 2rem',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  textAlign: 'center',
}

const titleStyle = { fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: '#1E293B' }
const descStyle = { color: '#64748B', marginBottom: '0.5rem' }
const codeStyle = { color: '#94A3B8', fontSize: '0.85rem', marginBottom: '1.5rem' }
const iconStyle = { fontSize: '4rem', lineHeight: 1, color: '#EF4444' }

const btnPrimary = {
  padding: '12px 24px',
  background: '#2563EB',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
}
const btnSecondary = {
  padding: '12px 24px',
  background: '#F1F5F9',
  color: '#334155',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
}
