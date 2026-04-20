import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
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
  'ref-link': { icon: 'ri-links-line', color: 'orange', label: 'Ref 링크', description: '출처별로 추적 가능한 고유 URL' },
  'qr-code': { icon: 'ri-qr-code-line', color: 'purple', label: 'QR 코드', description: '스캔하면 인스타 DM으로 연결' },
  'widget': { icon: 'ri-code-s-slash-line', color: 'green', label: '웹 위젯', description: '방문자를 인스타 DM으로 유도' },
  'json-api': { icon: 'ri-braces-line', color: 'teal', label: 'JSON API', description: '외부 시스템에서 자동화 트리거' },
}

function parseConfig(configStr) {
  if (!configStr) return {}
  try { return JSON.parse(configStr) } catch { return {} }
}

function mapBackendToFrontend(backendTool) {
  const frontendType = BACKEND_TYPE_MAP[backendTool.type] || backendTool.type
  const meta = TOOL_META[frontendType] || { icon: 'ri-tools-line', color: 'gray', label: '도구', description: '' }
  return {
    id: backendTool.id,
    type: frontendType,
    name: backendTool.name || meta.label,
    icon: meta.icon,
    color: meta.color,
    label: meta.label,
    description: meta.description,
    refUrl: backendTool.refUrl || '',
    clickCount: backendTool.clickCount || 0,
    active: backendTool.active,
    createdAt: backendTool.createdAt,
    config: parseConfig(backendTool.config),
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
    <button className="icon-btn" title={copied ? '복사됨!' : '복사'} onClick={() => copyToClipboard(text, setCopied)}>
      <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'} />
    </button>
  )
}

function UrlBox({ value }) {
  if (!value) return null
  return (
    <div className="gt-link-box">
      <input type="text" value={value} readOnly />
      <CopyButton text={value} />
    </div>
  )
}

/* ── Ref Link Card ── */
function RefLinkCard({ tool }) {
  const trackingUrl = tool.config.trackingUrl || tool.refUrl || ''
  return (
    <>
      <UrlBox value={trackingUrl} />
      <div className="gt-card-footer">
        <div className="gt-stat-chips">
          <span className="gt-chip"><i className="ri-cursor-line" /> {tool.clickCount}회 클릭</span>
          <span className={`gt-chip ${tool.active ? 'active' : 'inactive'}`}>
            <i className={tool.active ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} />
            {tool.active ? '활성' : '비활성'}
          </span>
        </div>
      </div>
    </>
  )
}

/* ── QR Code Card ── */
function QrCodeCard({ tool }) {
  const [size, setSize] = useState(tool.config.size || 256)
  const [fg, setFg] = useState(tool.config.foreground || '#000000')
  const [bg, setBg] = useState(tool.config.background || '#FFFFFF')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const trackingUrl = tool.config.trackingUrl || tool.refUrl || ''

  useEffect(() => {
    if (!trackingUrl) { setQrDataUrl(''); return }
    QRCode.toDataURL(trackingUrl, {
      width: 200, margin: 2, color: { dark: fg, light: bg },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [trackingUrl, fg, bg])

  const handleDownload = async () => {
    if (!trackingUrl) return
    try {
      const url = await QRCode.toDataURL(trackingUrl, {
        width: size, margin: 2, color: { dark: fg, light: bg },
        errorCorrectionLevel: 'M',
      })
      const a = document.createElement('a')
      a.href = url
      a.download = `qr_${tool.name || 'code'}_${size}px.png`
      a.click()
    } catch { /* silent */ }
  }

  return (
    <>
      <div className="gt-qr-preview">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" style={{ width: 120, height: 120, borderRadius: 8 }} />
        ) : (
          <div className="qr-placeholder"><i className="ri-qr-code-line" /></div>
        )}
      </div>
      <div className="gt-controls">
        <label className="gt-control">
          <span>크기</span>
          <select value={size} onChange={e => setSize(Number(e.target.value))}>
            <option value={128}>128px</option>
            <option value={256}>256px</option>
            <option value={512}>512px</option>
            <option value={1024}>1024px</option>
          </select>
        </label>
        <label className="gt-control">
          <span>전경색</span>
          <div className="gt-color-swatch" style={{ background: fg }}>
            <input type="color" value={fg} onChange={e => setFg(e.target.value)} />
          </div>
        </label>
        <label className="gt-control">
          <span>배경색</span>
          <div className="gt-color-swatch" style={{ background: bg, border: '1px solid var(--gray-200)' }}>
            <input type="color" value={bg} onChange={e => setBg(e.target.value)} />
          </div>
        </label>
      </div>
      <UrlBox value={trackingUrl} />
      <div className="gt-card-footer">
        <div className="gt-stat-chips">
          <span className="gt-chip"><i className="ri-cursor-line" /> {tool.clickCount}회 클릭</span>
        </div>
        <button className="btn-secondary btn-sm" onClick={handleDownload} disabled={!trackingUrl}>
          <i className="ri-download-2-line" /> 다운로드
        </button>
      </div>
    </>
  )
}

/* ── Widget Card ── */
function WidgetCard({ tool }) {
  const [color, setColor] = useState(tool.config.bubbleColor || '#E1306C')
  const [position, setPosition] = useState(tool.config.position || 'bottom-right')
  const [greeting, setGreeting] = useState(tool.config.greetingText || '')
  const [codeCopied, setCodeCopied] = useState(false)

  const installCode = `<script src="https://cdn.dmbot.kr/widget.js"\n  data-color="${color}"\n  data-position="${position}"\n  data-greeting="${greeting}"\n  data-account="${tool.config.account || 'your_account'}">\n</script>`

  return (
    <>
      <div className="gt-widget-preview-box">
        <div className="widget-bubble" style={{ backgroundColor: color }}>
          <i className="ri-instagram-line" />
        </div>
      </div>
      <div className="gt-controls">
        <label className="gt-control">
          <span>버블 색상</span>
          <div className="gt-color-swatch" style={{ background: color }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          </div>
        </label>
        <label className="gt-control">
          <span>위치</span>
          <select value={position} onChange={e => setPosition(e.target.value)}>
            <option value="bottom-right">우하단</option>
            <option value="bottom-left">좌하단</option>
          </select>
        </label>
        <label className="gt-control gt-control-wide">
          <span>인사말</span>
          <input type="text" value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="안녕하세요! DM으로 문의하세요" />
        </label>
      </div>
      <div className="gt-code-block">
        <pre><code>{installCode}</code></pre>
        <button className={`btn-overlay-copy ${codeCopied ? 'copied' : ''}`} onClick={() => copyToClipboard(installCode, setCodeCopied)}>
          <i className={codeCopied ? 'ri-check-line' : 'ri-file-copy-line'} /> {codeCopied ? '복사됨' : '복사'}
        </button>
      </div>
      <div className="gt-card-footer">
        <div className="gt-stat-chips">
          <span className="gt-chip"><i className="ri-cursor-line" /> {tool.clickCount}회 클릭</span>
        </div>
      </div>
    </>
  )
}

/* ── JSON API Card ── */
function JsonApiCard({ tool }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const endpoint = tool.config.endpoint || tool.refUrl || `${window.location.origin}/api/public/growth-tools/${tool.id}`

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(endpoint, { method: 'GET' })
      setTestResult(res.ok
        ? { ok: true, message: `HTTP ${res.status} — 정상 응답` }
        : { ok: false, message: `HTTP ${res.status} — 에러` })
    } catch (err) {
      setTestResult({ ok: false, message: `연결 실패: ${err.message}` })
    } finally { setTesting(false) }
  }

  return (
    <>
      <div className="gt-label">API 엔드포인트</div>
      <UrlBox value={endpoint} />
      {testResult && (
        <div className={`gt-test-result ${testResult.ok ? 'success' : 'error'}`}>
          <i className={testResult.ok ? 'ri-check-line' : 'ri-close-line'} /> {testResult.message}
        </div>
      )}
      <div className="gt-card-footer">
        <div className="gt-stat-chips">
          <span className="gt-chip"><i className="ri-cursor-line" /> {tool.clickCount}회 클릭</span>
          <span className={`gt-chip ${tool.active ? 'active' : 'inactive'}`}>
            <i className={tool.active ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} />
            {tool.active ? '활성' : '비활성'}
          </span>
        </div>
        <button className="btn-secondary btn-sm" onClick={handleTest} disabled={testing}>
          {testing ? <><i className="ri-loader-4-line spin" /> 테스트 중</> : <><i className="ri-play-line" /> API 테스트</>}
        </button>
      </div>
    </>
  )
}

/* ── Card Wrapper ── */
const CARD_MAP = { 'ref-link': RefLinkCard, 'qr-code': QrCodeCard, 'widget': WidgetCard, 'json-api': JsonApiCard }

function ToolCard({ tool, onDelete }) {
  const CardContent = CARD_MAP[tool.type]
  return (
    <div className="growth-tool-card">
      <div className="gt-card-header">
        <div className={`gt-icon ${tool.color}`}><i className={tool.icon} /></div>
        {onDelete && (
          <button className="icon-btn gt-delete-btn" title="삭제" onClick={() => onDelete(tool.id)}>
            <i className="ri-delete-bin-line" />
          </button>
        )}
      </div>
      <h4>{tool.name}</h4>
      <p className="gt-desc">{tool.description}</p>
      {CardContent ? <CardContent tool={tool} /> : (
        <div className="gt-stat-chips"><span className="gt-chip"><i className="ri-cursor-line" /> {tool.clickCount}회</span></div>
      )}
    </div>
  )
}

/* ── Main Page ── */
export default function GrowthPage() {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const confirmDialog = useConfirm()
  const toast = useToast()

  const loadTools = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await growthToolService.list()
      setTools(Array.isArray(data) ? data.map(mapBackendToFrontend) : [])
    } catch {
      setError('성장 도구를 불러오는 데 실패했습니다.')
      setTools([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTools() }, [loadTools])

  const handleDelete = async (id) => {
    const tool = tools.find(t => t.id === id)
    const ok = await confirmDialog({
      title: '성장 도구 삭제',
      message: `"${tool?.name || '도구'}"를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제', cancelText: '취소', variant: 'danger', icon: 'ri-delete-bin-line',
    })
    if (!ok) return
    try {
      await growthToolService.delete(id)
      setTools(prev => prev.filter(t => t.id !== id))
      toast.success('성장 도구가 삭제되었습니다.')
    } catch { toast.error('삭제에 실패했습니다.') }
  }

  const handleCreate = async (type) => {
    const meta = TOOL_META[type]
    const backendType = FRONTEND_TYPE_MAP[type]
    if (!backendType) return
    try {
      const data = await growthToolService.create({ type: backendType, name: meta?.label ? `새 ${meta.label}` : type })
      if (data) setTools(prev => [...prev, mapBackendToFrontend(data)])
      toast.success('성장 도구가 생성되었습니다.')
    } catch (e) { toast.error(e.message || '도구 생성에 실패했습니다.') }
    setShowAddMenu(false)
  }

  const addOptions = [
    { type: 'ref-link', label: 'Ref 링크', icon: 'ri-links-line', desc: '추적 가능한 고유 URL' },
    { type: 'qr-code', label: 'QR 코드', icon: 'ri-qr-code-line', desc: 'DM 연결 QR 코드' },
    { type: 'widget', label: '웹 위젯', icon: 'ri-code-s-slash-line', desc: '사이트에 채팅 버블 설치' },
    { type: 'json-api', label: 'JSON API', icon: 'ri-braces-line', desc: '외부 연동 엔드포인트' },
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
                  <button key={opt.type} className="dropdown-item" onClick={() => handleCreate(opt.type)}>
                    <i className={opt.icon} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoader text="성장 도구를 불러오는 중..." />
      ) : error ? (
        <div className="empty-state">
          <i className="ri-error-warning-line" />
          <p>{error}</p>
          <button className="btn-secondary" onClick={loadTools}><i className="ri-refresh-line" /> 다시 시도</button>
        </div>
      ) : tools.length === 0 ? (
        <EmptyState icon="ri-seedling-line" title="아직 성장 도구가 없습니다" description="위의 '새 도구 추가' 버튼으로 첫 번째 성장 도구를 만들어 보세요" />
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
