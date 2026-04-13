import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardService, flowService } from '../api/services'

const RINGS_DEFAULT = [
  { key: 'automation', color: '#3B82F6', label: '자동화율' },
  { key: 'openRate', color: '#10B981', label: '응답률' },
  { key: 'clickRate', color: '#8B5CF6', label: '전환율' },
  { key: 'satisfaction', color: '#F59E0B', label: '만족도' },
]

function formatNumber(value) {
  if (value == null) return '0'
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '0%'
  return `${Math.round(value * 10) / 10}%`
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [flows, setFlows] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const [dash, flowList] = await Promise.all([
          dashboardService.get(),
          flowService.list(),
        ])
        if (!mounted) return
        setDashboard(dash)
        setFlows(flowList || [])
      } catch (err) {
        if (mounted) setError(err.message || '데이터를 불러올 수 없습니다.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const stats = [
    {
      icon: 'ri-user-add-line',
      color: 'blue',
      value: formatNumber(dashboard?.activeContacts),
      label: '활성 구독자',
      trend: `총 ${formatNumber(dashboard?.totalContacts)}명`,
      up: true,
    },
    {
      icon: 'ri-message-3-line',
      color: 'green',
      value: formatNumber(dashboard?.totalMessagesSent),
      label: '누적 발송 메시지',
      trend: `${formatNumber(dashboard?.openConversations)} 대화`,
      up: true,
    },
    {
      icon: 'ri-flow-chart',
      color: 'purple',
      value: `${formatNumber(dashboard?.activeFlows)}/${formatNumber(dashboard?.totalFlows)}`,
      label: '활성 플로우',
      trend: 'Running',
      up: true,
    },
    {
      icon: 'ri-star-line',
      color: 'orange',
      value: formatNumber(dashboard?.vipContacts),
      label: 'VIP 고객',
      trend: formatPercent(dashboard?.avgOpenRate),
      up: true,
    },
  ]

  const rings = RINGS_DEFAULT.map((r) => {
    let percent = 0
    if (r.key === 'automation') {
      percent = dashboard?.totalFlows
        ? Math.round((dashboard.activeFlows / dashboard.totalFlows) * 100)
        : 0
    } else if (r.key === 'openRate') {
      percent = Math.round(dashboard?.avgOpenRate || 0)
    } else if (r.key === 'clickRate') {
      percent = Math.round(dashboard?.avgClickRate || 0)
    } else {
      percent = dashboard?.activeContacts && dashboard?.totalContacts
        ? Math.round((dashboard.activeContacts / dashboard.totalContacts) * 100)
        : 0
    }
    return { ...r, percent }
  })

  const activeFlows = flows.filter((f) => f.active).slice(0, 5)

  return (
    <>
      {error && (
        <div className="alert-banner error">
          <i className="ri-error-warning-line" /> {error}
        </div>
      )}

      <div className="dashboard-stats">
        {stats.map((s) => (
          <div className="dash-stat-card" key={s.label}>
            <div className={`dash-stat-icon ${s.color}`}><i className={s.icon} /></div>
            <div className="dash-stat-info">
              <div className="dash-stat-value">{loading ? '...' : s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
            <div className={`dash-stat-trend ${s.up ? 'up' : 'down'}`}>
              <i className={s.up ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} /> {s.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Chart */}
        <div className="dash-card chart-card">
          <div className="dash-card-header">
            <h3>메시지 발송 추이</h3>
            <select className="mini-select">
              <option>최근 7일</option><option>최근 30일</option>
            </select>
          </div>
          <div className="chart-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                <i className="ri-loader-4-line" /> 데이터를 불러오는 중...
              </div>
            ) : !dashboard ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                <i className="ri-bar-chart-box-line" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                <p>데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="css-chart">
                <div className="chart-bars">
                  {[
                    ['발송', dashboard.totalMessagesSent ? Math.min(100, Math.max(10, 100)) : 0],
                    ['열림', dashboard.avgOpenRate || 0],
                    ['클릭', dashboard.avgClickRate || 0],
                  ].map(([label, h], i) => (
                    <div className="chart-bar-group" key={label}>
                      <div className={`chart-bar${i === 0 ? ' active' : ''}`} style={{ height: `${Math.max(h, 2)}%` }}><span>{label}</span></div>
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <span><i className="dot blue" /> 발송 {formatNumber(dashboard.totalMessagesSent)}건</span>
                  <span><i className="dot green" /> 열림률 {formatPercent(dashboard.avgOpenRate)}</span>
                  <span><i className="dot purple" /> 클릭률 {formatPercent(dashboard.avgClickRate)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Automations */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>활성 플로우</h3>
            <Link to="/app/flows" className="dash-card-link">전체 보기</Link>
          </div>
          <div className="automation-list">
            {loading && <div className="empty-state">로딩 중...</div>}
            {!loading && activeFlows.length === 0 && (
              <div className="empty-state">
                <p>활성 플로우가 없습니다.</p>
                <Link to="/app/flows" className="dash-card-link">첫 플로우 만들기 →</Link>
              </div>
            )}
            {activeFlows.map((f) => (
              <div className="automation-item" key={f.id}>
                <div className="auto-icon blue"><i className="ri-flow-chart" /></div>
                <div className="auto-info"><strong>{f.name}</strong><span>{f.triggerType || '수동 트리거'} · {f.active ? '활성' : '비활성'}</span></div>
                <div className="auto-stats">
                  <span className="auto-stat">{formatNumber(f.sentCount)} 발송</span>
                  <div className={`auto-toggle${f.active ? ' active' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Conversations placeholder */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>최근 대화</h3>
            <Link to="/app/livechat" className="dash-card-link">전체 보기</Link>
          </div>
          <div className="conversation-list">
            <div className="empty-state">
              <p>열려있는 대화가 {formatNumber(dashboard?.openConversations)}건 있습니다.</p>
              <Link to="/app/livechat" className="dash-card-link">라이브챗으로 이동 →</Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dash-card">
          <div className="dash-card-header"><h3>오늘의 성과</h3></div>
          <div className="quick-stats">
            {rings.map((r) => (
              <div className="quick-stat-item" key={r.label}>
                <div className="quick-stat-ring">
                  <svg viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={r.color} strokeWidth="3" strokeDasharray={`${r.percent}, 100`} />
                  </svg>
                  <span>{r.percent}%</span>
                </div>
                <div className="quick-stat-label">{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
