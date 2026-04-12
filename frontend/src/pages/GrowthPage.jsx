import { useState, useEffect, useCallback } from 'react'
import { growthToolService } from '../api/services'

const DEFAULT_TOOLS = [
  {
    id: 'dm-link',
    type: 'dm-link',
    name: 'm.me / ig.me 링크',
    icon: 'ri-link',
    color: 'blue',
    description: '클릭하면 바로 DM 대화가 시작되는 링크를 생성하세요',
    link: 'https://ig.me/m/my_brand_kr?ref=welcome',
    clicks: 342,
    refLinks: [
      { id: 'r1', label: 'welcome', url: 'https://ig.me/m/my_brand_kr?ref=welcome', clicks: 215 },
      { id: 'r2', label: 'promo', url: 'https://ig.me/m/my_brand_kr?ref=promo', clicks: 127 },
    ],
  },
  {
    id: 'qr-code',
    type: 'qr-code',
    name: 'QR 코드',
    icon: 'ri-qr-code-line',
    color: 'purple',
    description: '스캔하면 인스타 DM으로 연결되는 QR 코드를 생성하세요',
    link: 'https://ig.me/m/my_brand_kr?ref=qr',
    downloads: 48,
    size: 256,
    foreground: '#000000',
    background: '#FFFFFF',
  },
  {
    id: 'widget',
    type: 'widget',
    name: '웹사이트 위젯',
    icon: 'ri-code-s-slash-line',
    color: 'green',
    description: '웹사이트에 설치하면 방문자를 인스타 DM으로 유도하는 위젯',
    bubbleColor: '#E1306C',
    position: 'bottom-right',
    greetingText: '안녕하세요! DM으로 문의하세요 :)',
    installs: 12,
  },
  {
    id: 'ref-url',
    type: 'ref-url',
    name: 'Ref URL',
    icon: 'ri-links-line',
    color: 'orange',
    description: '출처별로 추적 가능한 고유 URL을 생성하세요',
    urls: [
      { id: 'u1', name: '네이버 블로그', url: 'https://ig.me/m/my_brand_kr?ref=naver_blog', clicks: 128 },
      { id: 'u2', name: '카카오톡', url: 'https://ig.me/m/my_brand_kr?ref=kakaotalk', clicks: 89 },
      { id: 'u3', name: '유튜브', url: 'https://ig.me/m/my_brand_kr?ref=youtube', clicks: 56 },
    ],
  },
  {
    id: 'comment-auto',
    type: 'comment-auto',
    name: '댓글 자동화',
    icon: 'ri-chat-3-line',
    color: 'pink',
    description: '게시물 댓글에 특정 키워드가 포함되면 자동으로 DM을 발송합니다',
    triggers: [
      { id: 't1', postTitle: '신제품 출시 안내', keyword: '가격', replies: 67, active: true },
      { id: 't2', postTitle: '이벤트 참여 방법', keyword: '참여', replies: 134, active: true },
      { id: 't3', postTitle: '봄 시즌 할인', keyword: '할인', replies: 23, active: false },
    ],
    keywords: ['가격', '참여', '할인', '예약', '문의', '구매'],
  },
  {
    id: 'json-api',
    type: 'json-api',
    name: 'JSON API',
    icon: 'ri-braces-line',
    color: 'teal',
    description: '외부 시스템에서 자동화를 트리거할 수 있는 API 엔드포인트',
    endpoint: 'https://api.dmbot.kr/v1/trigger',
    webhookUrl: 'https://api.dmbot.kr/v1/webhooks/abc123',
    apiKey: 'sk-dm-xxxxxxxxxxxx',
    lastCalled: '2분 전',
    totalCalls: 1247,
  },
]

function copyToClipboard(text, setCopied) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  })
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="icon-btn"
      title={copied ? '복사됨!' : '복사'}
      onClick={() => copyToClipboard(text, setCopied)}
    >
      <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'} />
    </button>
  )
}

/* ── DM Link Card ── */
function DmLinkCard({ tool }) {
  const [showNewRef, setShowNewRef] = useState(false)
  const [newRefLabel, setNewRefLabel] = useState('')
  const [refLinks, setRefLinks] = useState(tool.refLinks || [])

  const handleCreateRef = () => {
    if (!newRefLabel.trim()) return
    const newRef = {
      id: `r${Date.now()}`,
      label: newRefLabel.trim(),
      url: `https://ig.me/m/my_brand_kr?ref=${newRefLabel.trim()}`,
      clicks: 0,
    }
    setRefLinks(prev => [...prev, newRef])
    setNewRefLabel('')
    setShowNewRef(false)
  }

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      <div className="gt-link-box">
        <input type="text" value={tool.link} readOnly />
        <CopyButton text={tool.link} />
      </div>
      <div className="gt-stat">
        <i className="ri-cursor-line" /> 이번 주 총 클릭: <strong>{tool.clicks}건</strong>
      </div>

      <div className="gt-section-title">Ref 링크 목록</div>
      <div className="ref-link-list">
        {refLinks.map(ref => (
          <div className="ref-link-item" key={ref.id}>
            <div className="ref-link-info">
              <span className="ref-label">{ref.label}</span>
              <span className="ref-url-text">{ref.url}</span>
            </div>
            <div className="ref-link-actions">
              <span className="ref-click-count">{ref.clicks} 클릭</span>
              <CopyButton text={ref.url} />
            </div>
          </div>
        ))}
      </div>

      {showNewRef ? (
        <div className="gt-inline-form">
          <input
            type="text"
            placeholder="Ref 라벨 (예: summer_sale)"
            value={newRefLabel}
            onChange={e => setNewRefLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateRef()}
          />
          <button className="btn-primary btn-sm" onClick={handleCreateRef}>생성</button>
          <button className="btn-ghost btn-sm" onClick={() => setShowNewRef(false)}>취소</button>
        </div>
      ) : (
        <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setShowNewRef(true)}>
          <i className="ri-add-line" /> 새 Ref 링크 만들기
        </button>
      )}
    </div>
  )
}

/* ── QR Code Card ── */
function QrCodeCard({ tool }) {
  const [size, setSize] = useState(tool.size || 256)
  const [fg, setFg] = useState(tool.foreground || '#000000')
  const [bg, setBg] = useState(tool.background || '#FFFFFF')

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      <div className="gt-qr-preview">
        <div className="qr-placeholder" style={{ color: fg, backgroundColor: bg }}>
          <i className="ri-qr-code-line" />
          <span>QR 코드 미리보기</span>
          <span className="qr-size-label">{size} x {size}px</span>
        </div>
      </div>

      <div className="gt-customize-row">
        <label>
          크기
          <select value={size} onChange={e => setSize(Number(e.target.value))}>
            <option value={128}>128px</option>
            <option value={256}>256px</option>
            <option value={512}>512px</option>
            <option value={1024}>1024px</option>
          </select>
        </label>
        <label>
          전경색
          <input type="color" value={fg} onChange={e => setFg(e.target.value)} />
        </label>
        <label>
          배경색
          <input type="color" value={bg} onChange={e => setBg(e.target.value)} />
        </label>
      </div>

      <div className="gt-link-box">
        <input type="text" value={tool.link} readOnly />
        <CopyButton text={tool.link} />
      </div>

      <button className="btn-primary" style={{ width: '100%' }}>
        <i className="ri-download-2-line" /> QR 코드 다운로드
      </button>
      <div className="gt-stat muted">
        <i className="ri-download-line" /> 총 다운로드: {tool.downloads}회
      </div>
    </div>
  )
}

/* ── Widget Card ── */
function WidgetCard({ tool }) {
  const [color, setColor] = useState(tool.bubbleColor || '#E1306C')
  const [position, setPosition] = useState(tool.position || 'bottom-right')
  const [greeting, setGreeting] = useState(tool.greetingText || '')
  const [codeCopied, setCodeCopied] = useState(false)

  const installCode = `<script src="https://cdn.dmbot.kr/widget.js"
  data-color="${color}"
  data-position="${position}"
  data-greeting="${greeting}"
  data-account="my_brand_kr">
</script>`

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      <div className="gt-widget-preview">
        <div className="widget-mockup">
          <div className="widget-bubble" style={{ backgroundColor: color }}>
            <i className="ri-instagram-line" />
          </div>
          {greeting && <div className="widget-greeting">{greeting}</div>}
        </div>
        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          채팅 버블 미리보기 ({position === 'bottom-right' ? '오른쪽 하단' : '왼쪽 하단'})
        </span>
      </div>

      <div className="gt-customize-section">
        <div className="gt-customize-row">
          <label>
            버블 색상
            <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          </label>
          <label>
            위치
            <select value={position} onChange={e => setPosition(e.target.value)}>
              <option value="bottom-right">오른쪽 하단</option>
              <option value="bottom-left">왼쪽 하단</option>
            </select>
          </label>
        </div>
        <label className="gt-full-label">
          인사 메시지
          <input
            type="text"
            value={greeting}
            onChange={e => setGreeting(e.target.value)}
            placeholder="안녕하세요! DM으로 문의하세요"
          />
        </label>
      </div>

      <div className="gt-code-block">
        <pre><code>{installCode}</code></pre>
        <button
          className={`btn-overlay-copy ${codeCopied ? 'copied' : ''}`}
          onClick={() => copyToClipboard(installCode, setCodeCopied)}
        >
          <i className={codeCopied ? 'ri-check-line' : 'ri-file-copy-line'} />
          {codeCopied ? '복사됨' : '복사'}
        </button>
      </div>

      <button
        className="btn-secondary"
        style={{ width: '100%' }}
        onClick={() => copyToClipboard(installCode, setCodeCopied)}
      >
        <i className="ri-code-line" /> 설치 코드 복사
      </button>
      <div className="gt-stat muted">
        <i className="ri-global-line" /> 설치된 사이트: {tool.installs}개
      </div>
    </div>
  )
}

/* ── Ref URL Card ── */
function RefUrlCard({ tool }) {
  const [urls, setUrls] = useState(tool.urls || [])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRef, setNewRef] = useState('')

  const handleCreate = () => {
    if (!newName.trim() || !newRef.trim()) return
    setUrls(prev => [
      ...prev,
      {
        id: `u${Date.now()}`,
        name: newName.trim(),
        url: `https://ig.me/m/my_brand_kr?ref=${newRef.trim()}`,
        clicks: 0,
      },
    ])
    setNewName('')
    setNewRef('')
    setShowForm(false)
  }

  const totalClicks = urls.reduce((sum, u) => sum + u.clicks, 0)

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      <div className="gt-stat">
        <i className="ri-cursor-line" /> 전체 클릭: <strong>{totalClicks}건</strong>
      </div>

      <div className="ref-url-list">
        {urls.map(u => (
          <div className="ref-url-item" key={u.id}>
            <div className="ref-url-info">
              <span className="ref-name">{u.name}</span>
              <span className="ref-url-text">{u.url}</span>
            </div>
            <div className="ref-url-actions">
              <span className="ref-count">{u.clicks} 클릭</span>
              <CopyButton text={u.url} />
            </div>
          </div>
        ))}
        {urls.length === 0 && (
          <div className="empty-state-sm">아직 Ref URL이 없습니다</div>
        )}
      </div>

      {showForm ? (
        <div className="gt-inline-form stacked">
          <input
            type="text"
            placeholder="이름 (예: 네이버 블로그)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Ref 값 (예: naver_blog)"
            value={newRef}
            onChange={e => setNewRef(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <div className="gt-form-actions">
            <button className="btn-primary btn-sm" onClick={handleCreate}>생성</button>
            <button className="btn-ghost btn-sm" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      ) : (
        <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setShowForm(true)}>
          <i className="ri-add-line" /> 새 Ref URL 만들기
        </button>
      )}
    </div>
  )
}

/* ── Comment Automation Card ── */
function CommentAutoCard({ tool }) {
  const [triggers, setTriggers] = useState(tool.triggers || [])
  const [keywords] = useState(tool.keywords || [])

  const toggleTrigger = (id) => {
    setTriggers(prev =>
      prev.map(t => t.id === id ? { ...t, active: !t.active } : t)
    )
  }

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      <div className="gt-section-title">게시물 트리거</div>
      <div className="comment-trigger-list">
        {triggers.map(t => (
          <div className={`comment-trigger-item ${t.active ? 'active' : 'inactive'}`} key={t.id}>
            <div className="trigger-info">
              <span className="trigger-post">{t.postTitle}</span>
              <span className="trigger-meta">
                키워드: <strong>{t.keyword}</strong> &middot; {t.replies}회 반응
              </span>
            </div>
            <button
              className={`toggle-btn ${t.active ? 'on' : 'off'}`}
              onClick={() => toggleTrigger(t.id)}
            >
              <span className="toggle-track"><span className="toggle-thumb" /></span>
            </button>
          </div>
        ))}
      </div>

      <div className="gt-section-title">등록된 키워드</div>
      <div className="keyword-tags">
        {keywords.map(kw => (
          <span className="keyword-tag" key={kw}>{kw}</span>
        ))}
      </div>

      <button className="btn-secondary" style={{ width: '100%', marginTop: 12 }}>
        <i className="ri-add-line" /> 새 트리거 추가
      </button>
    </div>
  )
}

/* ── JSON API Card ── */
function JsonApiCard({ tool }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showKey, setShowKey] = useState(false)

  const handleTest = () => {
    setTesting(true)
    setTestResult(null)
    setTimeout(() => {
      setTesting(false)
      setTestResult({ ok: true, status: 200, message: '성공: 트리거가 정상적으로 실행되었습니다' })
    }, 1500)
  }

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      <div className="gt-section-title">API 엔드포인트</div>
      <div className="gt-link-box">
        <input type="text" value={tool.endpoint} readOnly />
        <CopyButton text={tool.endpoint} />
      </div>

      <div className="gt-section-title">Webhook URL</div>
      <div className="gt-link-box">
        <input type="text" value={tool.webhookUrl} readOnly />
        <CopyButton text={tool.webhookUrl} />
      </div>

      <div className="gt-section-title">API Key</div>
      <div className="gt-link-box api-key-box">
        <input
          type={showKey ? 'text' : 'password'}
          value={tool.apiKey}
          readOnly
        />
        <button className="icon-btn" title={showKey ? '숨기기' : '보기'} onClick={() => setShowKey(!showKey)}>
          <i className={showKey ? 'ri-eye-off-line' : 'ri-eye-line'} />
        </button>
        <CopyButton text={tool.apiKey} />
      </div>

      <div className="gt-stat-row">
        <div className="gt-stat"><i className="ri-time-line" /> 마지막 호출: {tool.lastCalled}</div>
        <div className="gt-stat"><i className="ri-bar-chart-line" /> 총 호출: {tool.totalCalls}회</div>
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%' }}
        onClick={handleTest}
        disabled={testing}
      >
        {testing ? (
          <><i className="ri-loader-4-line spin" /> 테스트 중...</>
        ) : (
          <><i className="ri-play-line" /> API 테스트</>
        )}
      </button>
      {testResult && (
        <div className={`gt-test-result ${testResult.ok ? 'success' : 'error'}`}>
          <i className={testResult.ok ? 'ri-check-line' : 'ri-close-line'} />
          {testResult.message}
        </div>
      )}
    </div>
  )
}

/* ── Card Renderer ── */
function ToolCard({ tool }) {
  switch (tool.type) {
    case 'dm-link': return <DmLinkCard tool={tool} />
    case 'qr-code': return <QrCodeCard tool={tool} />
    case 'widget': return <WidgetCard tool={tool} />
    case 'ref-url': return <RefUrlCard tool={tool} />
    case 'comment-auto': return <CommentAutoCard tool={tool} />
    case 'json-api': return <JsonApiCard tool={tool} />
    default: return null
  }
}

/* ── Main Page ── */
export default function GrowthPage() {
  const [tools, setTools] = useState(DEFAULT_TOOLS)
  const [loading, setLoading] = useState(true)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const loadTools = useCallback(async () => {
    try {
      setLoading(true)
      const data = await growthToolService.list()
      if (data && Array.isArray(data) && data.length > 0) {
        setTools(data)
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTools() }, [loadTools])

  const handleDelete = async (id) => {
    try {
      await growthToolService.delete(id)
      setTools(prev => prev.filter(t => t.id !== id))
    } catch {
      // silent
    }
  }

  const handleCreate = async (type) => {
    try {
      const data = await growthToolService.create({ type })
      if (data) setTools(prev => [...prev, data])
    } catch {
      // silent
    }
    setShowAddMenu(false)
  }

  const addOptions = [
    { type: 'dm-link', label: 'm.me / ig.me 링크', icon: 'ri-link' },
    { type: 'qr-code', label: 'QR 코드', icon: 'ri-qr-code-line' },
    { type: 'widget', label: '웹사이트 위젯', icon: 'ri-code-s-slash-line' },
    { type: 'ref-url', label: 'Ref URL', icon: 'ri-links-line' },
    { type: 'comment-auto', label: '댓글 자동화', icon: 'ri-chat-3-line' },
    { type: 'json-api', label: 'JSON API', icon: 'ri-braces-line' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2>성장 도구</h2>
          <p>더 많은 구독자를 확보하기 위한 도구들</p>
        </div>
        <div className="header-actions">
          <div className="dropdown-wrapper">
            <button className="btn-primary" onClick={() => setShowAddMenu(!showAddMenu)}>
              <i className="ri-add-line" /> 새 도구 추가
            </button>
            {showAddMenu && (
              <div className="dropdown-menu">
                {addOptions.map(opt => (
                  <button
                    key={opt.type}
                    className="dropdown-item"
                    onClick={() => handleCreate(opt.type)}
                  >
                    <i className={opt.icon} /> {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">
          <i className="ri-loader-4-line spin" /> 성장 도구를 불러오는 중...
        </div>
      ) : (
        <div className="growth-tools-grid">
          {tools.map(tool => (
            <ToolCard key={tool.id} tool={tool} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  )
}
