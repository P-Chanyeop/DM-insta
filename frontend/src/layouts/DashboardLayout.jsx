import { useState, useRef, useEffect, useMemo } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/client'
import { usePlan } from '../components/PlanContext'

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
  '/app/contacts': '연락처',
  '/app/growth': '성장 도구',
  '/app/analytics': '분석',
  '/app/templates': '템플릿',
  '/app/settings': '설정',
  '/app/flows/builder': '플로우 빌더',
}

const DEMO_NOTIFICATIONS = [
  { id: 1, icon: 'ri-message-3-line', color: 'blue', title: '새 DM 수신', desc: '@user_123님이 "가격" 키워드를 보냈습니다', time: '2분 전', unread: true },
  { id: 2, icon: 'ri-flow-chart', color: 'green', title: '자동화 완료', desc: '"쇼핑몰 상품 안내" 플로우가 15건 실행됨', time: '15분 전', unread: true },
  { id: 3, icon: 'ri-user-add-line', color: 'purple', title: '신규 팔로워', desc: '오늘 새 팔로워 23명이 추가되었습니다', time: '1시간 전', unread: false },
  { id: 4, icon: 'ri-broadcast-line', color: 'orange', title: '브로드캐스트 전송 완료', desc: '"4월 프로모션" 캠페인이 1,200명에게 발송됨', time: '3시간 전', unread: false },
  { id: 5, icon: 'ri-error-warning-line', color: 'red', title: 'API 연결 오류', desc: 'Instagram API 토큰이 곧 만료됩니다', time: '5시간 전', unread: false },
]

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

const SEARCHABLE_PAGES = [
  { label: '대시보드', path: '/app', icon: 'ri-dashboard-3-line', keywords: ['대시보드', 'dashboard', '홈'] },
  { label: '자동화 플로우', path: '/app/flows', icon: 'ri-flow-chart', keywords: ['플로우', 'flow', '자동화', '빌더'] },
  { label: '자동화 트리거', path: '/app/automation', icon: 'ri-robot-2-line', keywords: ['트리거', 'trigger', '자동', '키워드'] },
  { label: '라이브 채팅', path: '/app/livechat', icon: 'ri-chat-3-line', keywords: ['채팅', 'chat', '라이브', '메시지', 'DM'] },
  { label: '브로드캐스팅', path: '/app/broadcast', icon: 'ri-broadcast-line', keywords: ['브로드캐스트', 'broadcast', '대량', '발송'] },
  { label: '시퀀스', path: '/app/sequences', icon: 'ri-time-line', keywords: ['시퀀스', 'sequence', '드립', '캠페인'] },
  { label: '연락처', path: '/app/contacts', icon: 'ri-contacts-book-2-line', keywords: ['연락처', 'contact', '구독자', 'CRM'] },
  { label: '성장 도구', path: '/app/growth', icon: 'ri-seedling-line', keywords: ['성장', 'growth', '도구'] },
  { label: '분석', path: '/app/analytics', icon: 'ri-line-chart-line', keywords: ['분석', 'analytics', '통계', '리포트'] },
  { label: '템플릿', path: '/app/templates', icon: 'ri-file-copy-2-line', keywords: ['템플릿', 'template', '양식'] },
  { label: '설정', path: '/app/settings', icon: 'ri-settings-3-line', keywords: ['설정', 'settings', '계정', '연동', 'API'] },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [shortcutsModal, setShortcutsModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS)
  const { planLabel, getUsage, getLimit } = usePlan()

  const location = useLocation()
  const navigate = useNavigate()
  const pageTitle = PAGE_TITLES[location.pathname] || '대시보드'

  const storedUser = useMemo(() => getStoredUser(), [])
  const userName = storedUser?.name || '사용자'
  const userInitial = userName[0] || '?'

  const notifRef = useRef(null)
  const helpRef = useRef(null)
  const searchRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdowns on route change
  useEffect(() => {
    setNotifOpen(false)
    setHelpOpen(false)
    setSearchFocused(false)
    setSearchQuery('')
  }, [location.pathname])

  // Keyboard shortcut: Ctrl+K for search, Ctrl+/ for help, Esc to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setHelpOpen(false)
        setShortcutsModal(false)
        setSearchFocused(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const input = searchRef.current?.querySelector('input')
        if (input) {
          input.focus()
          setSearchFocused(true)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setHelpOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const unreadCount = notifications.filter(n => n.unread).length

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const handleNotifClick = (notif) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n))
    setNotifOpen(false)
  }

  // Search filtering
  const searchResults = searchQuery.trim()
    ? SEARCHABLE_PAGES.filter(page => {
        const q = searchQuery.toLowerCase()
        return page.label.toLowerCase().includes(q) ||
          page.keywords.some(kw => kw.toLowerCase().includes(q))
      })
    : []

  const handleSearchSelect = (path) => {
    navigate(path)
    setSearchQuery('')
    setSearchFocused(false)
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

  // Flow builder has its own full-screen layout
  if (location.pathname.startsWith('/app/flows/builder')) {
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
            <div className="logo-icon"><i className="ri-send-plane-fill" /></div>
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

        <div className="account-selector">
          <div className="account-avatar">M</div>
          <div className="account-details">
            <span className="account-name">@my_brand_kr</span>
            <span className="account-type">비즈니스 계정</span>
          </div>
          <i className="ri-arrow-down-s-line" />
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
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-sidebar-btn" onClick={() => setSidebarOpen(prev => !prev)}>
              <i className={sidebarOpen ? 'ri-close-line' : 'ri-menu-line'} />
            </button>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="topbar-right">
            {/* Search Box */}
            <div className="search-box" ref={searchRef} style={{ position: 'relative' }}>
              <i className="ri-search-line" />
              <input
                type="text"
                placeholder="검색... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    handleSearchSelect(searchResults[0].path)
                  }
                  if (e.key === 'Escape') {
                    e.target.blur()
                    setSearchFocused(false)
                    setSearchQuery('')
                  }
                }}
              />
              {searchFocused && searchQuery.trim() && (
                <div className="topbar-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, minWidth: 280, marginTop: 4, background: 'var(--bg-primary, #fff)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.12)', border: '1px solid var(--border-color, #e5e7eb)', zIndex: 1000, overflow: 'hidden' }}>
                  {searchResults.length > 0 ? (
                    <div style={{ padding: '4px 0' }}>
                      {searchResults.map(page => (
                        <button
                          key={page.path}
                          onClick={() => handleSearchSelect(page.path)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-primary, #1a1a1a)', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary, #f3f4f6)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <i className={page.icon} style={{ fontSize: 18, color: 'var(--text-secondary, #666)' }} />
                          <span>{page.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-secondary, #999)', fontSize: 14 }}>
                      <i className="ri-search-line" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              )}
            </div>

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

            <div className="user-menu">
              <div className="user-avatar">{userInitial}</div>
              <span>{userName}</span>
            </div>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>

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
    </div>
  )
}
