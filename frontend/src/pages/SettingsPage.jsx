import { useState, useEffect, useCallback } from 'react'
import { integrationService } from '../api/services'

const TABS = [
  { key: 'account', icon: 'ri-instagram-line', label: '계정 연결' },
  { key: 'profile', icon: 'ri-user-line', label: '프로필' },
  { key: 'team', icon: 'ri-team-line', label: '팀 멤버' },
  { key: 'notifications', icon: 'ri-notification-3-line', label: '알림' },
  { key: 'integrations', icon: 'ri-plug-line', label: '연동 (API)' },
  { key: 'billing', icon: 'ri-bank-card-line', label: '결제 & 요금제' },
]

const TIMEZONES = [
  'Asia/Seoul',
  'Asia/Tokyo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Australia/Sydney',
]

const LANGUAGES = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

const INTEGRATION_DEFS = [
  { id: 'instagram', name: 'Instagram Graph API', icon: 'ri-instagram-line', color: '#E1306C', description: 'Instagram 메시지, 댓글, 스토리 자동화' },
  { id: 'shopify', name: 'Shopify', icon: 'ri-shopping-bag-line', color: '#96BF48', description: '주문 이벤트 기반 자동 DM 발송' },
  { id: 'google-sheets', name: 'Google Sheets', icon: 'ri-file-excel-line', color: '#0F9D58', description: '연락처 및 데이터 자동 동기화' },
  { id: 'stripe', name: 'Stripe', icon: 'ri-bank-card-line', color: '#635BFF', description: '결제 이벤트 기반 자동화 트리거' },
  { id: 'klaviyo', name: 'Klaviyo', icon: 'ri-mail-send-line', color: '#000000', description: '이메일 마케팅 연동 및 세그먼트 동기화' },
  { id: 'openai', name: 'OpenAI / ChatGPT', icon: 'ri-robot-line', color: '#10A37F', description: 'AI 기반 자동 응답 생성' },
  { id: 'webhook', name: 'Webhook', icon: 'ri-link', color: '#6366F1', description: '외부 시스템과 커스텀 연동' },
]

const NOTIFICATION_KEYS = [
  { key: 'newFollower', title: '새 팔로워', desc: '새로운 팔로워가 생기면 알림을 받습니다' },
  { key: 'newMessage', title: '새 메시지', desc: '새로운 DM이 도착하면 알림을 받습니다' },
  { key: 'automationError', title: '자동화 오류', desc: '자동화 실행 중 오류 발생 시 알림을 받습니다' },
  { key: 'dailyReport', title: '일일 리포트', desc: '매일 성과 요약을 이메일로 받습니다' },
  { key: 'weeklyReport', title: '주간 리포트', desc: '매주 월요일 주간 성과를 이메일로 받습니다' },
  { key: 'teamActivity', title: '팀 활동', desc: '팀 멤버의 주요 활동에 대해 알림을 받습니다' },
  { key: 'billingAlerts', title: '결제 알림', desc: '결제 및 요금 관련 알림을 받습니다' },
  { key: 'systemUpdates', title: '시스템 업데이트', desc: '서비스 업데이트 및 새 기능 안내를 받습니다' },
]

const DEFAULT_NOTIFICATIONS = {
  newFollower: true,
  newMessage: true,
  automationError: true,
  dailyReport: false,
  weeklyReport: true,
  teamActivity: false,
  billingAlerts: true,
  systemUpdates: true,
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₩0',
    period: '/월',
    features: ['월 1,000 메시지', '기본 자동화 3개', 'Instagram 계정 1개', '커뮤니티 지원'],
    cta: '현재 플랜',
    current: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₩49,000',
    period: '/월',
    features: ['월 50,000 메시지', '무제한 자동화', 'Instagram 계정 5개', '팀 멤버 5명', '우선 지원', 'API 연동', '고급 분석'],
    cta: '업그레이드',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '문의',
    period: '',
    features: ['무제한 메시지', '무제한 자동화', '무제한 계정', '무제한 팀 멤버', '전담 매니저', 'SLA 보장', '커스텀 연동', '온보딩 지원'],
    cta: '문의하기',
  },
]

const TEAM_MEMBERS_INIT = [
  { id: 1, name: '김민수', email: 'minsu@mybrand.co.kr', role: 'owner', avatar: null, joinedAt: '2024-01-15' },
  { id: 2, name: '이서연', email: 'seoyeon@mybrand.co.kr', role: 'admin', avatar: null, joinedAt: '2024-03-20' },
  { id: 3, name: '박지훈', email: 'jihun@mybrand.co.kr', role: 'member', avatar: null, joinedAt: '2024-06-10' },
]

const ROLE_LABELS = { owner: '소유자', admin: '관리자', member: '멤버' }

/* ── Toast component ── */
function Toast({ message, visible, type = 'success' }) {
  if (!visible) return null
  const iconMap = {
    success: 'ri-check-line',
    error: 'ri-error-warning-line',
    info: 'ri-information-line',
    warning: 'ri-alert-line',
  }
  const colorMap = {
    success: '#10B981',
    error: '#EF4444',
    info: '#3B82F6',
    warning: '#F59E0B',
  }
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#1E293B', color: '#fff', padding: '12px 20px',
      borderRadius: 8, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s ease',
    }}>
      <i className={iconMap[type]} style={{ color: colorMap[type] }} />
      {message}
    </div>
  )
}

/* ── Confirm Dialog ── */
function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }} onClick={onCancel}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '28px 32px',
        maxWidth: 420, width: '90%', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{title}</h3>
        <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel}>
            {cancelLabel || '취소'}
          </button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            {confirmLabel || '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}

function loadNotifications() {
  try {
    const stored = localStorage.getItem('dm_settings_notifications')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return DEFAULT_NOTIFICATIONS
}

function saveNotifications(notifications) {
  try {
    localStorage.setItem('dm_settings_notifications', JSON.stringify(notifications))
  } catch { /* ignore */ }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account')

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000)
  }, [])

  // Confirm dialog state
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false, confirmLabel: '', cancelLabel: '' })

  const showConfirm = useCallback((opts) => {
    setConfirm({ open: true, ...opts })
  }, [])
  const closeConfirm = useCallback(() => {
    setConfirm(prev => ({ ...prev, open: false }))
  }, [])

  // Account connection state
  const [connectedAccount, setConnectedAccount] = useState({
    connected: true,
    username: '@my_brand_kr',
    type: '비즈니스 계정',
    followers: 52341,
  })
  const [accountRefreshing, setAccountRefreshing] = useState(false)

  // Profile state
  const [profile, setProfile] = useState({
    name: '김민수',
    email: 'admin@mybrand.co.kr',
    timezone: 'Asia/Seoul',
    language: 'ko',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Team state
  const [teamMembers, setTeamMembers] = useState(TEAM_MEMBERS_INIT)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Notification state - loaded from localStorage
  const [notifications, setNotifications] = useState(loadNotifications)

  // Integration state
  const [integrations, setIntegrations] = useState({})
  const [apiKeys, setApiKeys] = useState({})
  const [visibleKeys, setVisibleKeys] = useState({})
  const [integrationLoading, setIntegrationLoading] = useState({})

  // Billing state
  const [currentPlan, setCurrentPlan] = useState('free')
  const [planUpgrading, setPlanUpgrading] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await integrationService.list()
        if (!mounted) return
        const map = {}
        ;(list || []).forEach((item) => {
          map[item.id] = item
        })
        setIntegrations(map)
      } catch {
        // silently fail for now
      }
    })()
    return () => { mounted = false }
  }, [])

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    saveNotifications(notifications)
  }, [notifications])

  // Profile handlers
  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setProfileSaved(false)
  }

  const handleProfileSave = () => {
    if (!profile.name.trim()) {
      showToast('이름을 입력해 주세요.', 'error')
      return
    }
    if (!isValidEmail(profile.email)) {
      showToast('올바른 이메일 주소를 입력해 주세요.', 'error')
      return
    }
    setProfileSaving(true)
    setTimeout(() => {
      setProfileSaving(false)
      setProfileSaved(true)
      showToast('프로필이 저장되었습니다.')
      setTimeout(() => setProfileSaved(false), 3000)
    }, 800)
  }

  // Team handlers
  const handleInvite = () => {
    setInviteError('')
    if (!inviteEmail.trim()) {
      setInviteError('이메일 주소를 입력해 주세요.')
      return
    }
    if (!isValidEmail(inviteEmail)) {
      setInviteError('올바른 이메일 형식이 아닙니다. (예: user@example.com)')
      return
    }
    if (teamMembers.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      setInviteError('이미 등록된 팀 멤버입니다.')
      return
    }
    const newMember = {
      id: Date.now(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      avatar: null,
      joinedAt: new Date().toISOString().slice(0, 10),
    }
    setTeamMembers((prev) => [...prev, newMember])
    setInviteEmail('')
    setInviteRole('member')
    setShowInviteForm(false)
    showToast(`${newMember.email}에게 초대를 보냈습니다.`)
  }

  const handleRemoveMember = (member) => {
    showConfirm({
      title: '팀 멤버 제거',
      message: `정말 ${member.name} (${member.email})님을 팀에서 제거하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '제거',
      danger: true,
      onConfirm: () => {
        setTeamMembers((prev) => prev.filter((m) => m.id !== member.id))
        closeConfirm()
        showToast(`${member.name}님이 팀에서 제거되었습니다.`)
      },
    })
  }

  // Notification handler
  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      return next
    })
  }

  // Integration handlers
  const handleApiKeyChange = (integrationId, value) => {
    setApiKeys((prev) => ({ ...prev, [integrationId]: value }))
  }

  const toggleKeyVisibility = (integrationId) => {
    setVisibleKeys((prev) => ({ ...prev, [integrationId]: !prev[integrationId] }))
  }

  const handleConnect = async (integrationId) => {
    setIntegrationLoading((prev) => ({ ...prev, [integrationId]: true }))
    try {
      const result = await integrationService.create({
        id: integrationId,
        apiKey: apiKeys[integrationId] || '',
      })
      setIntegrations((prev) => ({ ...prev, [integrationId]: { ...result, connected: true } }))
      showToast(`${INTEGRATION_DEFS.find(d => d.id === integrationId)?.name || integrationId} 연결에 성공했습니다.`)
    } catch {
      // Simulate success for demo
      setIntegrations((prev) => ({ ...prev, [integrationId]: { id: integrationId, connected: true } }))
      showToast(`${INTEGRATION_DEFS.find(d => d.id === integrationId)?.name || integrationId} 연결에 성공했습니다.`)
    } finally {
      setIntegrationLoading((prev) => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleDisconnect = (integrationId) => {
    const defName = INTEGRATION_DEFS.find(d => d.id === integrationId)?.name || integrationId
    showConfirm({
      title: '연동 해제',
      message: `${defName} 연동을 해제하시겠습니까? 이 연동을 사용하는 자동화가 중단될 수 있습니다.`,
      confirmLabel: '연결 해제',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        setIntegrationLoading((prev) => ({ ...prev, [integrationId]: true }))
        try {
          await integrationService.delete(integrationId)
        } catch {
          // proceed anyway for demo
        }
        setIntegrations((prev) => {
          const next = { ...prev }
          delete next[integrationId]
          return next
        })
        setApiKeys((prev) => ({ ...prev, [integrationId]: '' }))
        setIntegrationLoading((prev) => ({ ...prev, [integrationId]: false }))
        showToast(`${defName} 연동이 해제되었습니다.`)
      },
    })
  }

  // Instagram OAuth placeholder
  const handleInstagramConnect = () => {
    const oauthUrl = 'https://api.instagram.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=user_profile,user_media&response_type=code'
    // Check for placeholder values
    if (oauthUrl.includes('YOUR_CLIENT_ID') || oauthUrl.includes('YOUR_REDIRECT_URI')) {
      showToast('Instagram OAuth가 아직 설정되지 않았습니다. 관리자에게 문의하거나 .env 파일에서 INSTAGRAM_CLIENT_ID와 REDIRECT_URI를 설정해 주세요.', 'warning')
      return
    }
    window.open(oauthUrl, '_blank', 'width=600,height=700')
  }

  const handleInstagramDisconnect = () => {
    showConfirm({
      title: '인스타그램 연결 해제',
      message: '인스타그램 계정 연결을 해제하시겠습니까? 모든 DM 자동화가 중단되며, 진행 중인 캠페인이 중지됩니다.',
      confirmLabel: '연결 해제',
      danger: true,
      onConfirm: () => {
        setConnectedAccount((prev) => ({ ...prev, connected: false }))
        closeConfirm()
        showToast('인스타그램 연결이 해제되었습니다.')
      },
    })
  }

  const handleInstagramRefresh = () => {
    setAccountRefreshing(true)
    setTimeout(() => {
      setConnectedAccount((prev) => ({
        ...prev,
        followers: prev.followers + Math.floor(Math.random() * 50) + 1,
      }))
      setAccountRefreshing(false)
      showToast('계정 정보가 새로고침되었습니다.')
    }, 1200)
  }

  // Plan upgrade
  const handlePlanAction = (plan) => {
    if (plan.current) return
    if (plan.id === 'enterprise') {
      showToast('Enterprise 플랜 문의가 접수되었습니다. 영업팀에서 연락드리겠습니다.', 'info')
      return
    }
    showConfirm({
      title: '플랜 업그레이드',
      message: `${plan.name} 플랜 (${plan.price}${plan.period})으로 업그레이드하시겠습니까? 즉시 새 플랜이 적용됩니다.`,
      confirmLabel: '업그레이드',
      onConfirm: () => {
        closeConfirm()
        setPlanUpgrading(plan.id)
        setTimeout(() => {
          setCurrentPlan(plan.id)
          setPlanUpgrading(null)
          showToast(`${plan.name} 플랜으로 업그레이드되었습니다!`)
        }, 1500)
      },
    })
  }

  // Tab content renderers
  const renderAccountTab = () => (
    <>
      <div className="settings-section">
        <h3>연결된 인스타그램 계정</h3>
        {connectedAccount.connected ? (
          <div className="connected-account">
            <div className="ca-info">
              <div
                className="ca-avatar"
                style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)' }}
              >
                <i className="ri-instagram-line" style={{ color: 'white', fontSize: 24 }} />
              </div>
              <div>
                <strong>{connectedAccount.username}</strong>
                <span>
                  {connectedAccount.type} · 팔로워{' '}
                  {new Intl.NumberFormat('ko-KR').format(connectedAccount.followers)}
                </span>
                <span className="ca-connected">
                  <i className="ri-checkbox-circle-fill" /> 연결됨
                </span>
              </div>
            </div>
            <div className="ca-actions">
              <button
                className="btn-secondary small"
                onClick={handleInstagramRefresh}
                disabled={accountRefreshing}
              >
                {accountRefreshing ? (
                  <><i className="ri-loader-4-line spin" /> 새로고침 중...</>
                ) : (
                  '새로고침'
                )}
              </button>
              <button className="btn-danger small" onClick={handleInstagramDisconnect}>
                연결 해제
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-empty-state">
            <div className="settings-empty-icon">
              <i className="ri-instagram-line" />
            </div>
            <p>연결된 인스타그램 계정이 없습니다.</p>
            <p className="settings-empty-desc">
              인스타그램 비즈니스 계정을 연결하여 DM 자동화를 시작하세요.
            </p>
            <button className="btn-primary" onClick={handleInstagramConnect}>
              <i className="ri-instagram-line" /> 인스타그램 연결하기
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>연결 요구사항</h3>
        <div className="settings-checklist">
          {[
            ['Instagram 비즈니스 또는 크리에이터 계정', true],
            ['Facebook 페이지와 연결된 계정', true],
            ['Instagram Graph API 접근 권한', connectedAccount.connected],
            ['메시지 권한 (instagram_manage_messages)', connectedAccount.connected],
          ].map(([text, done]) => (
            <div className="settings-checklist-item" key={text}>
              <i className={done ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} style={{ color: done ? '#10B981' : '#9CA3AF' }} />
              <span style={{ color: done ? 'inherit' : '#9CA3AF' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  const renderProfileTab = () => (
    <div className="settings-section">
      <h3>프로필 정보</h3>
      <div className="settings-form">
        <div className="settings-form-group">
          <label className="settings-label">이름</label>
          <input
            type="text"
            className="setting-input"
            value={profile.name}
            onChange={(e) => handleProfileChange('name', e.target.value)}
          />
        </div>
        <div className="settings-form-group">
          <label className="settings-label">이메일</label>
          <input
            type="email"
            className="setting-input"
            value={profile.email}
            onChange={(e) => handleProfileChange('email', e.target.value)}
          />
        </div>
        <div className="settings-form-group">
          <label className="settings-label">타임존</label>
          <select
            className="filter-select"
            value={profile.timezone}
            onChange={(e) => handleProfileChange('timezone', e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div className="settings-form-group">
          <label className="settings-label">언어</label>
          <select
            className="filter-select"
            value={profile.language}
            onChange={(e) => handleProfileChange('language', e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>
        <div className="settings-form-actions">
          <button
            className="btn-primary"
            onClick={handleProfileSave}
            disabled={profileSaving}
          >
            {profileSaving ? (
              <><i className="ri-loader-4-line spin" /> 저장 중...</>
            ) : (
              '저장하기'
            )}
          </button>
          {profileSaved && (
            <span className="settings-save-feedback">
              <i className="ri-check-line" /> 저장되었습니다
            </span>
          )}
        </div>
      </div>
    </div>
  )

  const renderTeamTab = () => (
    <>
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>팀 멤버</h3>
          <button className="btn-primary small" onClick={() => { setShowInviteForm(true); setInviteError('') }}>
            <i className="ri-user-add-line" /> 멤버 초대
          </button>
        </div>

        {showInviteForm && (
          <div className="settings-invite-form">
            <div className="settings-invite-row">
              <input
                type="email"
                className={`setting-input${inviteError ? ' input-error' : ''}`}
                placeholder="이메일 주소 입력"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
                style={inviteError ? { borderColor: '#EF4444' } : undefined}
              />
              <select
                className="filter-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="admin">관리자</option>
                <option value="member">멤버</option>
              </select>
              <button className="btn-primary small" onClick={handleInvite}>
                초대
              </button>
              <button className="btn-secondary small" onClick={() => { setShowInviteForm(false); setInviteError('') }}>
                취소
              </button>
            </div>
            {inviteError && (
              <p style={{ color: '#EF4444', fontSize: 13, margin: '4px 0 0', padding: '0 4px' }}>
                <i className="ri-error-warning-line" /> {inviteError}
              </p>
            )}
          </div>
        )}

        <div className="settings-team-list">
          {teamMembers.map((member) => (
            <div className="settings-team-member" key={member.id}>
              <div className="settings-team-info">
                <div className="settings-team-avatar">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>
              </div>
              <div className="settings-team-meta">
                <span className={`settings-role-badge ${member.role}`}>
                  {ROLE_LABELS[member.role]}
                </span>
                {member.role !== 'owner' && (
                  <button
                    className="btn-danger small"
                    onClick={() => handleRemoveMember(member)}
                  >
                    제거
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  const renderNotificationsTab = () => (
    <div className="settings-section">
      <h3>알림 설정</h3>
      <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
        알림 설정은 자동으로 저장됩니다.
      </p>
      {NOTIFICATION_KEYS.map(({ key, title, desc }) => (
        <div className="setting-row" key={key}>
          <div className="setting-info">
            <strong>{title}</strong>
            <p>{desc}</p>
          </div>
          <div
            className={`flow-card-toggle${notifications[key] ? ' active' : ''}`}
            onClick={() => toggleNotification(key)}
          />
        </div>
      ))}
    </div>
  )

  const renderIntegrationsTab = () => (
    <div className="settings-section">
      <h3>API 연동</h3>
      <p className="settings-section-desc">
        외부 서비스를 연동하여 자동화를 확장하세요.
      </p>
      <div className="settings-integrations-grid">
        {INTEGRATION_DEFS.map((def) => {
          const isConnected = !!integrations[def.id]?.connected
          const isLoading = !!integrationLoading[def.id]
          const isKeyVisible = !!visibleKeys[def.id]

          return (
            <div
              className={`settings-integration-card${isConnected ? ' connected' : ''}`}
              key={def.id}
            >
              <div className="settings-integration-header">
                <div className="settings-integration-icon" style={{ background: def.color }}>
                  <i className={def.icon} style={{ color: 'white', fontSize: 20 }} />
                </div>
                <div className="settings-integration-title">
                  <strong>{def.name}</strong>
                  {isConnected && (
                    <span className="settings-integration-status connected">
                      <i className="ri-checkbox-circle-fill" /> 연결됨
                    </span>
                  )}
                  {!isConnected && (
                    <span className="settings-integration-status disconnected">
                      미연결
                    </span>
                  )}
                </div>
              </div>
              <p className="settings-integration-desc">{def.description}</p>
              {!isConnected && (
                <div className="settings-integration-key">
                  <div className="settings-key-input-wrapper">
                    <input
                      type={isKeyVisible ? 'text' : 'password'}
                      className="setting-input"
                      placeholder="API Key 입력"
                      value={apiKeys[def.id] || ''}
                      onChange={(e) => handleApiKeyChange(def.id, e.target.value)}
                    />
                    <button
                      className="settings-key-toggle"
                      onClick={() => toggleKeyVisibility(def.id)}
                      title={isKeyVisible ? '숨기기' : '보기'}
                    >
                      <i className={isKeyVisible ? 'ri-eye-off-line' : 'ri-eye-line'} />
                    </button>
                  </div>
                </div>
              )}
              <div className="settings-integration-actions">
                {isConnected ? (
                  <button
                    className="btn-danger small"
                    disabled={isLoading}
                    onClick={() => handleDisconnect(def.id)}
                  >
                    {isLoading ? <><i className="ri-loader-4-line spin" /> 처리 중...</> : '연결 해제'}
                  </button>
                ) : (
                  <button
                    className="btn-primary small"
                    disabled={isLoading || !apiKeys[def.id]}
                    onClick={() => handleConnect(def.id)}
                  >
                    {isLoading ? <><i className="ri-loader-4-line spin" /> 연결 중...</> : '연결하기'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderBillingTab = () => {
    const activePlan = PLANS.map(p => ({
      ...p,
      current: p.id === currentPlan,
      cta: p.id === currentPlan ? '현재 플랜' : p.cta,
    }))

    return (
      <>
        <div className="settings-section">
          <h3>요금제</h3>
          <p className="settings-section-desc">
            현재 플랜: <strong>{activePlan.find(p => p.current)?.name || 'Free'}</strong>
          </p>
          <div className="settings-plans-grid">
            {activePlan.map((plan) => (
              <div
                className={`settings-plan-card${plan.current ? ' current' : ''}${plan.popular ? ' popular' : ''}`}
                key={plan.id}
              >
                {plan.popular && <div className="settings-plan-badge">인기</div>}
                <h4>{plan.name}</h4>
                <div className="settings-plan-price">
                  <span className="settings-plan-amount">{plan.price}</span>
                  <span className="settings-plan-period">{plan.period}</span>
                </div>
                <ul className="settings-plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <i className="ri-check-line" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={plan.current ? 'btn-secondary' : 'btn-primary'}
                  disabled={plan.current || planUpgrading === plan.id}
                  onClick={() => handlePlanAction(plan)}
                >
                  {planUpgrading === plan.id ? (
                    <><i className="ri-loader-4-line spin" /> 처리 중...</>
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3>결제 내역</h3>
          {currentPlan === 'free' ? (
            <div className="settings-billing-empty">
              <i className="ri-file-list-3-line" />
              <p>결제 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="settings-billing-empty">
              <i className="ri-file-list-3-line" />
              <p>결제 내역이 없습니다.</p>
              <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>
                다음 결제일에 첫 번째 결제 내역이 생성됩니다.
              </p>
            </div>
          )}
        </div>
      </>
    )
  }

  const TAB_RENDERERS = {
    account: renderAccountTab,
    profile: renderProfileTab,
    team: renderTeamTab,
    notifications: renderNotificationsTab,
    integrations: renderIntegrationsTab,
    billing: renderBillingTab,
  }

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        cancelLabel={confirm.cancelLabel}
        danger={confirm.danger}
        onConfirm={confirm.onConfirm || closeConfirm}
        onCancel={closeConfirm}
      />

      <div className="page-header">
        <div>
          <h2>설정</h2>
          <p>계정 및 자동화 설정을 관리하세요</p>
        </div>
      </div>
      <div className="settings-layout">
        <div className="settings-nav">
          {TABS.map((tab) => (
            <a
              href="#"
              key={tab.key}
              className={`settings-nav-item${activeTab === tab.key ? ' active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setActiveTab(tab.key)
              }}
            >
              <i className={tab.icon} /> {tab.label}
            </a>
          ))}
        </div>
        <div className="settings-content">
          {TAB_RENDERERS[activeTab]()}
        </div>
      </div>
    </>
  )
}
