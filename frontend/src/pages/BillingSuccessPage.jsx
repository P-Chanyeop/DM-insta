import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { billingService } from '../api/services'

/**
 * 토스페이먼츠 빌링키 발급 성공 콜백 페이지.
 *
 * 토스가 successUrl 로 리다이렉트하면서 쿼리에 authKey + customerKey 를 넘긴다.
 * 서버에 이 값들을 전달해 billingKey 교환 + 첫 결제를 수행한 뒤 settings 로 돌아간다.
 */
export default function BillingSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing') // processing | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    const authKey = params.get('authKey')
    const customerKey = params.get('customerKey')

    let ctx = null
    try {
      const raw = sessionStorage.getItem('toss_billing_ctx')
      if (raw) ctx = JSON.parse(raw)
    } catch { /* ignore */ }

    if (!authKey || !customerKey || !ctx?.planType || !ctx?.orderId) {
      setStatus('error')
      setErrorMsg('결제 정보가 올바르지 않습니다. 다시 시도해주세요.')
      return
    }

    ;(async () => {
      try {
        await billingService.confirmBillingAuth({
          authKey,
          customerKey,
          planType: ctx.planType,
          orderId: ctx.orderId,
        })
        sessionStorage.removeItem('toss_billing_ctx')
        setStatus('success')
        // 설정 페이지로 이동 — 성공 토스트 트리거를 위해 쿼리 추가
        setTimeout(() => navigate('/app/settings?tab=billing&billing=success', { replace: true }), 800)
      } catch (e) {
        setStatus('error')
        setErrorMsg(e?.message || '결제 처리 중 오류가 발생했습니다.')
      }
    })()
  }, [params, navigate])

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        {status === 'processing' && (
          <>
            <div style={spinnerStyle} />
            <h2 style={titleStyle}>결제를 확인하고 있습니다</h2>
            <p style={descStyle}>잠시만 기다려주세요. 이 화면을 닫지 말아주세요.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ ...iconStyle, color: '#10B981' }}><i className="ri-checkbox-circle-fill" /></div>
            <h2 style={titleStyle}>결제가 완료되었습니다</h2>
            <p style={descStyle}>곧 설정 페이지로 이동합니다.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ ...iconStyle, color: '#EF4444' }}><i className="ri-error-warning-fill" /></div>
            <h2 style={titleStyle}>결제 처리에 실패했습니다</h2>
            <p style={descStyle}>{errorMsg}</p>
            <button
              style={btnStyle}
              onClick={() => navigate('/app/settings?tab=billing', { replace: true })}
            >
              요금제 페이지로 돌아가기
            </button>
          </>
        )}
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
  background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)',
}

const cardStyle = {
  maxWidth: 440,
  width: '100%',
  padding: '3rem 2rem',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  textAlign: 'center',
}

const titleStyle = { fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0 0.5rem', color: '#1E293B' }
const descStyle = { color: '#64748B', marginBottom: '1.5rem' }
const iconStyle = { fontSize: '4rem', lineHeight: 1 }

const spinnerStyle = {
  width: 48,
  height: 48,
  margin: '0 auto',
  border: '4px solid #E2E8F0',
  borderTop: '4px solid #2563EB',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

const btnStyle = {
  padding: '12px 24px',
  background: '#2563EB',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
}
