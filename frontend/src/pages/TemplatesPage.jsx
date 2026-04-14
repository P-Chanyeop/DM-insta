import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import { templateService } from '../api/services'

const CATEGORIES = ['전체', '쇼핑몰', '예약/서비스', '이벤트', '리드수집', '고객지원']


export default function TemplatesPage() {
  const navigate = useNavigate()
  const [activeCat, setActiveCat] = useState('전체')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    setError('')
    try {
      const data = await templateService.list()
      setTemplates(data || [])
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
      navigate('/app/flows/builder', { state: { template: result || tpl } })
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
