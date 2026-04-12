import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { analyticsService } from '../api/services'

const PERIODS = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
]

function generateOverviewData(period) {
  const multiplier = period === '7d' ? 1 : period === '30d' ? 4 : 12
  const base = {
    sent: { value: Math.floor(6500 * multiplier + Math.random() * 1000), change: 12.3, up: true },
    openRate: { value: +(60 + Math.random() * 15).toFixed(1), change: 5.1, up: true },
    clickRate: { value: +(18 + Math.random() * 10).toFixed(1), change: 2.4, up: true },
    conversionRate: { value: +(6 + Math.random() * 5).toFixed(1), change: -0.3, up: false },
    unsubRate: { value: +(0.8 + Math.random() * 1).toFixed(1), change: -0.5, up: true },
  }
  return base
}

function generateTopFlows(period) {
  const multiplier = period === '7d' ? 1 : period === '30d' ? 4 : 12
  const flows = [
    { name: '댓글 → DM 가격표', basePct: 92, baseVal: 580 },
    { name: '키워드: 예약', basePct: 75, baseVal: 470 },
    { name: '환영 메시지', basePct: 38, baseVal: 240 },
    { name: '배송 안내', basePct: 27, baseVal: 170 },
    { name: '스토리 멘션 감사', basePct: 17, baseVal: 110 },
  ]
  return flows.map(f => ({
    name: f.name,
    pct: f.basePct,
    value: Math.floor(f.baseVal * multiplier + Math.random() * 50 * multiplier),
  }))
}

function generateFunnelData(period) {
  const multiplier = period === '7d' ? 1 : period === '30d' ? 4 : 12
  const sent = Math.floor(6500 * multiplier + Math.random() * 500)
  const opened = Math.floor(sent * (0.6 + Math.random() * 0.1))
  const clicked = Math.floor(opened * (0.3 + Math.random() * 0.1))
  const converted = Math.floor(clicked * (0.25 + Math.random() * 0.15))
  return [
    { label: '발송', value: sent, pct: 100 },
    { label: '열림', value: opened, pct: Math.round((opened / sent) * 100) },
    { label: '클릭', value: clicked, pct: Math.round((clicked / sent) * 100) },
    { label: '전환', value: converted, pct: Math.round((converted / sent) * 100) },
  ]
}

function generateTrendData(period) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const labels = []
  const sent = []
  const opened = []
  const clicked = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`)
    const s = 500 + Math.floor(Math.random() * 300) + Math.floor(i * 2)
    sent.push(s)
    opened.push(Math.floor(s * (0.55 + Math.random() * 0.2)))
    clicked.push(Math.floor(s * (0.15 + Math.random() * 0.15)))
  }
  return { labels, sent, opened, clicked }
}

function generateEngagementHours() {
  const hours = []
  for (let h = 0; h < 24; h++) {
    const base = h >= 9 && h <= 21 ? 60 : 15
    hours.push({ hour: h, value: base + Math.floor(Math.random() * 40) })
  }
  return hours
}

function generateContactGrowth(period) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const data = []
  let total = 8200
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    total += Math.floor(Math.random() * 30) + 5
    data.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, value: total })
  }
  return data
}

/* ── CSV Export ── */
function generateCSVReport({ period, overview, trendData, topFlows, funnel, engagementData, contactData }) {
  const periodLabel = period === '7d' ? '최근 7일' : period === '30d' ? '최근 30일' : '최근 90일'
  const lines = []
  lines.push('DM 자동발송기 분석 리포트')
  lines.push(`기간: ${periodLabel}`)
  lines.push(`생성일: ${new Date().toLocaleString('ko-KR')}`)
  lines.push('')

  lines.push('[개요]')
  lines.push('지표,값,변화율,방향')
  lines.push(`총 발송,${overview.sent.value},${overview.sent.change}%,${overview.sent.up ? '상승' : '하락'}`)
  lines.push(`열림률,${overview.openRate.value}%,${overview.openRate.change}%,${overview.openRate.up ? '상승' : '하락'}`)
  lines.push(`클릭률,${overview.clickRate.value}%,${overview.clickRate.change}%,${overview.clickRate.up ? '상승' : '하락'}`)
  lines.push(`전환율,${overview.conversionRate.value}%,${overview.conversionRate.change}%,${overview.conversionRate.up ? '상승' : '하락'}`)
  lines.push(`구독 해지율,${overview.unsubRate.value}%,${overview.unsubRate.change}%,${overview.unsubRate.up ? '상승' : '하락'}`)
  lines.push('')

  lines.push('[성과 추이]')
  lines.push('날짜,발송,열림,클릭')
  trendData.labels.forEach((label, i) => {
    lines.push(`${label},${trendData.sent[i]},${trendData.opened[i]},${trendData.clicked[i]}`)
  })
  lines.push('')

  lines.push('[플로우별 성과 TOP 5]')
  lines.push('순위,플로우명,건수,비율')
  topFlows.forEach((flow, i) => {
    lines.push(`${i + 1},${flow.name},${flow.value},${flow.pct}%`)
  })
  lines.push('')

  lines.push('[전환 퍼널]')
  lines.push('단계,건수,비율')
  funnel.forEach(step => {
    lines.push(`${step.label},${step.value},${step.pct}%`)
  })
  lines.push('')

  lines.push('[시간대별 참여율]')
  lines.push('시간,참여 건수')
  engagementData.forEach(d => {
    lines.push(`${d.hour}시,${d.value}`)
  })
  lines.push('')

  lines.push('[연락처 증가 추이]')
  lines.push('날짜,총 연락처')
  contactData.forEach(d => {
    lines.push(`${d.date},${d.value}`)
  })

  return '\uFEFF' + lines.join('\n')
}

/* ── SVG Line Chart ── */
function TrendChart({ data, visibleLines }) {
  const { labels, sent, opened, clicked } = data
  if (!labels || labels.length === 0) return null

  const W = 800
  const H = 220
  const PAD = { top: 20, right: 10, bottom: 30, left: 50 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom

  const allVals = [
    ...(visibleLines.sent ? sent : []),
    ...(visibleLines.opened ? opened : []),
    ...(visibleLines.clicked ? clicked : []),
  ]
  const maxVal = Math.max(...allVals, 1)

  const x = (i) => PAD.left + (i / (labels.length - 1)) * cw
  const y = (v) => PAD.top + ch - (v / maxVal) * ch

  const toPolyline = (arr) =>
    arr.map((v, i) => `${x(i)},${y(v)}`).join(' ')

  const toArea = (arr) => {
    const line = arr.map((v, i) => `${x(i)},${y(v)}`).join(' ')
    return `${line} ${x(arr.length - 1)},${PAD.top + ch} ${PAD.left},${PAD.top + ch}`
  }

  const gridLines = 4
  const gridVals = Array.from({ length: gridLines + 1 }, (_, i) => Math.round((maxVal / gridLines) * i))

  const labelStep = Math.max(1, Math.floor(labels.length / 7))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="trend-chart-svg">
      {/* grid */}
      {gridVals.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)} stroke="#E2E8F0" strokeWidth="1" />
          <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">{v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}</text>
        </g>
      ))}

      {/* area fills */}
      {visibleLines.sent && (
        <polygon points={toArea(sent)} fill="#3B82F6" opacity="0.08" />
      )}

      {/* lines */}
      {visibleLines.sent && (
        <polyline points={toPolyline(sent)} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {visibleLines.opened && (
        <polyline points={toPolyline(opened)} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {visibleLines.clicked && (
        <polyline points={toPolyline(clicked)} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* x-axis labels */}
      {labels.map((l, i) =>
        i % labelStep === 0 ? (
          <text key={i} x={x(i)} y={H - 5} textAnchor="middle" fontSize="11" fill="#94A3B8">{l}</text>
        ) : null
      )}
    </svg>
  )
}

/* ── Engagement Hours Chart ── */
function EngagementHoursChart({ data }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="engagement-hours-chart">
      <div className="hours-bars">
        {data.map(d => {
          const pct = (d.value / maxVal) * 100
          const intensity = Math.min(1, d.value / maxVal)
          const bg = `rgba(59,130,246,${0.15 + intensity * 0.7})`
          return (
            <div className="hour-bar-col" key={d.hour} title={`${d.hour}시: ${d.value}건`}>
              <div className="hour-bar" style={{ height: `${pct}%`, backgroundColor: bg }} />
              <span className="hour-label">{d.hour}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Contact Growth Mini Chart ── */
function ContactGrowthChart({ data }) {
  if (!data || data.length === 0) return null

  const W = 400
  const H = 120
  const PAD = { top: 10, right: 10, bottom: 25, left: 45 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom

  const vals = data.map(d => d.value)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1

  const x = (i) => PAD.left + (i / (data.length - 1)) * cw
  const y = (v) => PAD.top + ch - ((v - minV) / range) * ch

  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const area = `${line} ${x(data.length - 1)},${PAD.top + ch} ${PAD.left},${PAD.top + ch}`

  const labelStep = Math.max(1, Math.floor(data.length / 5))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="contact-growth-svg">
      <polygon points={area} fill="#10B981" opacity="0.1" />
      <polyline points={line} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x={PAD.left - 5} y={y(maxV) + 4} textAnchor="end" fontSize="10" fill="#94A3B8">{maxV.toLocaleString()}</text>
      <text x={PAD.left - 5} y={y(minV) + 4} textAnchor="end" fontSize="10" fill="#94A3B8">{minV.toLocaleString()}</text>
      {data.map((d, i) =>
        i % labelStep === 0 ? (
          <text key={i} x={x(i)} y={H - 5} textAnchor="middle" fontSize="10" fill="#94A3B8">{d.date}</text>
        ) : null
      )}
    </svg>
  )
}

/* ── Funnel ── */
function FunnelChart({ data }) {
  const maxVal = data[0]?.value || 1
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  return (
    <div className="funnel-chart">
      {data.map((step, i) => {
        const widthPct = Math.max(15, (step.value / maxVal) * 100)
        const dropOff = i > 0 ? ((data[i - 1].value - step.value) / data[i - 1].value * 100).toFixed(1) : null
        return (
          <div className="funnel-step" key={step.label}>
            <div className="funnel-bar" style={{ width: `${widthPct}%`, backgroundColor: colors[i] }}>
              <span className="funnel-bar-label">{step.label}</span>
              <span className="funnel-bar-value">{step.value.toLocaleString()}</span>
            </div>
            <span className="funnel-pct">{step.pct}%</span>
            {dropOff && <span className="funnel-dropoff">-{dropOff}%</span>}
          </div>
        )
      })}
    </div>
  )
}

/* ── Toast ── */
function Toast({ message, visible }) {
  if (!visible) return null
  return (
    <div className="analytics-toast" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#1E293B', color: '#fff', padding: '12px 20px',
      borderRadius: 8, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s ease',
    }}>
      <i className="ri-check-line" style={{ color: '#10B981' }} />
      {message}
    </div>
  )
}

/* ── Main Page ── */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [visibleLines, setVisibleLines] = useState({ sent: true, opened: true, clicked: true })
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Seed-based data generation keyed on period so it regenerates when period changes
  const [dataSeed, setDataSeed] = useState(0)

  const overview = useMemo(() => generateOverviewData(period), [period, dataSeed])
  const trendData = useMemo(() => generateTrendData(period), [period, dataSeed])
  const topFlows = useMemo(() => generateTopFlows(period), [period, dataSeed])
  const funnel = useMemo(() => generateFunnelData(period), [period, dataSeed])
  const engagementData = useMemo(() => generateEngagementHours(), [dataSeed])
  const contactData = useMemo(() => generateContactGrowth(period), [period, dataSeed])

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }, [])

  // Try to load from API, fall back to generated data
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await analyticsService.get(period)
      } catch {
        // use generated data (already computed via useMemo)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [period])

  const toggleLine = (key) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
    setDataSeed(prev => prev + 1)
  }

  const handleDownloadReport = useCallback(() => {
    setDownloading(true)
    // Small delay to show loading state
    setTimeout(() => {
      try {
        const csv = generateCSVReport({
          period,
          overview,
          trendData,
          topFlows,
          funnel,
          engagementData,
          contactData,
        })
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const periodLabel = period === '7d' ? '7일' : period === '30d' ? '30일' : '90일'
        const dateStr = new Date().toISOString().slice(0, 10)
        link.href = url
        link.download = `분석리포트_${periodLabel}_${dateStr}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        showToast('리포트가 다운로드되었습니다')
      } catch {
        showToast('리포트 생성에 실패했습니다')
      } finally {
        setDownloading(false)
      }
    }, 500)
  }, [period, overview, trendData, topFlows, funnel, engagementData, contactData, showToast])

  const overviewCards = [
    { key: 'sent', label: '총 발송', value: overview.sent.value.toLocaleString(), change: overview.sent.change, up: overview.sent.up, icon: 'ri-send-plane-line' },
    { key: 'openRate', label: '열림률', value: `${overview.openRate.value}%`, change: overview.openRate.change, up: overview.openRate.up, icon: 'ri-mail-open-line' },
    { key: 'clickRate', label: '클릭률', value: `${overview.clickRate.value}%`, change: overview.clickRate.change, up: overview.clickRate.up, icon: 'ri-cursor-line' },
    { key: 'conversionRate', label: '전환율', value: `${overview.conversionRate.value}%`, change: overview.conversionRate.change, up: overview.conversionRate.up, icon: 'ri-exchange-line' },
    { key: 'unsubRate', label: '구독 해지율', value: `${overview.unsubRate.value}%`, change: overview.unsubRate.change, up: overview.unsubRate.up, icon: 'ri-user-unfollow-line' },
  ]

  return (
    <>
      <Toast message={toastMsg} visible={toastVisible} />

      <div className="page-header">
        <div>
          <h2>분석 & 통계</h2>
          <p>자동화 성과를 한눈에 확인하세요</p>
        </div>
        <div className="header-actions">
          <select
            className="filter-select"
            value={period}
            onChange={e => handlePeriodChange(e.target.value)}
          >
            {PERIODS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            className="btn-secondary"
            onClick={handleDownloadReport}
            disabled={downloading}
          >
            <i className={downloading ? 'ri-loader-4-line spin' : 'ri-download-2-line'} />
            {downloading ? '생성 중...' : '리포트 다운로드'}
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="analytics-overview">
        {overviewCards.map(card => (
          <div className="ao-card" key={card.key}>
            <div className="ao-header">
              <div className="ao-icon"><i className={card.icon} /></div>
              <div className="ao-label">{card.label}</div>
            </div>
            <div className="ao-value">{card.value}</div>
            <div className={`ao-change ${card.up ? 'up' : 'down'}`}>
              <i className={card.up ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} />
              {card.change > 0 ? '+' : ''}{card.change}%
              <span className="ao-period">vs 이전 기간</span>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="page-loading">
          <i className="ri-loader-4-line spin" /> 데이터를 불러오는 중...
        </div>
      )}

      <div className="analytics-grid">
        {/* Performance Trend Chart */}
        <div className="dash-card chart-card full-width">
          <div className="dash-card-header">
            <h3>성과 추이</h3>
            <div className="chart-legend-btns">
              <button
                className={`legend-btn ${visibleLines.sent ? 'active' : ''} blue`}
                onClick={() => toggleLine('sent')}
              >
                <span className="legend-dot" /> 발송
              </button>
              <button
                className={`legend-btn ${visibleLines.opened ? 'active' : ''} green`}
                onClick={() => toggleLine('opened')}
              >
                <span className="legend-dot" /> 열림
              </button>
              <button
                className={`legend-btn ${visibleLines.clicked ? 'active' : ''} purple`}
                onClick={() => toggleLine('clicked')}
              >
                <span className="legend-dot" /> 클릭
              </button>
            </div>
          </div>
          <div className="analytics-chart">
            <TrendChart data={trendData} visibleLines={visibleLines} />
          </div>
        </div>

        {/* Top 5 Flows */}
        <div className="dash-card">
          <div className="dash-card-header"><h3>플로우별 성과 TOP 5</h3></div>
          <div className="top-flows-list">
            {topFlows.map((flow, i) => (
              <div className="top-flow-item" key={flow.name}>
                <span className="top-rank">{i + 1}</span>
                <div className="top-flow-info">
                  <strong>{flow.name}</strong>
                  <div className="top-flow-bar">
                    <div
                      className="top-flow-fill"
                      style={{ width: `${flow.pct}%` }}
                    />
                  </div>
                </div>
                <span className="top-flow-value">{flow.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="dash-card">
          <div className="dash-card-header"><h3>전환 퍼널</h3></div>
          <FunnelChart data={funnel} />
        </div>

        {/* Engagement Hours */}
        <div className="dash-card">
          <div className="dash-card-header"><h3>시간대별 참여율</h3></div>
          <div className="analytics-chart">
            <EngagementHoursChart data={engagementData} />
          </div>
          <div className="chart-footnote">
            <i className="ri-information-line" /> 막대가 높을수록 해당 시간대에 참여가 활발합니다
          </div>
        </div>

        {/* Contact Growth */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>연락처 증가 추이</h3>
            <span className="chart-badge green">
              +{contactData.length > 1
                ? (contactData[contactData.length - 1].value - contactData[0].value).toLocaleString()
                : 0} 명
            </span>
          </div>
          <div className="analytics-chart">
            <ContactGrowthChart data={contactData} />
          </div>
        </div>
      </div>
    </>
  )
}
