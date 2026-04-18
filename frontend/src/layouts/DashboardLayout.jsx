import { useState, useRef, useEffect, useMemo } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/client'
import { authService } from '../api/services'
import { usePlan } from '../components/PlanContext'
import { useAccount } from '../components/AccountContext'
import IndustrySelectModal from '../components/IndustrySelectModal'

const NAV_SECTIONS = [
  {
    title: '메인',
    items: [
      { to: '/app', icon: 'ri-dashboard-3-line', label: '대시보드', end: true },
      { to: '/app/flows', icon: 'ri-flow-chart', label: '자동화 플로우', badge: '12' },
      { to: '/app/automation', icon: 'ri-robot-2-line', label: '자동화 트리거' },
    ]
  },
  {
    title: '메시징',
    items: [
      { to: '/app/livechat', icon: 'ri-chat-3-line', label: '라이브 채팅', badge: '5', badgeType: 'red' },
      { to: '/app/broadcast', icon: 'ri-broadcast-line', label: '브로드캐스팅' },
      { to: '/app/sequences', icon: 'ri-time-line', label: '시퀀스' },
      { to: '/app/group-buys', icon: 'ri-shopping-bag-line', label: '공동구매' },
    ]
  },
  {
    title: '성장',
    items: [
      { to: '/app/contacts', icon: 'ri-contacts-book-2-line', label: '연락처', count: '8,432' },
      { to: '/app/growth', icon: 'ri-seedling-line', label: '성장 도구' },
      { to: '/app/analytics', icon: 'ri-line-chart-line', label: '분석' },
    ]
  },
  {
    title: '설정',
    items: [
      { to: '/app/agency', icon: 'ri-building-2-line', label: '에이전시' },
      { to: '/app/templates', icon: 'ri-file-copy-2-line', label: '템플릿' },
      { to: '/app/settings', icon: 'ri-settings-3-line', label: '설정' },
    ]
  }
]

const PAGE_TITLES = {
  '/app': '대시보드',
  '/app/flows': '자동화 플로우',
  '/app/automation': '자동화 트리거',
  '/app/livechat': '라이브 채팅',
  '/app/broadcast': '브로드캐스팅',
  '/app/sequences': '시퀀스',
  '/app/group-buys': '공동구매',
  '/app/contacts': '연락처',
  '/app/growth': '성장 도구',
  '/app/analytics': '분석',
  '/app/agency': '에이전시',
  '/app/templates': '템플릿',
  '/app/settings': '설정',
  '/app/flows/builder': '플로우 빌더',
}

// S50 fix: 실제 백엔드 알림 엔드포인트 연결 전까지는 빈 배열.
// 추후 /api/notifications GET으로 연결 예정.
const DEMO_NOTIFICATIONS = []

const HELP_LINKS = [
  { icon: 'ri-book-2-line', label: '문서', desc: '사용 가이드 및 문서', href: 'https://docs.example.com', external: true },
  { icon: 'ri-question-answer-line', label: 'FAQ', desc: '자주 묻는 질문', href: '/app/settings', external: false },
  { icon: 'ri-chat-1-line', label: '채팅 문의', desc: '실시간 채팅 지원', href: '/app/livechat', external: false },
  { icon: 'ri-keyboard-box-line', label: '키보드 단축키', desc: '단축키 목록 보기', action: 'shortcuts' },
]

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: '검색 열기' },
  { keys: ['Ctrl', 'N'], desc: '새 플로우 만들기' },
  { keys: ['Ctrl', 'B'], desc: '사이드바 토글' },
  { keys: ['Ctrl', '/'], desc: '도움말 열기' },
  { keys: ['Esc'], desc: '팝업 닫기' },
]

const SEARCHABLE_ITEMS = [
  // 페이지 네비게이션
  { type: 'page', label: '대시보드', path: '/app', icon: 'ri-dashboard-3-line', keywords: ['대시보드', 'dashboard', '홈'] },
  { type: 'page', label: '자동화 플로우', path: '/app/flows', icon: 'ri-flow-chart', keywords: ['플로우', 'flow', '자동화', '빌더'] },
  { type: 'page', label: '자동화 트리거', path: '/app/automation', icon: 'ri-robot-2-line', keywords: ['트리거', 'trigger', '자동', '키워드'] },
  { type: 'page', label: '라이브 채팅', path: '/app/livechat', icon: 'ri-chat-3-line', keywords: ['채팅', 'chat', '라이브', '메시지', 'DM'] },
  { type: 'page', label: '브로드캐스팅', path: '/app/broadcast', icon: 'ri-broadcast-line', keywords: ['브로드캐스트', 'broadcast', '대량', '발송'] },
  { type: 'page', label: '시퀀스', path: '/app/sequences', icon: 'ri-time-line', keywords: ['시퀀스', 'sequence', '드립', '캠페인'] },
  { type: 'page', label: '공동구매', path: '/app/group-buys', icon: 'ri-shopping-bag-line', keywords: ['공동구매', 'group buy', '공구', '재고', '인벤토리'] },
  { type: 'page', label: '연락처', path: '/app/contacts', icon: 'ri-contacts-book-2-line', keywords: ['연락처', 'contact', '구독자', 'CRM'] },
  { type: 'page', label: '성장 도구', path: '/app/growth', icon: 'ri-seedling-line', keywords: ['성장', 'growth', '도구'] },
  { type: 'page', label: '분석 & 통계', path: '/app/analytics', icon: 'ri-line-chart-line', keywords: ['분석', 'analytics', '통계', '리포트'] },
  { type: 'page', label: '에이전시', path: '/app/agency', icon: 'ri-building-2-line', keywords: ['에이전시', 'agency', '멀티', '계정', '관리'] },
  { type: 'page', label: '템플릿', path: '/app/templates', icon: 'ri-file-copy-2-line', keywords: ['템플릿', 'template', '양식'] },
  { type: 'page', label: '설정', path: '/app/settings', icon: 'ri-settings-3-line', keywords: ['설정', 'settings', '계정', '연동', 'API'] },
  // 빠른 액션
  { type: 'action', label: '새 플로우 만들기', path: '/app/flows/builder', icon: 'ri-add-circle-line', keywords: ['새', 'new', '만들기', '플로우', 'flow', '생성'] },
  { type: 'action', label: '새 브로드캐스트 만들기', path: '/app/broadcast/builder', icon: 'ri-add-circle-line', keywords: ['새', 'new', '만들기', '브로드캐스트', 'broadcast', '발송'] },
  { type: 'action', label: '새 시퀀스 만들기', path: '/app/sequences/builder', icon: 'ri-add-circle-line', keywords: ['새', 'new', '만들기', '시퀀스', 'sequence'] },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // S58 fix: 백엔드 연결 상태 배너
  const [apiOffline, setApiOffline] = useState(false)

  useEffect(() => {
    const onOff = () => setApiOffline(true)
    const onOn = () => setApiOffline(false)
    window.addEventListener('api:offline', onOff)
    window.addEventListener('api:online', onOn)
    return () => {
      window.removeEventListener('api:offline', onOff)
      window.removeEventListener('api:online', onOn)
    }
  }, [])
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [shortcutsModal, setShortcutsModal] = useState(false)
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const [cmdIndex, setCmdIndex] = useState(0)
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS)
  const [showIndustryModal, setShowIndustryModal] = useState(false)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { planLabel, getUsage, getLimit } = usePlan()
  const { accounts, activeAccount, switchAccount } = useAccount()
  const accountDropdownRef = useRef(null)
  const userMenuRef = useRef(null)

  const location = useLocation()
  const navigate = useNavigate()
  const pageTitle = PAGE_TITLES[location.pathname]
    || Object.entries(PAGE_TITLES).find(([k]) => location.pathname.startsWith(k + '/'))?.[1]
    || '대시보드'

  const storedUser = useMemo(() => getStoredUser(), [])
  const userName = storedUser?.name || '사용자'
  const userInitial = userName[0] || '?'

  // 업종 선택은 온보딩에서 처리. 대시보드에서는 자동 팝업하지 않음.
  // (설정 메뉴 등에서 수동으로 열 때만 사용)
  // eslint-disable-next-line no-unused-expressions
  useEffect(() => { /* noop: 업종 모달 자동 노출 해제 */ }, [])

  const notifRef = useRef(null)
  const helpRef = useRef(null)
  const cmdInputRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false)
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) setAccountDropdownOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdowns on route change
  useEffect(() => {
    setNotifOpen(false)
    setHelpOpen(false)
    setCmdPaletteOpen(false)
    setCmdQuery('')
  }, [location.pathname])

  // Keyboard shortcut: Ctrl+K for command palette, Ctrl+/ for help, Esc to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setHelpOpen(false)
        setShortcutsModal(false)
        setCmdPaletteOpen(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(prev => !prev)
        setCmdQuery('')
        setCmdIndex(0)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setHelpOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus command palette input
  useEffect(() => {
    if (cmdPaletteOpen) {
      setTimeout(() => cmdInputRef.current?.focus(), 50)
    }
  }, [cmdPaletteOpen])

  const unreadCount = notifications.filter(n => n.unread).length

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const handleNotifClick = (notif) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n))
    setNotifOpen(false)
  }

  // Command palette filtering
  const cmdResults = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase()
    if (!q) return SEARCHABLE_ITEMS
    return SEARCHABLE_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some(kw => kw.toLowerCase().includes(q))
    )
  }, [cmdQuery])

  // Group results by type
  const cmdGrouped = useMemo(() => {
    const pages = cmdResults.filter(r => r.type === 'page')
    const actions = cmdResults.filter(r => r.type === 'action')
    return { pages, actions }
  }, [cmdResults])

  // Flat list for keyboard navigation
  const cmdFlat = useMemo(() => [...cmdGrouped.actions, ...cmdGrouped.pages], [cmdGrouped])

  const handleCmdSelect = (item) => {
    navigate(item.path)
    setCmdPaletteOpen(false)
    setCmdQuery('')
    setCmdIndex(0)
  }

  const handleCmdKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCmdIndex(prev => Math.min(prev + 1, cmdFlat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCmdIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && cmdFlat.length > 0) {
      e.preventDefault()
      handleCmdSelect(cmdFlat[cmdIndex])
    }
  }

  const handleHelpAction = (link) => {
    if (link.action === 'shortcuts') {
      setHelpOpen(false)
      setShortcutsModal(true)
    } else if (link.external) {
      window.open(link.href, '_blank', 'noopener')
      setHelpOpen(false)
    } else {
      navigate(link.href)
      setHelpOpen(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  // Flow builder & Sequence builder have their own full-screen layout
  if (location.pathname.startsWith('/app/flows/builder') || location.pathname.startsWith('/app/sequences/builder') || location.pathname.startsWith('/app/broadcast/builder')) {
    return <Outlet />
  }

  return (
    <div className="dashboard-wrapper">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <a href="/" className="logo">
            <img src="/images/sendit_03_icon_gradient.png" alt="센드잇" className="logo-img" />
            <span className="logo-text">센드잇</span>
          </a>
          {/* Mobile close button */}
          <button
            className="mobile-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            style={{ display: sidebarOpen ? 'flex' : 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4, marginLeft: 'auto', color: 'var(--text-secondary, #666)' }}
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="account-selector-wrap" ref={accountDropdownRef}>
          <div
            className="account-selector"
            onClick={() => setAccountDropdownOpen(prev => !prev)}
            style={{ cursor: 'pointer' }}
          >
            {activeAccount ? (
              <>
                <div className="account-avatar">
                  {activeAccount.profilePictureUrl
                    ? <img src={activeAccount.profilePictureUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : activeAccount.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="account-details">
                  <span className="account-name">@{activeAccount.username}</span>
                  <span className="account-type">{activeAccount.accountType || '비즈니스 계정'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="account-avatar">+</div>
                <div className="account-details">
                  <span className="account-name">계정 연결하기</span>
                  <span className="account-type">Instagram 계정을 연결하세요</span>
                </div>
              </>
            )}
            <i className={`ri-arrow-${accountDropdownOpen ? 'up' : 'down'}-s-line`} />
          </div>

          {accountDropdownOpen && (
            <div className="account-dropdown">
              <div className="account-dropdown-header">계정 전환</div>
              {accounts.length > 0 ? (
                <div className="account-dropdown-list">
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      className={`account-dropdown-item${acc.active ? ' active' : ''}${!acc.connected ? ' disconnected' : ''}`}
                      onClick={() => {
                        if (acc.connected && !acc.active) {
                          switchAccount(acc.id)
                        }
                        setAccountDropdownOpen(false)
                      }}
                    >
                      <div className="account-dropdown-avatar">
                        {acc.profilePictureUrl
                          ? <img src={acc.profilePictureUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : acc.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="account-dropdown-info">
                        <span className="account-dropdown-name">@{acc.username}</span>
                        <span className="account-dropdown-type">
                          {!acc.connected ? '연결 해제됨' : acc.accountType || '비즈니스 계정'}
                        </span>
                      </div>
                      {acc.active && <i className="ri-check-line" style={{ color: '#7c3aed', fontSize: 18 }} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="account-dropdown-empty">
                  연결된 계정이 없습니다
                </div>
              )}
              <div className="account-dropdown-footer">
                <button onClick={() => { navigate('/app/settings'); setAccountDropdownOpen(false) }}>
                  <i className="ri-settings-3-line" /> 계정 관리
                </button>
                <button onClick={() => { navigate('/app/agency'); setAccountDropdownOpen(false) }}>
                  <i className="ri-building-2-line" /> 에이전시
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div className="nav-section" key={section.title}>
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={item.icon} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`nav-badge ${item.badgeType || ''}`}>{item.badge}</span>
                  )}
                  {item.count && <span className="nav-count">{item.count}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="plan-badge">{planLabel} 플랜</div>
          <div className="plan-usage">
            <div className="usage-bar">
              <div
                className="usage-fill"
                style={{
                  width: `${getLimit('contacts') === Infinity ? 5 : Math.min(100, Math.round((getUsage('contacts') / getLimit('contacts')) * 100))}%`,
                  background: getLimit('contacts') !== Infinity && getUsage('contacts') / getLimit('contacts') >= 0.8 ? '#F59E0B' : undefined,
                }}
              />
            </div>
            <span>
              {getUsage('contacts').toLocaleString()} / {getLimit('contacts') === Infinity ? '무제한' : getLimit('contacts').toLocaleString()} 연락처
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {apiOffline && (
          <div style={{
            padding: '10px 20px',
            background: '#fee2e2',
            borderBottom: '1px solid #fca5a5',
            color: '#991b1b',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <i className="ri-wifi-off-line" style={{ fontSize: 18 }} />
            <strong>서버에 연결할 수 없습니다.</strong>
            <span>네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.</span>
            <button
              onClick={() => window.location.reload()}
              style={{ marginLeft: 'auto', padding: '4px 12px', border: '1px solid #991b1b', background: '#fff', borderRadius: 6, cursor: 'pointer', color: '#991b1b', fontSize: 12, fontWeight: 500 }}
            >
              <i className="ri-refresh-line" /> 새로고침
            </button>
          </div>
        )}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-sidebar-btn"
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label={sidebarOpen ? '메뉴 닫기' : '메뉴 열기'}
              type="button"
            >
              <i className={sidebarOpen ? 'ri-close-line' : 'ri-menu-line'} />
            </button>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="topbar-right">
            {/* Search Trigger (opens command palette) */}
            <button
              className="search-box"
              onClick={() => { setCmdPaletteOpen(true); setCmdQuery(''); setCmdIndex(0) }}
              style={{ cursor: 'pointer' }}
            >
              <i className="ri-search-line" />
              <span style={{ color: 'var(--text-secondary, #999)', fontSize: 14 }}>검색... (Ctrl+K)</span>
            </button>

            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="topbar-btn"
                title="알림"
                onClick={() => { setNotifOpen(prev => !prev); setHelpOpen(false) }}
              >
                <i className="ri-notification-3-line" />
                {unreadCount > 0 && <span className="notification-dot" />}
              </button>
              {notifOpen && (
                <div className="topbar-dropdown" style={{ position: 'absolute', top: '100%', right: 0, width: 360, marginTop: 8, background: 'var(--bg-primary, #fff)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.12)', border: '1px solid var(--border-color, #e5e7eb)', zIndex: 1000, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>알림 {unreadCount > 0 && <span style={{ color: '#7c3aed', fontSize: 13 }}>({unreadCount})</span>}</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                      >
                        모두 읽음
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.length === 0 && (
                      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary, #9ca3af)' }}>
                        <i className="ri-notification-off-line" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.5 }} />
                        <p style={{ fontSize: 13, margin: 0 }}>알림이 없습니다</p>
                        <p style={{ fontSize: 11, margin: '4px 0 0', opacity: 0.8 }}>새 이벤트가 발생하면 여기 표시됩니다</p>
                      </div>
                    )}
                    {notifications.map(notif => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: '12px 16px',
                          border: 'none', background: notif.unread ? 'var(--bg-secondary, #f8f7ff)' : 'none',
                          cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-color, #f3f4f6)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary, #f3f4f6)'}
                        onMouseLeave={e => e.currentTarget.style.background = notif.unread ? 'var(--bg-secondary, #f8f7ff)' : 'transparent'}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `var(--${notif.color}-bg, #ede9fe)`, color: `var(--${notif.color}-text, #7c3aed)`, fontSize: 16 }}>
                          <i className={notif.icon} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{notif.title}</span>
                            {notif.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />}
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary, #888)', margin: '2px 0 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.desc}</p>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary, #aaa)' }}>{notif.time}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color, #e5e7eb)', textAlign: 'center' }}>
                    <button
                      onClick={() => { navigate('/app/settings'); setNotifOpen(false) }}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                    >
                      알림 설정 관리
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Help Button */}
            <div ref={helpRef} style={{ position: 'relative' }}>
              <button
                className="topbar-btn"
                title="도움말"
                onClick={() => { setHelpOpen(prev => !prev); setNotifOpen(false) }}
              >
                <i className="ri-question-line" />
              </button>
              {helpOpen && (
                <div className="topbar-dropdown" style={{ position: 'absolute', top: '100%', right: 0, width: 260, marginTop: 8, background: 'var(--bg-primary, #fff)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.12)', border: '1px solid var(--border-color, #e5e7eb)', zIndex: 1000, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>도움말</span>
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    {HELP_LINKS.map(link => (
                      <button
                        key={link.label}
                        onClick={() => handleHelpAction(link)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary, #f3f4f6)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <i className={link.icon} style={{ fontSize: 18, color: 'var(--text-secondary, #666)' }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #1a1a1a)' }}>{link.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary, #999)' }}>{link.desc}</div>
                        </div>
                        {link.external && <i className="ri-external-link-line" style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--text-tertiary, #ccc)' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="user-menu-wrap" ref={userMenuRef} style={{ position: 'relative' }}>
              <div className="user-menu" onClick={() => setUserMenuOpen(prev => !prev)}>
                <div className="user-avatar">{userInitial}</div>
                <span>{userName}</span>
                <i className={`ri-arrow-${userMenuOpen ? 'up' : 'down'}-s-line`} style={{ fontSize: 14, color: 'var(--text-secondary, #999)' }} />
              </div>
              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <button onClick={() => { navigate('/app/settings'); setUserMenuOpen(false) }}>
                    <i className="ri-settings-3-line" /> 계정 설정
                  </button>
                  <div className="user-menu-divider" />
                  <button className="user-menu-logout" onClick={handleLogout}>
                    <i className="ri-logout-box-r-line" /> 로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>

      {/* Command Palette Modal (Ctrl+K) */}
      {cmdPaletteOpen && (
        <div
          className="cmd-palette-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setCmdPaletteOpen(false) }}
        >
          <div className="cmd-palette">
            <div className="cmd-palette-input-wrap">
              <i className="ri-search-line" />
              <input
                ref={cmdInputRef}
                type="text"
                className="cmd-palette-input"
                placeholder="페이지, 액션 검색..."
                value={cmdQuery}
                onChange={(e) => { setCmdQuery(e.target.value); setCmdIndex(0) }}
                onKeyDown={handleCmdKeyDown}
              />
              <kbd className="cmd-palette-kbd">ESC</kbd>
            </div>
            <div className="cmd-palette-results">
              {cmdFlat.length === 0 && (
                <div className="cmd-palette-empty">
                  <i className="ri-search-line" />
                  <p>검색 결과가 없습니다</p>
                </div>
              )}
              {cmdGrouped.actions.length > 0 && (
                <div className="cmd-palette-group">
                  <div className="cmd-palette-group-label">빠른 액션</div>
                  {cmdGrouped.actions.map((item) => {
                    const flatIdx = cmdFlat.indexOf(item)
                    return (
                      <button
                        key={item.path}
                        className={`cmd-palette-item${flatIdx === cmdIndex ? ' active' : ''}`}
                        onClick={() => handleCmdSelect(item)}
                        onMouseEnter={() => setCmdIndex(flatIdx)}
                      >
                        <div className="cmd-item-icon action"><i className={item.icon} /></div>
                        <span>{item.label}</span>
                        <i className="ri-arrow-right-line cmd-item-arrow" />
                      </button>
                    )
                  })}
                </div>
              )}
              {cmdGrouped.pages.length > 0 && (
                <div className="cmd-palette-group">
                  <div className="cmd-palette-group-label">페이지</div>
                  {cmdGrouped.pages.map((item) => {
                    const flatIdx = cmdFlat.indexOf(item)
                    return (
                      <button
                        key={item.path}
                        className={`cmd-palette-item${flatIdx === cmdIndex ? ' active' : ''}`}
                        onClick={() => handleCmdSelect(item)}
                        onMouseEnter={() => setCmdIndex(flatIdx)}
                      >
                        <div className="cmd-item-icon page"><i className={item.icon} /></div>
                        <span>{item.label}</span>
                        {location.pathname === item.path && <span className="cmd-item-current">현재 페이지</span>}
                        <i className="ri-arrow-right-line cmd-item-arrow" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="cmd-palette-footer">
              <span><kbd>↑</kbd><kbd>↓</kbd> 이동</span>
              <span><kbd>Enter</kbd> 선택</span>
              <span><kbd>Esc</kbd> 닫기</span>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShortcutsModal(false) }}
        >
          <div style={{ background: 'var(--bg-primary, #fff)', borderRadius: 16, width: 420, maxWidth: '90vw', boxShadow: '0 24px 48px rgba(0,0,0,.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>키보드 단축키</h3>
              <button onClick={() => setShortcutsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary, #666)', padding: 4 }}>
                <i className="ri-close-line" />
              </button>
            </div>
            <div style={{ padding: '12px 24px 24px' }}>
              {KEYBOARD_SHORTCUTS.map((sc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < KEYBOARD_SHORTCUTS.length - 1 ? '1px solid var(--border-color, #f3f4f6)' : 'none' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-primary, #333)' }}>{sc.desc}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {sc.keys.map(key => (
                      <kbd key={key} style={{ padding: '3px 8px', background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid var(--border-color, #e5e7eb)', color: 'var(--text-primary, #555)' }}>{key}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 업종 선택 모달 */}
      {showIndustryModal && (
        <IndustrySelectModal onComplete={() => setShowIndustryModal(false)} />
      )}
    </div>
  )
}
