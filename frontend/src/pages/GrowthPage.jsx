import { useState, useEffect, useCallback } from 'react'
import { growthToolService } from '../api/services'

/* ── Backend type mapping ── */
const BACKEND_TYPE_MAP = {
  REF_LINK: 'ref-link',
  QR_CODE: 'qr-code',
  WEBSITE_WIDGET: 'widget',
  JSON_API: 'json-api',
}

const FRONTEND_TYPE_MAP = {
  'ref-link': 'REF_LINK',
  'qr-code': 'QR_CODE',
  'widget': 'WEBSITE_WIDGET',
  'json-api': 'JSON_API',
}

const TOOL_META = {
  'ref-link': { icon: 'ri-links-line', color: 'orange', description: '출처별로 추적 가능한 고유 URL을 생성하세요' },
  'qr-code': { icon: 'ri-qr-code-line', color: 'purple', description: '스캔하면 인스타 DM으로 연결되는 QR 코드를 생성하세요' },
  'widget': { icon: 'ri-code-s-slash-line', color: 'green', description: '웹사이트에 설치하면 방문자를 인스타 DM으로 유도하는 위젯' },
  'json-api': { icon: 'ri-braces-line', color: 'teal', description: '외부 시스템에서 자동화를 트리거할 수 있는 API 엔드포인트' },
}

function parseConfig(configStr) {
  if (!configStr) return {}
  try {
    return JSON.parse(configStr)
  } catch {
    return {}
  }
}

function mapBackendToFrontend(backendTool) {
  const frontendType = BACKEND_TYPE_MAP[backendTool.type] || backendTool.type
  const meta = TOOL_META[frontendType] || { icon: 'ri-tools-line', color: 'gray', description: '' }
  const config = parseConfig(backendTool.config)

  return {
    id: backendTool.id,
    type: frontendType,
    name: backendTool.name || meta.description,
    icon: meta.icon,
    color: meta.color,
    description: meta.description,
    refUrl: backendTool.refUrl || '',
    clickCount: backendTool.clickCount || 0,
    active: backendTool.active,
    createdAt: backendTool.createdAt,
    config,
  }
}

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

/* ── Ref Link Card ── */
function RefLinkCard({ tool }) {
  const trackingUrl = tool.config.trackingUrl || tool.refUrl || ''

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      {trackingUrl && (
        <div className="gt-link-box">
          <input type="text" value={trackingUrl} readOnly />
          <CopyButton text={trackingUrl} />
        </div>
      )}

      <div className="gt-stat">
        <i className="ri-cursor-line" /> 총 클릭: <strong>{tool.clickCount}건</strong>
      </div>

      {tool.refUrl && (
        <>
          <div className="gt-section-title">원본 URL</div>
          <div className="gt-link-box">
            <input type="text" value={tool.refUrl} readOnly />
            <CopyButton text={tool.refUrl} />
          </div>
        </>
      )}

      <div className="gt-stat muted">
        <i className={tool.active ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} />
        {' '}상태: {tool.active ? '활성' : '비활성'}
      </div>
    </div>
  )
}

/* ── QR Code Card ── */
function QrCodeCard({ tool }) {
  const [size, setSize] = useState(tool.config.size || 256)
  const [fg, setFg] = useState(tool.config.foreground || '#000000')
  const [bg, setBg] = useState(tool.config.background || '#FFFFFF')
  const [downloadMsg, setDownloadMsg] = useState('')

  const trackingUrl = tool.config.trackingUrl || tool.refUrl || ''

  const handleDownload = () => {
    if (!trackingUrl) {
      setDownloadMsg('추적 URL이 없습니다.')
      setTimeout(() => setDownloadMsg(''), 3000)
      return
    }
    // Google Charts QR API로 이미지 생성 후 다운로드
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(trackingUrl)}&chco=${fg.replace('#', '')}|${bg.replace('#', '')}&chld=M|2`
    const link = document.createElement('a')
    // Fetch as blob to force download
    fetch(qrUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        link.href = url
        link.download = `qr_${tool.name || 'code'}_${size}px.png`
        link.click()
        URL.revokeObjectURL(url)
        setDownloadMsg('다운로드 완료!')
        setTimeout(() => setDownloadMsg(''), 2000)
      })
      .catch(() => {
        // Fallback: open in new tab
        window.open(qrUrl, '_blank')
        setDownloadMsg('새 탭에서 QR 코드를 확인하세요.')
        setTimeout(() => setDownloadMsg(''), 3000)
      })
  }

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      <div className="gt-qr-preview">
        {trackingUrl ? (
          <img
            src={`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(trackingUrl)}&chco=${fg.replace('#', '')}&chld=M|2`}
            alt="QR Code"
            style={{ width: '200px', height: '200px', borderRadius: '0.5rem', background: bg }}
          />
        ) : (
          <div className="qr-placeholder" style={{ color: fg, backgroundColor: bg }}>
            <i className="ri-qr-code-line" />
            <span>QR 코드 미리보기</span>
            <span className="qr-size-label">{size} x {size}px</span>
          </div>
        )}
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

      {trackingUrl && (
        <div className="gt-link-box">
          <input type="text" value={trackingUrl} readOnly />
          <CopyButton text={trackingUrl} />
        </div>
      )}

      <button className="btn-primary" style={{ width: '100%' }} onClick={handleDownload}>
        <i className="ri-download-2-line" /> QR 코드 다운로드
      </button>
      {downloadMsg && (
        <div className="gt-test-result" style={{ marginTop: 8 }}>
          <i className="ri-information-line" /> {downloadMsg}
        </div>
      )}
      <div className="gt-stat muted">
        <i className="ri-cursor-line" /> 총 클릭: {tool.clickCount}회
      </div>
    </div>
  )
}

/* ── Widget Card ── */
function WidgetCard({ tool }) {
  const [color, setColor] = useState(tool.config.bubbleColor || '#E1306C')
  const [position, setPosition] = useState(tool.config.position || 'bottom-right')
  const [greeting, setGreeting] = useState(tool.config.greetingText || '')
  const [codeCopied, setCodeCopied] = useState(false)

  const installCode = `<script src="https://cdn.dmbot.kr/widget.js"
  data-color="${color}"
  data-position="${position}"
  data-greeting="${greeting}"
  data-account="${tool.config.account || 'my_brand_kr'}">
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
        <i className="ri-cursor-line" /> 총 클릭: {tool.clickCount}회
      </div>
    </div>
  )
}

/* ── JSON API Card ── */
function JsonApiCard({ tool }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showKey, setShowKey] = useState(false)

  const endpoint = tool.config.endpoint || tool.refUrl || `${window.location.origin}/api/growth-tools/${tool.id}`
  const webhookUrl = tool.config.webhookUrl || ''
  const apiKey = tool.config.apiKey || ''

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch(endpoint, { method: 'GET' })
      if (response.ok) {
        setTestResult({ ok: true, status: response.status, message: `성공: HTTP ${response.status} 응답을 받았습니다` })
      } else {
        setTestResult({ ok: false, status: response.status, message: `실패: HTTP ${response.status} 에러가 발생했습니다` })
      }
    } catch (err) {
      setTestResult({ ok: false, status: 0, message: `실패: 엔드포인트에 연결할 수 없습니다 (${err.message})` })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="growth-tool-card">
      <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
      <h4>{tool.name}</h4>
      <p>{tool.description}</p>

      <div className="gt-section-title">API 엔드포인트</div>
      <div className="gt-link-box">
        <input type="text" value={endpoint} readOnly />
        <CopyButton text={endpoint} />
      </div>

      {webhookUrl && (
        <>
          <div className="gt-section-title">Webhook URL</div>
          <div className="gt-link-box">
            <input type="text" value={webhookUrl} readOnly />
            <CopyButton text={webhookUrl} />
          </div>
        </>
      )}

      {apiKey && (
        <>
          <div className="gt-section-title">API Key</div>
          <div className="gt-link-box api-key-box">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              readOnly
            />
            <button className="icon-btn" title={showKey ? '숨기기' : '보기'} onClick={() => setShowKey(!showKey)}>
              <i className={showKey ? 'ri-eye-off-line' : 'ri-eye-line'} />
            </button>
            <CopyButton text={apiKey} />
          </div>
        </>
      )}

      <div className="gt-stat-row">
        <div className="gt-stat"><i className="ri-cursor-line" /> 총 클릭: {tool.clickCount}회</div>
        <div className="gt-stat">
          <i className={tool.active ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} />
          {' '}{tool.active ? '활성' : '비활성'}
        </div>
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
    case 'ref-link': return <RefLinkCard tool={tool} />
    case 'qr-code': return <QrCodeCard tool={tool} />
    case 'widget': return <WidgetCard tool={tool} />
    case 'json-api': return <JsonApiCard tool={tool} />
    default: return (
      <div className="growth-tool-card">
        <div className={`gt-icon gray`}><i className="ri-tools-line" /></div>
        <h4>{tool.name || '알 수 없는 도구'}</h4>
        <p>타입: {tool.type}</p>
        <div className="gt-stat muted">
          <i className="ri-cursor-line" /> 총 클릭: {tool.clickCount}회
        </div>
      </div>
    )
  }
}

/* ── Main Page ── */
export default function GrowthPage() {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const loadTools = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await growthToolService.list()
      if (data && Array.isArray(data)) {
        setTools(data.map(mapBackendToFrontend))
      } else {
        setTools([])
      }
    } catch (err) {
      setError('성장 도구를 불러오는 데 실패했습니다.')
      setTools([])
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
    const meta = TOOL_META[type]
    const backendType = FRONTEND_TYPE_MAP[type]
    if (!backendType) return

    try {
      const data = await growthToolService.create({
        type: backendType,
        name: meta ? null : type,
      })
      if (data) setTools(prev => [...prev, mapBackendToFrontend(data)])
    } catch {
      // silent
    }
    setShowAddMenu(false)
  }

  const addOptions = [
    { type: 'ref-link', label: 'Ref 링크', icon: 'ri-links-line' },
    { type: 'qr-code', label: 'QR 코드', icon: 'ri-qr-code-line' },
    { type: 'widget', label: '웹사이트 위젯', icon: 'ri-code-s-slash-line' },
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
      ) : error ? (
        <div className="empty-state">
          <i className="ri-error-warning-line" />
          <p>{error}</p>
          <button className="btn-secondary" onClick={loadTools}>
            <i className="ri-refresh-line" /> 다시 시도
          </button>
        </div>
      ) : tools.length === 0 ? (
        <div className="empty-state">
          <i className="ri-seedling-line" style={{ fontSize: 48, color: 'var(--gray-400)' }} />
          <h3>아직 성장 도구가 없습니다</h3>
          <p>위의 "새 도구 추가" 버튼으로 첫 번째 성장 도구를 만들어보세요.</p>
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
