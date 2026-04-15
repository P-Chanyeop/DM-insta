import { useState } from 'react'
import { userService } from '../api/services'
import { getStoredUser, setStoredUser } from '../api/client'

const INDUSTRIES = [
  { id: 'shopping', icon: 'ri-shopping-bag-line', label: '쇼핑몰 / 의류', desc: '패션, 뷰티, 잡화 등 온라인 판매' },
  { id: 'food', icon: 'ri-restaurant-line', label: '식품 / F&B', desc: '식품, 음료, 카페, 레스토랑' },
  { id: 'beauty', icon: 'ri-heart-pulse-line', label: '뷰티 / 헬스', desc: '화장품, 피트니스, 건강' },
  { id: 'education', icon: 'ri-book-open-line', label: '교육 / 코칭', desc: '온라인 강의, 컨설팅, 멘토링' },
  { id: 'service', icon: 'ri-calendar-check-line', label: '예약 / 서비스', desc: '미용실, 네일, 사진, 예약 기반 서비스' },
  { id: 'content', icon: 'ri-camera-line', label: '콘텐츠 / 인플루언서', desc: '크리에이터, 블로거, 유튜버' },
  { id: 'realestate', icon: 'ri-building-line', label: '부동산 / 인테리어', desc: '공인중개, 인테리어, 건설' },
  { id: 'other', icon: 'ri-apps-line', label: '기타', desc: '위에 해당하지 않는 업종' },
]

export default function IndustrySelectModal({ onComplete }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const user = getStoredUser()
      await userService.updateMe({ name: user?.name || '사용자', industry: selected })
      // 로컬 스토리지에도 반영
      if (user) {
        setStoredUser({ ...user, industry: selected })
      }
    } catch {
      // 실패해도 로컬에 저장하여 모달 재표시 방지
      const user = getStoredUser()
      if (user) setStoredUser({ ...user, industry: selected })
    } finally {
      setSaving(false)
      onComplete(selected)
    }
  }

  const handleSkip = () => {
    const user = getStoredUser()
    if (user) setStoredUser({ ...user, industry: 'skipped' })
    onComplete('skipped')
  }

  return (
    <div className="industry-modal-overlay">
      <div className="industry-modal">
        <div className="industry-modal-header">
          <div className="industry-modal-icon">
            <i className="ri-store-2-line" />
          </div>
          <h2>업종을 선택해 주세요</h2>
          <p>맞춤 템플릿과 자동화 추천을 위해 업종을 알려주세요.</p>
        </div>

        <div className="industry-grid">
          {INDUSTRIES.map(ind => (
            <button
              key={ind.id}
              className={`industry-card${selected === ind.id ? ' selected' : ''}`}
              onClick={() => setSelected(ind.id)}
            >
              <i className={ind.icon} />
              <strong>{ind.label}</strong>
              <span>{ind.desc}</span>
            </button>
          ))}
        </div>

        <div className="industry-modal-actions">
          <button className="btn-ghost" onClick={handleSkip}>나중에 선택</button>
          <button className="btn-primary" disabled={!selected || saving} onClick={handleSave}>
            {saving ? <><i className="ri-loader-4-line spin" /> 저장 중...</> : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export { INDUSTRIES }
