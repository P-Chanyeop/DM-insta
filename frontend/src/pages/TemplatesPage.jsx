import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { templateService } from '../api/services'

const CATEGORIES = ['전체', '쇼핑몰', '예약/서비스', '이벤트', '리드수집', '고객지원']

const DEMO_TEMPLATES = [
  {
    id: 'tpl-1',
    category: '쇼핑몰',
    icon: 'ri-store-2-line',
    bg: 'linear-gradient(135deg, #FF6B9D, #C44AFF)',
    title: '쇼핑몰 상품 안내',
    desc: '댓글 키워드 → DM 상품 안내',
    uses: 3241,
    rating: 4.9,
  },
  {
    id: 'tpl-2',
    category: '예약/서비스',
    icon: 'ri-calendar-check-line',
    bg: 'linear-gradient(135deg, #4FACFE, #00F2FE)',
    title: '예약 접수 자동화',
    desc: 'DM → 날짜/시간 선택 → 확인',
    uses: 2187,
    rating: 4.8,
  },
  {
    id: 'tpl-3',
    category: '이벤트',
    icon: 'ri-gift-line',
    bg: 'linear-gradient(135deg, #43E97B, #38F9D7)',
    title: '이벤트/프로모션',
    desc: '댓글 참여 → 쿠폰 자동 발급',
    uses: 4892,
    rating: 4.9,
  },
  {
    id: 'tpl-4',
    category: '고객지원',
    icon: 'ri-customer-service-2-line',
    bg: 'linear-gradient(135deg, #FA709A, #FEE140)',
    title: '고객 상담 봇',
    desc: 'FAQ 자동응답 + 상담원 배정',
    uses: 1956,
    rating: 4.7,
  },
  {
    id: 'tpl-5',
    category: '리드수집',
    icon: 'ri-user-star-line',
    bg: 'linear-gradient(135deg, #A18CD1, #FBC2EB)',
    title: '리드 수집',
    desc: '이름/연락처/관심사 자동 수집',
    uses: 2634,
    rating: 4.8,
  },
  {
    id: 'tpl-6',
    category: '이벤트',
    icon: 'ri-megaphone-line',
    bg: 'linear-gradient(135deg, #667EEA, #764BA2)',
    title: '스토리 멘션 감사',
    desc: '멘션 → 감사 DM + 할인코드',
    uses: 1478,
    rating: 4.8,
  },
  {
    id: 'tpl-7',
    category: '쇼핑몰',
    icon: 'ri-truck-line',
    bg: 'linear-gradient(135deg, #F093FB, #F5576C)',
    title: '배송 안내 자동화',
    desc: '배송 문의 키워드 → 운송장 안내',
    uses: 1123,
    rating: 4.6,
  },
  {
    id: 'tpl-8',
    category: '리드수집',
    icon: 'ri-survey-line',
    bg: 'linear-gradient(135deg, #FFD200, #F7971E)',
    title: '설문조사 봇',
    desc: 'DM으로 간편 설문 자동 진행',
    uses: 891,
    rating: 4.5,
  },
]

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [activeCat, setActiveCat] = useState('전체')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    try {
      const data = await templateService.list()
      if (data && data.length > 0) {
        setTemplates(data)
      } else {
        setTemplates(DEMO_TEMPLATES)
      }
    } catch {
      setTemplates(DEMO_TEMPLATES)
    } finally {
      setLoading(false)
    }
  }

  async function handleUse(tpl) {
    try {
      const result = await templateService.use(tpl.id)
      navigate('/flows/builder', { state: { template: result || tpl } })
    } catch {
      navigate('/flows/builder', { state: { template: tpl } })
    }
  }

  function formatNumber(n) {
    if (typeof n === 'string') return n
    return n.toLocaleString()
  }

  const filtered = templates.filter((t) => {
    const matchesCat = activeCat === '전체' || t.category === activeCat
    const matchesSearch =
      !search.trim() ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h2>템플릿 갤러리</h2>
          <p>검증된 자동화 템플릿으로 빠르게 시작하세요</p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <i
            className="ri-search-line"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#888' }}
          />
          <input
            type="text"
            className="input"
            placeholder="템플릿 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>
      </div>

      <div className="template-categories">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`template-cat${activeCat === c ? ' active' : ''}`}
            onClick={() => setActiveCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          <i className="ri-loader-4-line" style={{ fontSize: 24 }} /> 템플릿을 불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          <i className="ri-file-search-line" style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
          <p>조건에 맞는 템플릿이 없습니다.</p>
        </div>
      ) : (
        <div className="templates-app-grid">
          {filtered.map((t) => (
            <div className="template-app-card" key={t.id}>
              <div className="tac-preview">
                <div className="tac-icon" style={{ background: t.bg }}>
                  <i className={t.icon} />
                </div>
              </div>
              <div className="tac-body">
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
                <div className="tac-meta">
                  <span>
                    <i className="ri-download-2-line" /> {formatNumber(t.uses)}
                  </span>
                  <span>
                    <i className="ri-star-fill" /> {t.rating}
                  </span>
                </div>
                <button className="btn-primary small" onClick={() => handleUse(t)}>
                  사용하기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
