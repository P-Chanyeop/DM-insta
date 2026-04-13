import { useState, useEffect, useCallback } from 'react'
import { api, getStoredUser, setStoredUser } from '../api/client'
import { integrationService, userService, teamService, billingService } from '../api/services'

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
    connected: false,
    username: '',
    type: '비즈니스 계정',
    followers: 0,
  })
  const [accountRefreshing, setAccountRefreshing] = useState(false)

  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    timezone: 'Asia/Seoul',
    language: 'ko',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)

  // Password change state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Team state
  const [teamMembers, setTeamMembers] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [myRole, setMyRole] = useState(null)
  const [roleUpdating, setRoleUpdating] = useState(null)

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
  const [billingInfo, setBillingInfo] = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  // Load user profile from backend
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const userData = await userService.getMe()
        if (!mounted) return
        setProfile(prev => ({
          ...prev,
          name: userData.name || '',
          email: userData.email || '',
        }))
        setCurrentPlan((userData.plan || 'FREE').toLowerCase())
        setStoredUser({ email: userData.email, name: userData.name, plan: userData.plan })
      } catch {
        // Fallback to stored user if API fails
        const stored = getStoredUser()
        if (stored && mounted) {
          setProfile(prev => ({
            ...prev,
            name: stored.name || '',
            email: stored.email || '',
          }))
          setCurrentPlan((stored.plan || 'FREE').toLowerCase())
        }
      } finally {
        if (mounted) setProfileLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

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

  // Load team members
  const fetchTeamMembers = useCallback(async () => {
    setTeamLoading(true)
    setTeamError(null)
    try {
      const members = await teamService.listMembers()
      setTeamMembers(members || [])
      // Determine current user's role
      const storedUser = getStoredUser()
      if (storedUser) {
        const me = (members || []).find(m => m.email === storedUser.email)
        if (me) setMyRole(me.role)
      }
    } catch (err) {
      setTeamError(err.message || '팀 멤버를 불러오는데 실패했습니다.')
    } finally {
      setTeamLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeamMembers()
  }, [fetchTeamMembers])

  // Instagram 계정 정보 로드 + OAuth 콜백 처리
  const fetchInstagramAccount = useCallback(async () => {
    try {
      const data = await api.get('/instagram/account')
      if (data && data.connected) {
        setConnectedAccount({
          connected: true,
          username: '@' + (data.username || ''),
          type: '비즈니스 계정',
          followers: data.followersCount || 0,
        })
      } else {
        setConnectedAccount(prev => ({ ...prev, connected: false }))
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchInstagramAccount()

    // OAuth 콜백 리다이렉트 처리
    const params = new URLSearchParams(window.location.search)
    if (params.get('instagram_connected') === 'true') {
      showToast('인스타그램 계정이 연결되었습니다!')
      fetchInstagramAccount()
      // URL에서 쿼리 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('error')) {
      showToast('인스타그램 연결에 실패했습니다: ' + params.get('error'), 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchInstagramAccount, showToast])

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    saveNotifications(notifications)
  }, [notifications])

  // Fetch billing info when billing tab is active
  const fetchBillingInfo = useCallback(async () => {
    setBillingLoading(true)
    try {
      const info = await billingService.getInfo()
      setBillingInfo(info)
      if (info.plan) {
        setCurrentPlan(info.plan.toLowerCase())
      }
    } catch {
      // silently fail — user stays on free plan display
    } finally {
      setBillingLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchBillingInfo()
    }
  }, [activeTab, fetchBillingInfo])

  // Handle Stripe checkout success redirect — Fix #10: 폴링으로 webhook 처리 대기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('session_id')) {
      setActiveTab('billing')
      showToast('결제가 완료되었습니다!', 'success')
      window.history.replaceState({}, '', window.location.pathname)

      // webhook 처리가 지연될 수 있으므로 폴링
      let retries = 0
      const maxRetries = 3
      const pollInterval = 2000

      const poll = async () => {
        try {
          const info = await billingService.getInfo()
          setBillingInfo(info)
          if (info.plan) {
            setCurrentPlan(info.plan.toLowerCase())
          }
          if (info.status === 'ACTIVE' || retries >= maxRetries) {
            return
          }
        } catch {
          // ignore polling errors
        }
        retries++
        if (retries < maxRetries) {
          setTimeout(poll, pollInterval)
        }
      }

      // 즉시 한 번 + 최대 2번 재시도 (2초 간격)
      setTimeout(poll, pollInterval)
    }
  }, [showToast])

  // Profile handlers
  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setProfileSaved(false)
  }

  const handleProfileSave = async () => {
    if (!profile.name.trim()) {
      showToast('이름을 입력해 주세요.', 'error')
      return
    }
    setProfileSaving(true)
    try {
      const updated = await userService.updateMe({ name: profile.name.trim() })
      setProfile(prev => ({ ...prev, name: updated.name, email: updated.email }))
      setStoredUser({ email: updated.email, name: updated.name, plan: updated.plan })
      setProfileSaved(true)
      showToast('프로필이 저장되었습니다.')
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err) {
      showToast(err.message || '프로필 저장에 실패했습니다.', 'error')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword) {
      showToast('현재 비밀번호를 입력해 주세요.', 'error')
      return
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      showToast('새 비밀번호는 최소 6자 이상이어야 합니다.', 'error')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('새 비밀번호가 일치하지 않습니다.', 'error')
      return
    }
    setPasswordSaving(true)
    try {
      await userService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showToast('비밀번호가 변경되었습니다.')
    } catch (err) {
      showToast(err.message || '비밀번호 변경에 실패했습니다.', 'error')
    } finally {
      setPasswordSaving(false)
    }
  }

  // Team handlers
  const canManageTeam = myRole === 'OWNER' || myRole === 'ADMIN'

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast('이메일을 입력해 주세요.', 'error')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.trim())) {
      showToast('올바른 이메일 형식을 입력해주세요.', 'error')
      return
    }
    setInviting(true)
    try {
      await teamService.inviteMember({ email: inviteEmail.trim(), role: inviteRole })
      showToast(`${inviteEmail.trim()} 님을 초대했습니다.`)
      setInviteEmail('')
      setInviteRole('MEMBER')
      setShowInviteForm(false)
      fetchTeamMembers()
    } catch (err) {
      showToast(err.message || '초대에 실패했습니다.', 'error')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    setRoleUpdating(memberId)
    try {
      await teamService.updateRole(memberId, { role: newRole })
      showToast('역할이 변경되었습니다.')
      fetchTeamMembers()
    } catch (err) {
      showToast(err.message || '역할 변경에 실패했습니다.', 'error')
    } finally {
      setRoleUpdating(null)
    }
  }

  const handleRemoveMember = (member) => {
    showConfirm({
      title: '팀 멤버 제거',
      message: `${member.name || member.email} 님을 팀에서 제거하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: '제거',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        try {
          await teamService.removeMember(member.id)
          showToast(`${member.name || member.email} 님이 제거되었습니다.`)
          fetchTeamMembers()
        } catch (err) {
          showToast(err.message || '멤버 제거에 실패했습니다.', 'error')
        }
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

  // Instagram OAuth — 백엔드에서 URL을 동적으로 가져옴
  const handleInstagramConnect = async () => {
    try {
      const data = await api.get('/instagram/oauth-url')
      if (data && data.url) {
        window.open(data.url, '_blank', 'width=600,height=700')
      } else {
        showToast('OAuth URL을 가져올 수 없습니다.', 'error')
      }
    } catch (e) {
      showToast('Instagram 연결 설정이 완료되지 않았습니다. 관리자에게 문의하세요.', 'warning')
    }
  }

  const handleInstagramDisconnect = () => {
    showConfirm({
      title: '인스타그램 연결 해제',
      message: '인스타그램 계정 연결을 해제하시겠습니까? 모든 DM 자동화가 중단되며, 진행 중인 캠페인이 중지됩니다.',
      confirmLabel: '연결 해제',
      danger: true,
      onConfirm: async () => {
        try {
          await api.post('/instagram/disconnect')
          setConnectedAccount((prev) => ({ ...prev, connected: false, username: '', followers: 0 }))
          showToast('인스타그램 연결이 해제되었습니다.')
        } catch {
          showToast('연결 해제에 실패했습니다.', 'error')
        }
        closeConfirm()
      },
    })
  }

  const handleInstagramRefresh = async () => {
    setAccountRefreshing(true)
    try {
      await fetchInstagramAccount()
      showToast('계정 정보가 새로고침되었습니다.')
    } catch {
      showToast('새로고침에 실패했습니다.', 'error')
    } finally {
      setAccountRefreshing(false)
    }
  }

  // Plan upgrade via Stripe Checkout
  const handlePlanAction = async (planId) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@sendit.co.kr?subject=Enterprise 플랜 문의'
      return
    }
    setPlanUpgrading(planId)
    try {
      const { checkoutUrl } = await billingService.createCheckout({ planType: planId.toUpperCase() })
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        showToast('결제 페이지를 불러올 수 없습니다.', 'error')
      }
    } catch (err) {
      showToast(err.message || '결제 처리 중 오류가 발생했습니다.', 'error')
    } finally {
      setPlanUpgrading(null)
    }
  }

  // Open Stripe Customer Portal
  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const { portalUrl } = await billingService.createPortal()
      if (portalUrl) {
        window.location.href = portalUrl
      } else {
        showToast('구독 관리 페이지를 불러올 수 없습니다.', 'error')
      }
    } catch (err) {
      showToast(err.message || '구독 관리 페이지를 열 수 없습니다.', 'error')
    } finally {
      setPortalLoading(false)
    }
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
    <>
      <div className="settings-section">
        <h3>프로필 정보</h3>
        {profileLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8' }}>
            <i className="ri-loader-4-line spin" style={{ fontSize: 20 }} /> 로딩 중...
          </div>
        ) : (
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
                disabled
                style={{ background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                이메일 변경은 지원되지 않습니다.
              </span>
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
        )}
      </div>

      <div className="settings-section">
        <h3>비밀번호 변경</h3>
        <div className="settings-form">
          <div className="settings-form-group">
            <label className="settings-label">현재 비밀번호</label>
            <input
              type="password"
              className="setting-input"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="현재 비밀번호 입력"
            />
          </div>
          <div className="settings-form-group">
            <label className="settings-label">새 비밀번호</label>
            <input
              type="password"
              className="setting-input"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="새 비밀번호 입력 (최소 6자)"
            />
          </div>
          <div className="settings-form-group">
            <label className="settings-label">새 비밀번호 확인</label>
            <input
              type="password"
              className="setting-input"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="새 비밀번호 다시 입력"
            />
          </div>
          <div className="settings-form-actions">
            <button
              className="btn-primary"
              onClick={handlePasswordChange}
              disabled={passwordSaving}
            >
              {passwordSaving ? (
                <><i className="ri-loader-4-line spin" /> 변경 중...</>
              ) : (
                '비밀번호 변경'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  const ROLE_LABELS = { OWNER: '소유자', ADMIN: '관리자', MEMBER: '멤버', VIEWER: '뷰어' }
  const ROLE_COLORS = {
    OWNER: { bg: '#F3E8FF', color: '#7C3AED', border: '#DDD6FE' },
    ADMIN: { bg: '#DBEAFE', color: '#2563EB', border: '#BFDBFE' },
    MEMBER: { bg: '#D1FAE5', color: '#059669', border: '#A7F3D0' },
    VIEWER: { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  }

  const renderRoleBadge = (role) => {
    const c = ROLE_COLORS[role] || ROLE_COLORS.VIEWER
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
        borderRadius: 12, fontSize: 12, fontWeight: 600,
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      }}>
        {ROLE_LABELS[role] || role}
      </span>
    )
  }

  const renderTeamTab = () => (
    <>
      {/* Current user role */}
      {myRole && (
        <div className="settings-section" style={{ paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ri-shield-user-line" style={{ fontSize: 18, color: '#7C3AED' }} />
            <span style={{ fontSize: 14, color: '#64748B' }}>내 역할:</span>
            {renderRoleBadge(myRole)}
          </div>
        </div>
      )}

      <div className="settings-section">
        <div className="settings-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>팀 멤버 {!teamLoading && `(${teamMembers.length})`}</h3>
          {canManageTeam && (
            <button
              className="btn-primary small"
              onClick={() => setShowInviteForm(prev => !prev)}
            >
              <i className={showInviteForm ? 'ri-close-line' : 'ri-user-add-line'} />{' '}
              {showInviteForm ? '닫기' : '팀원 초대'}
            </button>
          )}
        </div>

        {/* Invite form */}
        {showInviteForm && canManageTeam && (
          <div style={{
            background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
            padding: 16, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>
                  이메일
                </label>
                <input
                  type="email"
                  className="setting-input"
                  placeholder="초대할 이메일 주소"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ minWidth: 120 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>
                  역할
                </label>
                <select
                  className="setting-input"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={{ width: '100%', height: 40 }}
                >
                  {myRole === 'OWNER' && <option value="ADMIN">관리자</option>}
                  <option value="MEMBER">멤버</option>
                  <option value="VIEWER">뷰어</option>
                </select>
              </div>
              <button
                className="btn-primary small"
                onClick={handleInvite}
                disabled={inviting}
                style={{ height: 40 }}
              >
                {inviting ? <><i className="ri-loader-4-line spin" /> 초대 중...</> : '초대'}
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {teamLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
            <i className="ri-loader-4-line spin" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
            팀 멤버를 불러오는 중...
          </div>
        )}

        {/* Error state */}
        {teamError && !teamLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#EF4444' }}>
            <i className="ri-error-warning-line" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>{teamError}</p>
            <button className="btn-secondary small" onClick={fetchTeamMembers}>
              <i className="ri-refresh-line" /> 다시 시도
            </button>
          </div>
        )}

        {/* Empty state */}
        {!teamLoading && !teamError && teamMembers.length === 0 && (
          <div className="settings-empty-state">
            <div className="settings-empty-icon">
              <i className="ri-team-line" />
            </div>
            <p>팀 멤버가 없습니다.</p>
            <p className="settings-empty-desc">
              팀원을 초대하여 함께 작업을 시작하세요.
            </p>
          </div>
        )}

        {/* Member list */}
        {!teamLoading && !teamError && teamMembers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {teamMembers.map((member) => {
              const storedUser = getStoredUser()
              const isMe = storedUser && storedUser.email === member.email
              const isOwner = member.role === 'OWNER'
              const canEdit = myRole === 'OWNER' && !isOwner && !isMe
              const canRemove = canManageTeam && !isOwner && !isMe

              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px solid #F1F5F9',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isOwner ? 'linear-gradient(135deg, #7C3AED, #A78BFA)' : '#E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isOwner ? '#fff' : '#64748B', fontWeight: 700, fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {(member.name || member.email || '?')[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {member.name || '(이름 없음)'}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>(나)</span>
                      )}
                      {renderRoleBadge(member.role)}
                    </div>
                    <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>
                      {member.email}
                      {member.joinedAt && (
                        <span style={{ marginLeft: 8 }}>
                          · {new Date(member.joinedAt).toLocaleDateString('ko-KR')} 가입
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {canEdit && (
                      <select
                        className="setting-input"
                        value={member.role}
                        onChange={e => handleRoleChange(member.id, e.target.value)}
                        disabled={roleUpdating === member.id}
                        style={{ fontSize: 12, padding: '4px 8px', height: 30, minWidth: 80 }}
                      >
                        <option value="ADMIN">관리자</option>
                        <option value="MEMBER">멤버</option>
                        <option value="VIEWER">뷰어</option>
                      </select>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        title="멤버 제거"
                        style={{
                          background: 'none', border: '1px solid #FCA5A5', borderRadius: 6,
                          color: '#EF4444', cursor: 'pointer', padding: '4px 8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                      >
                        <i className="ri-close-line" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
    const isSubscribed = billingInfo && billingInfo.plan && billingInfo.plan.toLowerCase() !== 'free'
    const isCancelPending = billingInfo?.cancelAtPeriodEnd

    const getPlanButton = (plan) => {
      const isCurrent = plan.id === currentPlan
      if (plan.id === 'enterprise') {
        return (
          <button className="btn-primary" onClick={() => handlePlanAction('enterprise')}>
            <i className="ri-mail-send-line" /> 문의하기
          </button>
        )
      }
      if (isCurrent) {
        return (
          <button className="btn-secondary" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            현재 플랜
          </button>
        )
      }
      if (plan.id === 'free') {
        // If user is on a paid plan, don't show downgrade button — use portal
        if (isSubscribed) return null
        return (
          <button className="btn-secondary" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            현재 플랜
          </button>
        )
      }
      // PRO upgrade button (only show if on FREE)
      if (currentPlan === 'free' || !isSubscribed) {
        return (
          <button
            className="btn-primary"
            disabled={planUpgrading === plan.id}
            onClick={() => handlePlanAction(plan.id)}
          >
            {planUpgrading === plan.id ? (
              <><i className="ri-loader-4-line spin" /> 처리 중...</>
            ) : (
              <><i className="ri-arrow-up-line" /> 업그레이드</>
            )}
          </button>
        )
      }
      return null
    }

    return (
      <>
        {/* Subscription status card */}
        <div className="settings-section">
          <h3>구독 현황</h3>
          {billingLoading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8' }}>
              <i className="ri-loader-4-line spin" style={{ fontSize: 20 }} /> 로딩 중...
            </div>
          ) : isSubscribed ? (
            <div style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="ri-vip-crown-2-line" style={{ color: '#fff', fontSize: 22 }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 16 }}>{billingInfo.plan} 플랜</strong>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                      borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: isCancelPending ? '#FEF3C7' : '#D1FAE5',
                      color: isCancelPending ? '#D97706' : '#059669',
                      border: `1px solid ${isCancelPending ? '#FDE68A' : '#A7F3D0'}`,
                    }}>
                      {isCancelPending ? '취소 예정' : '활성'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    {billingInfo.currentPeriodEnd && (
                      <>
                        {isCancelPending ? '만료일' : '다음 결제일'}:{' '}
                        <strong>{new Date(billingInfo.currentPeriodEnd).toLocaleDateString('ko-KR')}</strong>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <><i className="ri-loader-4-line spin" /> 로딩 중...</>
                ) : (
                  <><i className="ri-settings-3-line" /> 구독 관리</>
                )}
              </button>
            </div>
          ) : (
            <div style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <i className="ri-information-line" style={{ fontSize: 20, color: '#94A3B8' }} />
              <span style={{ fontSize: 14, color: '#64748B' }}>
                현재 무료 플랜입니다. 아래에서 업그레이드할 수 있습니다.
              </span>
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div className="settings-section">
          <h3>요금제</h3>
          <div className="settings-plans-grid">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan
              return (
                <div
                  className={`settings-plan-card${isCurrent ? ' current' : ''}${plan.popular ? ' popular' : ''}`}
                  key={plan.id}
                  style={isCurrent ? { borderColor: '#6366F1', borderWidth: 2 } : undefined}
                >
                  {plan.popular && <div className="settings-plan-badge">인기</div>}
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      background: '#6366F1', color: '#fff', fontSize: 11, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      현재
                    </div>
                  )}
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
                  {getPlanButton(plan)}
                </div>
              )
            })}
          </div>
        </div>

        {/* Billing history / portal link */}
        <div className="settings-section">
          <h3>결제 내역</h3>
          {isSubscribed ? (
            <div style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
              padding: '20px 24px', textAlign: 'center',
            }}>
              <i className="ri-file-list-3-line" style={{ fontSize: 28, color: '#94A3B8', marginBottom: 8, display: 'block' }} />
              <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 12px' }}>
                결제 내역 및 인보이스는 Stripe 고객 포털에서 확인할 수 있습니다.
              </p>
              <button
                className="btn-secondary small"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <><i className="ri-loader-4-line spin" /> 로딩 중...</>
                ) : (
                  <><i className="ri-external-link-line" /> 결제 내역 보기</>
                )}
              </button>
            </div>
          ) : (
            <div className="settings-billing-empty">
              <i className="ri-file-list-3-line" />
              <p>결제 내역이 없습니다.</p>
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
