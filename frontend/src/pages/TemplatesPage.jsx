import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import { templateService } from '../api/services'
import { getStoredUser } from '../api/client'
import { INDUSTRIES } from '../components/IndustrySelectModal'

// 백엔드 enum → 한글 라벨 (S13 fix)
const CATEGORY_LABELS = {
  SHOPPING: '쇼핑몰',
  BOOKING: '예약/서비스',
  EVENT: '이벤트',
  LEAD: '리드수집',
  SUPPORT: '고객지원',
}
const CATEGORIES = ['전체', '쇼핑몰', '예약/서비스', '이벤트', '리드수집', '고객지원']

// 업종별 추천 카테고리 매핑 (한글 라벨 기준)
const INDUSTRY_CATEGORY_MAP = {
  shopping: ['쇼핑몰', '이벤트'],
  food: ['쇼핑몰', '이벤트', '고객지원'],
  beauty: ['예약/서비스', '쇼핑몰'],
  education: ['리드수집', '고객지원'],
  service: ['예약/서비스', '고객지원'],
  content: ['리드수집', '이벤트'],
  realestate: ['리드수집', '고객지원'],
  other: [],
}

// 카테고리별 기본 아이콘/그라디언트 (백엔드가 제공하지 않을 때 fallback)
const CATEGORY_VISUAL = {
  SHOPPING:  { icon: 'ri-shopping-bag-line',  bg: 'linear-gradient(135deg, #f472b6, #fb923c)' },
  BOOKING:   { icon: 'ri-calendar-check-line', bg: 'linear-gradient(135deg, #60a5fa, #818cf8)' },
  EVENT:     { icon: 'ri-gift-line',           bg: 'linear-gradient(135deg, #fb7185, #f59e0b)' },
  LEAD:      { icon: 'ri-user-add-line',       bg: 'linear-gradient(135deg, #34d399, #06b6d4)' },
  SUPPORT:   { icon: 'ri-customer-service-2-line', bg: 'linear-gradient(135deg, #a78bfa, #ec4899)' },
}

/** 백엔드 Response DTO를 프론트 카드 shape로 정규화 */
function normalizeTemplate(raw) {
  const visual = CATEGORY_VISUAL[raw.category] || { icon: 'ri-file-list-3-line', bg: 'linear-gradient(135deg, #94a3b8, #64748b)' }
  return {
    id: raw.id,
    title: raw.name || '제목 없음',
    desc: raw.description || '',
    categoryKey: raw.category, // 원본 enum
    category: CATEGORY_LABELS[raw.category] || raw.category || '기타',
    icon: raw.icon || visual.icon,
    bg: raw.gradientColors || visual.bg,
    previewImageUrl: raw.previewImageUrl || null,
    uses: raw.usageCount || 0,
    rating: raw.rating ? raw.rating.toFixed(1) : null,
    flowData: raw.flowData,
  }
}

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [activeCat, setActiveCat] = useState('전체')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const storedUser = useMemo(() => getStoredUser(), [])
  const userIndustry = storedUser?.industry || null
  const industryLabel = useMemo(() => {
    if (!userIndustry || userIndustry === 'skipped') return null
    const found = INDUSTRIES.find((i) => i.id === userIndustry)
    return found ? found.label : null
  }, [userIndustry])
  const recommendedCategories = useMemo(() => {
    if (!userIndustry || userIndustry === 'skipped') return []
    return INDUSTRY_CATEGORY_MAP[userIndustry] || []
  }, [userIndustry])

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    setError('')
    try {
      const data = await templateService.list()
      setTemplates((data || []).map(normalizeTemplate))
    } catch {
      setError('템플릿을 불러올 수 없습니다. 다시 시도해주세요.')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  async function handleUse(tpl) {
    try {
      const result = await templateService.use(tpl.id)
      if (result?.id) {
        navigate(`/app/flows/builder/${result.id}`)
      } else {
        navigate('/app/flows/builder', { state: { flowId: result?.id, template: result || tpl } })
      }
    } catch {
      navigate('/app/flows/builder', { state: { template: tpl } })
    }
  }

  function formatNumber(n) {
    if (typeof n === 'string') return n
    return n.toLocaleString()
  }

  const filtered = templates.filter((t) => {
    const matchesCat = activeCat === '전체' || t.category === activeCat
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      (t.title || '').toLowerCase().includes(q) ||
      (t.desc || '').toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })

  const recommended = useMemo(() => {
    if (recommendedCategories.length === 0) return []
    return templates.filter((t) => recommendedCategories.includes(t.category))
  }, [templates, recommendedCategories])

  return (
    <>
      <div className="page-header">
        <div>
          <h2>템플릿 갤러리</h2>
          <p>검증된 자동화 템플릿으로 빠르게 시작하세요</p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{
          position: 'relative', maxWidth: 400,
          background: '#F8FAFC', borderRadius: 12,
          border: '1px solid #E2E8F0',
          transition: 'all 0.2s',
        }}>
          <i
            className="ri-search-line"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 18 }}
          />
          <input
            type="text"
            placeholder="템플릿 이름, 카테고리로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: 40, paddingRight: 14,
              width: '100%', height: 44,
              border: 'none', background: 'transparent',
              fontSize: 14, color: '#1E293B',
              outline: 'none', borderRadius: 12,
            }}
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

      {/* 업종별 추천 섹션 */}
      {!loading && !error && recommended.length > 0 && activeCat === '전체' && !search.trim() && (
        <div className="template-recommend-section">
          <div className="template-recommend-header">
            <i className="ri-sparkling-line" />
            <span>{industryLabel} 추천 템플릿</span>
          </div>
          <div className="templates-app-grid" style={{ marginBottom: 32 }}>
            {recommended.slice(0, 4).map((t) => (
              <div className="template-app-card recommended" key={`rec-${t.id}`}>
                <div className="recommend-badge">
                  <i className="ri-thumb-up-fill" /> 추천
                </div>
                <div className="tac-preview">
                  {t.previewImageUrl ? (
                    <img src={t.previewImageUrl} alt={t.title} className="tac-preview-img" />
                  ) : (
                    <div className="tac-icon" style={{ background: t.bg }}>
                      <i className={t.icon} />
                    </div>
                  )}
                </div>
                <div className="tac-body">
                  <h4>{t.title}</h4>
                  <p>{t.desc}</p>
                  <div className="tac-meta">
                    <span>
                      <i className="ri-download-2-line" /> {formatNumber(t.uses)}
                    </span>
                    {t.rating && <span>
                      <i className="ri-star-fill" /> {t.rating}
                    </span>}
                  </div>
                  <button className="btn-primary small" onClick={() => handleUse(t)}>
                    사용하기
                  </button>
                </div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 16 }}>전체 템플릿</h3>
        </div>
      )}

      {error ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>
          <i className="ri-error-warning-line" style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
          <p>{error}</p>
          <button className="btn-primary" onClick={loadTemplates} style={{ marginTop: 12 }}>
            <i className="ri-refresh-line" /> 다시 시도
          </button>
        </div>
      ) : loading ? (
        <PageLoader text="템플릿을 불러오는 중..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="ri-file-search-line" title="조건에 맞는 템플릿이 없습니다" description="다른 카테고리를 선택하거나 검색어를 변경해 보세요" />
      ) : (
        <div className="templates-app-grid">
          {filtered.map((t) => (
            <div className="template-app-card" key={t.id}>
              <div className="tac-preview">
                {t.previewImageUrl ? (
                  <img src={t.previewImageUrl} alt={t.title} className="tac-preview-img" />
                ) : (
                  <div className="tac-icon" style={{ background: t.bg }}>
                    <i className={t.icon} />
                  </div>
                )}
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
