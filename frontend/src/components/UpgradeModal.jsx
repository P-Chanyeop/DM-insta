import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function UpgradeModal({ open, onClose, feature, description }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleUpgrade = () => {
    onClose()
    navigate('/app/settings', { state: { tab: 'billing' } })
  }

  return (
    <div className="upgrade-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="upgrade-modal">
        <button className="upgrade-close" onClick={onClose}>
          <i className="ri-close-line" />
        </button>
        <div className="upgrade-icon">
          <i className="ri-vip-crown-2-line" />
        </div>
        <h3>업그레이드가 필요합니다</h3>
        <p className="upgrade-feature">{feature}</p>
        <p className="upgrade-desc">
          {description || '이 기능은 프로 플랜 이상에서 사용할 수 있습니다. 업그레이드하여 모든 기능을 활용하세요.'}
        </p>
        <div className="upgrade-benefits">
          <div className="upgrade-benefit"><i className="ri-check-line" /> 월 최대 30,000건 DM 발송</div>
          <div className="upgrade-benefit"><i className="ri-check-line" /> 무제한 플로우 & 자동화</div>
          <div className="upgrade-benefit"><i className="ri-check-line" /> AI 자동 응답</div>
          <div className="upgrade-benefit"><i className="ri-check-line" /> 브로드캐스팅 & 시퀀스</div>
        </div>
        <div className="upgrade-actions">
          <button className="btn-primary upgrade-btn" onClick={handleUpgrade}>
            <i className="ri-vip-crown-2-line" /> 프로 플랜으로 업그레이드
          </button>
          <button className="btn-ghost" onClick={onClose}>나중에</button>
        </div>
      </div>
    </div>
  )
}

/** Inline badge for locked features */
export function ProBadge({ onClick }) {
  return (
    <span className="pro-badge" onClick={onClick} title="프로 플랜 전용 기능">
      <i className="ri-vip-crown-2-line" /> PRO
    </span>
  )
}

/** Quota warning bar */
export function QuotaBar({ current, max, label, loading }) {
  if (max === Infinity) return null
  if (loading) {
    return (
      <div className="quota-bar">
        <div className="quota-info">
          <span>{label}</span>
          <span className="quota-nums">불러오는 중...</span>
        </div>
        <div className="quota-track">
          <div className="quota-fill" style={{ width: 0 }} />
        </div>
      </div>
    )
  }
  const pct = Math.min(100, Math.round((current / max) * 100))
  const isNear = pct >= 80
  const isFull = pct >= 100

  return (
    <div className={`quota-bar ${isFull ? 'full' : isNear ? 'near' : ''}`}>
      <div className="quota-info">
        <span>{label}</span>
        <span className="quota-nums">{current.toLocaleString()} / {max === Infinity ? '무제한' : max.toLocaleString()}</span>
      </div>
      <div className="quota-track">
        <div className="quota-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
