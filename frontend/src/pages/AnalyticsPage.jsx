import { useState, useEffect, useCallback, useMemo } from 'react'
import PageLoader from '../components/PageLoader'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { analyticsService } from '../api/services'

const PERIODS = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
]

/** 백엔드 응답 데이터를 프론트엔드 차트 포맷으로 변환 */
function mapOverviewData(data) {
  return {
    sent: { value: data.totalMessages || 0, change: 0, up: true },
    openRate: { value: data.avgOpenRate || 0, change: 0, up: true },
    clickRate: { value: data.avgClickRate || 0, change: 0, up: true },
    conversionRate: { value: 0, change: 0, up: false },
    unsubRate: { value: 0, change: 0, up: true },
  }
}

function mapTopFlows(flowPerformances) {
  if (!flowPerformances || flowPerformances.length === 0) return []
  const sorted = [...flowPerformances].sort((a, b) => (b.sentCount || 0) - (a.sentCount || 0))
  const top = sorted.slice(0, 5)
  const maxVal = top[0]?.sentCount || 1
  return top.map(f => ({
    id: f.id,
    name: f.name,
    triggerType: f.triggerType,
    active: f.active,
    openRate: f.openRate,
    pct: Math.round(((f.sentCount || 0) / maxVal) * 100),
    value: f.sentCount || 0,
  }))
}

function mapFunnelData(data) {
  const sent = data.totalMessages || 0
  const openRate = (data.avgOpenRate || 0) / 100
  const clickRate = (data.avgClickRate || 0) / 100
  const opened = Math.round(sent * openRate)
  const clicked = Math.round(sent * clickRate)
  const converted = 0 // 전환 데이터는 아직 백엔드 미지원
  return [
    { label: '발송', value: sent, pct: 100 },
    { label: '열림', value: opened, pct: sent > 0 ? Math.round((opened / sent) * 100) : 0 },
    { label: '클릭', value: clicked, pct: sent > 0 ? Math.round((clicked / sent) * 100) : 0 },
    { label: '전환', value: converted, pct: sent > 0 ? Math.round((converted / sent) * 100) : 0 },
  ]
}

function mapTrendData(dailyMessages) {
  if (!dailyMessages || dailyMessages.length === 0) {
    return { labels: [], sent: [], opened: [], clicked: [] }
  }
  const labels = dailyMessages.map(d => {
    const parts = d.date.split('-')
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`
  })
  const sent = dailyMessages.map(d => d.count)
  // 열림/클릭은 일별 세부 데이터가 없으므로 빈 배열 반환
  const opened = dailyMessages.map(() => 0)
  const clicked = dailyMessages.map(() => 0)
  return { labels, sent, opened, clicked }
}

function mapEngagementHours(hourlyEngagement) {
  const hours = []
  for (let h = 0; h < 24; h++) {
    const entry = hourlyEngagement?.find(e => e.hour === h)
    hours.push({ hour: h, value: entry?.count || 0 })
  }
  return hours
}

function mapContactGrowth(dailyNewContacts, totalContacts) {
  if (!dailyNewContacts || dailyNewContacts.length === 0) return []
  // 마지막 날의 누적 값이 totalContacts. 역산하여 누적 그래프 생성.
  let cumulative = totalContacts
  const reversed = [...dailyNewContacts].reverse()
  const cumulativeData = reversed.map(d => {
    const val = cumulative
    cumulative -= d.count
    return { date: d.date, value: val }
  }).reverse()

  return cumulativeData.map(d => {
    const parts = d.date.split('-')
    return { date: `${parseInt(parts[1])}/${parseInt(parts[2])}`, value: d.value }
  })
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
  if (!labels || labels.length === 0) return (
    <EmptyState compact icon="ri-line-chart-line" title="성과 데이터가 없습니다" description="메시지를 발송하면 추이 그래프가 표시됩니다" />
  )

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

  const x = (i) => labels.length > 1 ? PAD.left + (i / (labels.length - 1)) * cw : PAD.left + cw / 2
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
  if (!data || data.length === 0) return (
    <EmptyState compact icon="ri-time-line" title="참여 데이터가 없습니다" description="메시지 발송 후 시간대별 참여율이 표시됩니다" />
  )
  const totalValue = data.reduce((sum, d) => sum + d.value, 0)
  if (totalValue === 0) return (
    <EmptyState compact icon="ri-time-line" title="참여 데이터가 없습니다" description="메시지 발송 후 시간대별 참여율이 표시됩니다" />
  )
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
  if (!data || data.length === 0) return (
    <EmptyState compact icon="ri-user-add-line" title="연락처 데이터가 없습니다" description="연락처가 추가되면 증가 추이가 표시됩니다" />
  )

  const W = 400
  const H = 120
  const PAD = { top: 10, right: 10, bottom: 25, left: 45 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom

  const vals = data.map(d => d.value)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1

  const x = (i) => data.length > 1 ? PAD.left + (i / (data.length - 1)) * cw : PAD.left + cw / 2
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

/* ── Flow Detail Modal ── */
function FlowDetailModal({ flow, onClose }) {
  if (!flow) return null

  const triggerLabels = {
    KEYWORD: '키워드 트리거',
    STORY_REPLY: '스토리 답장',
    STORY_MENTION: '스토리 멘션',
    COMMENT: '댓글 트리거',
    WELCOME: '환영 메시지',
    MANUAL: '수동 실행',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal flow-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="ri-flow-chart" /> 플로우 상세</h3>
          <button className="modal-close" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <div className="flow-detail-content">
          <div className="flow-detail-name">
            <h4>{flow.name}</h4>
            <span className={`flow-detail-badge ${flow.active ? 'active' : 'inactive'}`}>
              {flow.active ? '활성' : '비활성'}
            </span>
          </div>
          <div className="flow-detail-grid">
            <div className="flow-detail-stat">
              <span className="fd-label">트리거 유형</span>
              <span className="fd-value">{triggerLabels[flow.triggerType] || flow.triggerType}</span>
            </div>
            <div className="flow-detail-stat">
              <span className="fd-label">총 발송</span>
              <span className="fd-value">{(flow.value || 0).toLocaleString()}건</span>
            </div>
            <div className="flow-detail-stat">
              <span className="fd-label">열림률</span>
              <span className="fd-value">{flow.openRate != null ? `${Math.round(flow.openRate)}%` : '--'}</span>
            </div>
            <div className="flow-detail-stat">
              <span className="fd-label">성과 비율</span>
              <span className="fd-value">{flow.pct}%</span>
            </div>
          </div>
          {/* mini bar */}
          <div className="flow-detail-bar-wrap">
            <div className="flow-detail-bar" style={{ width: `${flow.pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Funnel ── */
function FunnelChart({ data }) {
  const maxVal = data[0]?.value || 1
  const allZero = data.every(d => d.value === 0)
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  if (allZero) return (
    <EmptyState compact icon="ri-filter-3-line" title="퍼널 데이터가 없습니다" description="메시지를 발송하면 전환 퍼널이 표시됩니다" />
  )

  return (
    <div className="funnel-chart">
      {data.map((step, i) => {
        const widthPct = Math.max(15, (step.value / maxVal) * 100)
        const prevVal = i > 0 ? data[i - 1].value : 0
        const dropOff = i > 0 && prevVal > 0
          ? ((prevVal - step.value) / prevVal * 100).toFixed(1)
          : null
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

/* ── Node Funnel Chart ── */
function NodeFunnelChart({ steps, overallRate }) {
  if (!steps || steps.length === 0) return (
    <EmptyState compact icon="ri-filter-3-line" title="퍼널 데이터가 없습니다" description="플로우가 실행되면 노드별 퍼널이 표시됩니다" />
  )

  const maxEntered = Math.max(...steps.map(s => s.entered), 1)

  const getColor = (rate) => {
    if (rate >= 70) return '#10B981'
    if (rate >= 30) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="node-funnel">
      {steps.map((step, i) => {
        const widthPct = Math.max(20, (step.entered / maxEntered) * 100)
        return (
          <div className="nf-step" key={step.nodeType}>
            <div className="nf-step-header">
              <span className="nf-step-label">{step.label}</span>
              <span className="nf-step-count">{step.entered.toLocaleString()}명 도달</span>
            </div>
            <div className="nf-bar-wrap">
              <div
                className="nf-bar"
                style={{ width: `${widthPct}%`, backgroundColor: getColor(step.completionRate) }}
              >
                <span className="nf-bar-text">
                  {step.completed.toLocaleString()} 완료 ({step.completionRate}%)
                </span>
              </div>
            </div>
            {step.dropRate > 0 && (
              <div className="nf-drop">
                <i className="ri-arrow-down-s-line" />
                이탈 {step.dropRate}%
                {i < steps.length - 1 && <span className="nf-drop-line" />}
              </div>
            )}
          </div>
        )
      })}
      <div className="nf-overall">
        <i className="ri-flag-line" />
        전체 전환율: <strong>{overallRate}%</strong>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [visibleLines, setVisibleLines] = useState({ sent: true, opened: true, clicked: true })
  const [downloading, setDownloading] = useState(false)
  const [apiData, setApiData] = useState(null)
  const [selectedFlow, setSelectedFlow] = useState(null)
  const [funnelFlowId, setFunnelFlowId] = useState('')
  const [funnelData, setFunnelData] = useState(null)
  const [funnelLoading, setFunnelLoading] = useState(false)
  const toast = useToast()

  const overview = useMemo(() => apiData ? mapOverviewData(apiData) : mapOverviewData({}), [apiData])
  const trendData = useMemo(() => apiData ? mapTrendData(apiData.dailyMessages) : { labels: [], sent: [], opened: [], clicked: [] }, [apiData])
  const topFlows = useMemo(() => apiData ? mapTopFlows(apiData.flowPerformances) : [], [apiData])
  const funnel = useMemo(() => apiData ? mapFunnelData(apiData) : mapFunnelData({}), [apiData])
  const engagementData = useMemo(() => mapEngagementHours(apiData?.hourlyEngagement), [apiData])
  const contactData = useMemo(() => apiData ? mapContactGrowth(apiData.dailyNewContacts, apiData.totalContacts) : [], [apiData])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await analyticsService.get(period)
        if (!cancelled) setApiData(data)
      } catch {
        // API 실패 시 빈 데이터 유지
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
    // 퍼널 선택된 플로우가 있으면 재조회
    if (funnelFlowId) {
      loadFunnelData(funnelFlowId, newPeriod)
    }
  }

  const loadFunnelData = async (flowId, p = period) => {
    if (!flowId) { setFunnelData(null); return }
    setFunnelLoading(true)
    try {
      const days = p === '7d' ? 7 : p === '30d' ? 30 : 90
      const data = await analyticsService.getFlowFunnel(flowId, days)
      setFunnelData(data)
    } catch {
      setFunnelData(null)
    } finally {
      setFunnelLoading(false)
    }
  }

  const handleFunnelFlowChange = (flowId) => {
    setFunnelFlowId(flowId)
    loadFunnelData(flowId)
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
        toast.success('리포트가 다운로드되었습니다')
      } catch {
        toast.error('리포트 생성에 실패했습니다')
      } finally {
        setDownloading(false)
      }
    }, 500)
  }, [period, overview, trendData, topFlows, funnel, engagementData, contactData, toast])

  const overviewCards = [
    { key: 'sent', label: '총 발송', value: overview.sent.value.toLocaleString(), change: overview.sent.change, up: overview.sent.up, icon: 'ri-send-plane-line' },
    { key: 'openRate', label: '열림률', value: `${overview.openRate.value}%`, change: overview.openRate.change, up: overview.openRate.up, icon: 'ri-mail-open-line' },
    { key: 'clickRate', label: '클릭률', value: `${overview.clickRate.value}%`, change: overview.clickRate.change, up: overview.clickRate.up, icon: 'ri-cursor-line' },
    { key: 'conversionRate', label: '전환율', value: `${overview.conversionRate.value}%`, change: overview.conversionRate.change, up: overview.conversionRate.up, icon: 'ri-exchange-line' },
    { key: 'unsubRate', label: '구독 해지율', value: `${overview.unsubRate.value}%`, change: overview.unsubRate.change, up: overview.unsubRate.up, icon: 'ri-user-unfollow-line' },
  ]

  return (
    <>
      <FlowDetailModal flow={selectedFlow} onClose={() => setSelectedFlow(null)} />
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

      {loading && <PageLoader text="데이터를 불러오는 중..." />}

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
            {topFlows.length === 0 && (
              <EmptyState compact icon="ri-flow-chart" title="플로우 성과가 없습니다" description="플로우를 실행하면 성과 순위가 표시됩니다" />
            )}
            {topFlows.map((flow, i) => (
              <div className="top-flow-item clickable" key={flow.name} onClick={() => setSelectedFlow(flow)} title="클릭하여 상세 보기">
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

        {/* Node-level Funnel */}
        <div className="dash-card full-width">
          <div className="dash-card-header">
            <h3><i className="ri-git-branch-line" style={{ marginRight: 6 }} />노드별 퍼널 분석</h3>
            <select
              className="filter-select"
              value={funnelFlowId}
              onChange={(e) => handleFunnelFlowChange(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">플로우 선택...</option>
              {topFlows.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
              {apiData?.flowPerformances?.filter(f => !topFlows.find(t => t.id === f.id)).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          {funnelLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
              <i className="ri-loader-4-line spin" style={{ fontSize: 24 }} />
              <p style={{ marginTop: 8, fontSize: 13 }}>퍼널 데이터 로딩 중...</p>
            </div>
          ) : !funnelFlowId ? (
            <EmptyState compact icon="ri-git-branch-line" title="플로우를 선택하세요" description="플로우를 선택하면 노드별 전환율과 이탈율을 확인할 수 있습니다" />
          ) : (
            <NodeFunnelChart
              steps={funnelData?.steps}
              overallRate={funnelData?.overallConversionRate || 0}
            />
          )}
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
