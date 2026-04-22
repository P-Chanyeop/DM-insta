import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { api, getStoredUser, setStoredUser } from '../api/client'
import { integrationService, userService, teamService, billingService, instagramProfileService, recurringService, kakaoService, notificationService } from '../api/services'
import { useToast } from '../components/Toast'
import { usePlan } from '../components/PlanContext'
import IndustrySelectModal, { INDUSTRIES } from '../components/IndustrySelectModal'

const TABS = [
  { key: 'account', icon: 'ri-instagram-line', label: '계정 연결' },
  { key: 'messaging', icon: 'ri-message-3-line', label: '메시징 설정' },
  { key: 'profile', icon: 'ri-user-line', label: '프로필' },
  { key: 'team', icon: 'ri-team-line', label: '팀 멤버' },
  { key: 'recurring', icon: 'ri-repeat-line', label: '알림 구독' },
  { key: 'kakao', icon: 'ri-kakao-talk-fill', label: '카카오 채널', comingSoon: true },
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
  // ── 실제 구현된 연동 ──
  {
    id: 'openai', name: 'OpenAI / ChatGPT', icon: 'ri-robot-line', color: '#10A37F',
    description: '고객 질문에 AI가 자동으로 답변합니다',
    guide: [
      { text: 'OpenAI 사이트에서 API Key 발급', link: 'https://platform.openai.com/api-keys' },
      { text: '아래에 API Key 붙여넣기' },
      { text: '연결하기 클릭하면 끝!' },
    ],
  },
  {
    id: 'webhook', name: 'Webhook (고급)', icon: 'ri-link', color: '#6366F1',
    description: 'DM 수신, 댓글, 결제 등 이벤트가 발생하면 지정한 URL로 자동 알림을 보냅니다',
    helpText: '예: 새 DM이 오면 → 내 서버/노션/슬랙으로 자동 전달. 개발자이거나 Zapier/Make 등 자동화 도구를 사용하는 분께 추천합니다.',
    guide: [
      { text: '이벤트를 수신할 서버 URL을 준비하세요 (예: https://내서버.com/webhook)' },
      { text: 'Zapier/Make를 사용한다면 "Webhook 수신" 트리거로 URL을 발급받으세요', link: 'https://zapier.com/apps/webhook' },
      { text: '아래에 URL을 붙여넣고 "연결 테스트"로 정상 응답을 확인하세요' },
      { text: '연결하기를 누르면, 이벤트 발생 시 해당 URL로 자동 전송됩니다' },
    ],
  },
  // ── 준비중 ──
  { id: 'shopify', name: 'Shopify', icon: 'ri-shopping-bag-line', color: '#96BF48', description: '주문 이벤트 기반 자동 DM 발송', comingSoon: true },
  { id: 'google-sheets', name: 'Google Sheets', icon: 'ri-file-excel-line', color: '#0F9D58', description: '연락처 및 데이터 자동 동기화', comingSoon: true },
  { id: 'klaviyo', name: 'Klaviyo', icon: 'ri-mail-send-line', color: '#000000', description: '이메일 마케팅 연동 및 세그먼트 동기화', comingSoon: true },
  { id: 'kakaopay', name: '카카오페이', icon: 'ri-kakao-talk-fill', color: '#FEE500', description: 'DM 내 카카오페이 결제 링크 자동 발송', comingSoon: true },
  { id: 'naverpay', name: '네이버페이', icon: 'ri-shopping-cart-line', color: '#03C75A', description: '스마트스토어 연동 결제 자동화', comingSoon: true },
  { id: 'tosspay', name: '토스페이', icon: 'ri-bank-card-line', color: '#0064FF', description: '토스 결제/송금 링크 자동 발송', comingSoon: true },
]

const NOTIFICATION_KEYS = [
  { key: 'newMessage', title: '새 메시지', desc: '새로운 DM이 도착하면 알림을 받습니다' },
  { key: 'automationError', title: '자동화 오류', desc: '자동화 실행 중 오류 발생 시 알림을 받습니다' },
  { key: 'dailyReport', title: '일일 리포트', desc: '매일 성과 요약을 이메일로 받습니다' },
  { key: 'weeklyReport', title: '주간 리포트', desc: '매주 월요일 주간 성과를 이메일로 받습니다' },
  { key: 'billingAlerts', title: '결제 알림', desc: '결제 및 요금 관련 알림을 받습니다' },
  { key: 'systemUpdates', title: '시스템 업데이트', desc: '서비스 업데이트 및 새 기능 안내를 받습니다' },
]

const DEFAULT_NOTIFICATIONS = {
  newMessage: true,
  automationError: true,
  dailyReport: false,
  weeklyReport: true,
  billingAlerts: true,
  systemUpdates: true,
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      { text: '월 300건 DM 발송', included: true },
      { text: '플로우 3개', included: true },
      { text: 'Instagram 계정 1개', included: true },
      { text: '커뮤니티 지원', included: true },
      { text: '브로드캐스팅', included: false },
      { text: 'AI 자동 응답', included: false },
      { text: '시퀀스 (드립)', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 19900,
    annualPrice: 15920,
    features: [
      { text: '월 3,000건 DM 발송', included: true },
      { text: '플로우 5개', included: true },
      { text: 'Instagram 계정 2개', included: true },
      { text: '팀 멤버 2명', included: true },
      { text: '브로드캐스팅', included: true },
      { text: '브랜딩 제거', included: true },
      { text: 'AI 자동 응답', included: false },
      { text: '시퀀스 (드립)', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 49900,
    annualPrice: 39920,
    popular: true,
    features: [
      { text: '월 30,000건 DM 발송', included: true },
      { text: '무제한 플로우 & 자동화', included: true },
      { text: 'Instagram 계정 5개', included: true },
      { text: '팀 멤버 5명', included: true },
      { text: 'AI 자동 응답', included: true },
      { text: '브로드캐스팅 & 시퀀스', included: true },
      { text: '고급 분석 & A/B 테스트', included: true },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 149900,
    annualPrice: 119920,
    features: [
      { text: '무제한 DM 발송', included: true },
      { text: '무제한 플로우 & 자동화', included: true },
      { text: '무제한 계정 & 팀', included: true },
      { text: 'API & Webhook 접근', included: true },
      { text: '전담 매니저', included: true },
      { text: '우선 지원 & SLA 보장', included: true },
      { text: '온보딩 지원', included: true },
    ],
  },
]

/* Toast is now provided globally via ToastProvider */

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


export default function SettingsPage() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'account')
  const { plan: currentUserPlan, usage: planUsage, limits: planLimits, refresh: refreshPlan } = usePlan()
  const [billingCycle, setBillingCycle] = useState('monthly')

  // Sync tab when navigated via state (e.g. UpgradeModal → billing)
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab)
    }
  }, [location.state])

  const toast = useToast()
  const showToast = useCallback((message, type = 'success') => {
    toast(message, type)
  }, [toast])

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
    profilePictureUrl: '',
  })
  const [accountRefreshing, setAccountRefreshing] = useState(false)

  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    industry: null,
    timezone: 'Asia/Seoul',
    language: 'ko',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showIndustryModal, setShowIndustryModal] = useState(false)

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

  // Notification state - loaded from API
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const [notifLoading, setNotifLoading] = useState(false)

  // Integration state
  const [integrations, setIntegrations] = useState({})
  const [apiKeys, setApiKeys] = useState({})
  const [visibleKeys, setVisibleKeys] = useState({})
  const [integrationLoading, setIntegrationLoading] = useState({})
  const [openaiTestResult, setOpenaiTestResult] = useState(null) // 'success' | 'error' | null
  const [openaiTestLoading, setOpenaiTestLoading] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState(null) // { success, message } | null
  const [webhookTestLoading, setWebhookTestLoading] = useState(false)

  // Billing state — plan comes from PlanContext (currentUserPlan)
  const [planUpgrading, setPlanUpgrading] = useState(null)
  const [billingInfo, setBillingInfo] = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  // Ice Breaker & Persistent Menu state
  const [iceBreakers, setIceBreakers] = useState([
    { question: '', payload: '' },
  ])
  const [iceBreakerSaving, setIceBreakerSaving] = useState(false)
  const [persistentMenu, setPersistentMenu] = useState([
    { title: '', type: 'postback', payload: '', url: '' },
  ])
  const [persistentMenuSaving, setPersistentMenuSaving] = useState(false)

  // 카카오 채널 상태
  const [kakaoChannel, setKakaoChannel] = useState(null)
  const [kakaoLoading, setKakaoLoading] = useState(false)
  const [kakaoForm, setKakaoForm] = useState({
    channelId: '', searchId: '', senderKey: '', apiKey: '', channelName: '', profileImageUrl: '',
  })
  const [kakaoConnecting, setKakaoConnecting] = useState(false)

  // Recurring Notification 상태
  const [recurringTopics, setRecurringTopics] = useState([])
  const [recurringQuota, setRecurringQuota] = useState(null)
  const [recurringLoading, setRecurringLoading] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [topicSubscribers, setTopicSubscribers] = useState([])
  const [sendMessage, setSendMessage] = useState('')
  const [sendingRecurring, setSendingRecurring] = useState(false)

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
          industry: userData.industry || null,
        }))
        setStoredUser({
          ...(getStoredUser() || {}),
          email: userData.email,
          name: userData.name,
          plan: userData.plan,
          industry: userData.industry,
          onboardingCompleted: userData.onboardingCompleted,
        })
      } catch {
        // Fallback to stored user if API fails
        const stored = getStoredUser()
        if (stored && mounted) {
          setProfile(prev => ({
            ...prev,
            name: stored.name || '',
            email: stored.email || '',
            industry: stored.industry || null,
          }))
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
          // 백엔드 type(OPENAI, WEBHOOK 등)을 프론트 id(openai, webhook)로 매핑
          const key = item.type?.toLowerCase()
          if (key) map[key] = { ...item, connected: true }
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
          profilePictureUrl: data.profilePictureUrl || '',
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

  // Load notification settings from API when tab becomes active
  useEffect(() => {
    if (activeTab === 'notifications') {
      setNotifLoading(true)
      notificationService.getSettings()
        .then(data => {
          if (data && typeof data.newMessage !== 'undefined') {
            setNotifications(data)
          }
        })
        .catch(() => {}) // fallback to defaults
        .finally(() => setNotifLoading(false))
    }
  }, [activeTab])

  // Fetch billing info when billing tab is active
  const fetchBillingInfo = useCallback(async () => {
    setBillingLoading(true)
    try {
      const info = await billingService.getInfo()
      setBillingInfo(info)
      if (info.plan) {
        // plan 상태는 PlanContext에서 관리 — refreshPlan()으로 동기화
        refreshPlan()
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

  useEffect(() => {
    if (activeTab === 'recurring') {
      loadRecurringData()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'kakao') {
      loadKakaoChannel()
    }
  }, [activeTab])

  // Portone 결제는 팝업/모바일 리다이렉트 모두 프론트 콜백 기반 — success 쿼리 파라미터 처리 불필요.
  // (handlePlanAction 에서 confirmPayment 후 직접 refreshPlan 호출.)

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
      setProfile(prev => ({ ...prev, name: updated.name, email: updated.email, industry: updated.industry || prev.industry }))
      setStoredUser({
        ...(getStoredUser() || {}),
        email: updated.email,
        name: updated.name,
        plan: updated.plan,
        industry: updated.industry,
        onboardingCompleted: updated.onboardingCompleted,
      })
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

  // Notification handler - API 연동
  const toggleNotification = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] }
    setNotifications(updated)
    try {
      await notificationService.updateSettings(updated)
      showToast('알림 설정이 저장되었습니다.')
    } catch {
      setNotifications(prev => ({ ...prev, [key]: !prev[key] })) // rollback
      showToast('저장에 실패했습니다.', 'error')
    }
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
    const def = INTEGRATION_DEFS.find(d => d.id === integrationId)
    try {
      const apiKey = apiKeys[integrationId] || ''
      const config = integrationId === 'webhook'
        ? JSON.stringify({ url: apiKey })
        : JSON.stringify({ apiKey })
      const result = await integrationService.create({
        type: integrationId.toUpperCase(),
        name: def?.name || integrationId,
        config,
      })
      setIntegrations((prev) => ({ ...prev, [integrationId]: { ...result, connected: true } }))
      showToast(`${def?.name || integrationId} 연결에 성공했습니다.`)
    } catch (err) {
      showToast(err.message || '연결에 실패했습니다.', 'error')
    } finally {
      setIntegrationLoading((prev) => ({ ...prev, [integrationId]: false }))
    }
  }

  const handleDisconnect = (integrationId) => {
    const defName = INTEGRATION_DEFS.find(d => d.id === integrationId)?.name || integrationId
    const existing = integrations[integrationId]
    showConfirm({
      title: '연동 해제',
      message: `${defName} 연동을 해제하시겠습니까? 이 연동을 사용하는 자동화가 중단될 수 있습니다.`,
      confirmLabel: '연결 해제',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        setIntegrationLoading((prev) => ({ ...prev, [integrationId]: true }))
        try {
          if (existing?.id) {
            await integrationService.delete(existing.id)
          }
        } catch {
          // proceed anyway
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

  // OpenAI 연결 테스트
  const handleOpenaiTest = async () => {
    const key = apiKeys['openai'] || ''
    if (!key) {
      showToast('API Key를 입력해 주세요.', 'warning')
      return
    }
    setOpenaiTestLoading(true)
    setOpenaiTestResult(null)
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      })
      if (res.ok) {
        setOpenaiTestResult('success')
        showToast('OpenAI API 연결이 정상입니다!', 'success')
      } else {
        setOpenaiTestResult('error')
        const body = await res.json().catch(() => ({}))
        showToast(body?.error?.message || `API 오류: ${res.status}`, 'error')
      }
    } catch {
      setOpenaiTestResult('error')
      showToast('네트워크 오류: OpenAI 서버에 연결할 수 없습니다.', 'error')
    } finally {
      setOpenaiTestLoading(false)
    }
  }

  // Webhook 연결 테스트
  const handleWebhookTest = async () => {
    const url = (apiKeys['webhook'] || '').trim()
    if (!url) {
      showToast('Webhook URL을 입력해 주세요.', 'warning')
      return
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showToast('http:// 또는 https://로 시작하는 URL을 입력해 주세요.', 'warning')
      return
    }
    setWebhookTestLoading(true)
    setWebhookTestResult(null)
    try {
      const result = await api.post('/integrations/webhook/test', {
        url,
        method: 'POST',
        headers: '{}',
        body: '',
      })
      setWebhookTestResult(result)
      if (result.success) {
        showToast('Webhook 연결이 정상입니다!', 'success')
      } else {
        showToast(result.message || 'Webhook 연결에 실패했습니다.', 'error')
      }
    } catch {
      setWebhookTestResult({ success: false, message: '테스트 요청에 실패했습니다.' })
      showToast('테스트 요청에 실패했습니다.', 'error')
    } finally {
      setWebhookTestLoading(false)
    }
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

  // Portone(다날) 정기결제 — IMP.request_pay 로 빌링키 등록 + 첫 결제 동시 처리
  const handlePlanAction = async (planId) => {
    if (!window.IMP) {
      showToast('결제 모듈이 로드되지 않았습니다. 페이지를 새로고침해주세요.', 'error')
      return
    }
    setPlanUpgrading(planId)
    try {
      // 1) 서버에서 결제 파라미터 발급 (merchant_uid, customer_uid, 금액 등)
      const params = await billingService.createCheckout({ planType: planId.toUpperCase() })

      // 2) IMP 초기화
      window.IMP.init(params.impCode)

      // 3) 결제창 호출 — customer_uid 포함 시 Portone 이 빌링키 자동 저장
      await new Promise((resolve) => {
        window.IMP.request_pay({
          pg: params.pg,
          pay_method: params.payMethod || 'card',
          merchant_uid: params.merchantUid,
          customer_uid: params.customerUid,
          name: params.name,
          amount: params.amount,
          buyer_email: params.buyerEmail,
          buyer_name: params.buyerName,
          currency: 'KRW',
        }, async (rsp) => {
          if (!rsp.success) {
            showToast(rsp.error_msg || '결제가 취소되었거나 실패했습니다.', 'error')
            resolve()
            return
          }
          try {
            // 4) 서버 검증 — 금액/상태 재확인 후 Subscription 저장
            await billingService.confirmPayment({
              impUid: rsp.imp_uid,
              merchantUid: rsp.merchant_uid,
            })
            showToast('결제가 완료되었습니다!', 'success')
            const info = await billingService.getInfo()
            setBillingInfo(info)
            refreshPlan()
          } catch (e) {
            showToast(e.message || '결제 검증에 실패했습니다.', 'error')
          } finally {
            resolve()
          }
        })
      })
    } catch (err) {
      showToast(err.message || '결제 처리 중 오류가 발생했습니다.', 'error')
    } finally {
      setPlanUpgrading(null)
    }
  }

  // 구독 해지 — 현재 결제 주기 종료 시 FREE 로 전환
  const handleManageSubscription = async () => {
    const ok = window.confirm('구독을 해지하시겠습니까? 현재 결제 주기가 끝나면 FREE 플랜으로 전환됩니다.')
    if (!ok) return
    setPortalLoading(true)
    try {
      const info = await billingService.cancel()
      setBillingInfo(info)
      refreshPlan()
      showToast('구독 해지가 예약되었습니다.', 'success')
    } catch (err) {
      showToast(err.message || '구독 해지 요청에 실패했습니다.', 'error')
    } finally {
      setPortalLoading(false)
    }
  }

  // ── Ice Breaker Handlers ──
  const handleIceBreakerChange = (index, field, value) => {
    setIceBreakers(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  const addIceBreaker = () => {
    if (iceBreakers.length >= 4) return
    setIceBreakers(prev => [...prev, { question: '', payload: '' }])
  }
  const removeIceBreaker = (index) => {
    setIceBreakers(prev => prev.filter((_, i) => i !== index))
  }
  const saveIceBreakers = async () => {
    const validItems = iceBreakers.filter(ib => ib.question.trim())
    if (validItems.length === 0) {
      showToast('질문을 1개 이상 입력해 주세요.', 'error')
      return
    }
    setIceBreakerSaving(true)
    try {
      await instagramProfileService.setIceBreakers(
        validItems.map(ib => ({ question: ib.question.trim(), payload: ib.payload.trim() || ib.question.trim() }))
      )
      showToast('Ice Breaker가 설정되었습니다.')
    } catch (err) {
      showToast(err.message || 'Ice Breaker 설정에 실패했습니다.', 'error')
    } finally {
      setIceBreakerSaving(false)
    }
  }
  const deleteAllIceBreakers = async () => {
    setIceBreakerSaving(true)
    try {
      await instagramProfileService.deleteIceBreakers()
      setIceBreakers([{ question: '', payload: '' }])
      showToast('Ice Breaker가 삭제되었습니다.')
    } catch (err) {
      showToast(err.message || 'Ice Breaker 삭제에 실패했습니다.', 'error')
    } finally {
      setIceBreakerSaving(false)
    }
  }

  // ── Persistent Menu Handlers ──
  const handleMenuChange = (index, field, value) => {
    setPersistentMenu(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  const addMenuItem = () => {
    if (persistentMenu.length >= 5) return
    setPersistentMenu(prev => [...prev, { title: '', type: 'postback', payload: '', url: '' }])
  }
  const removeMenuItem = (index) => {
    setPersistentMenu(prev => prev.filter((_, i) => i !== index))
  }
  const savePersistentMenu = async () => {
    const validItems = persistentMenu.filter(m => m.title.trim())
    if (validItems.length === 0) {
      showToast('메뉴 항목을 1개 이상 입력해 주세요.', 'error')
      return
    }
    setPersistentMenuSaving(true)
    try {
      await instagramProfileService.setPersistentMenu(
        validItems.map(m => ({
          title: m.title.trim(),
          type: m.type,
          ...(m.type === 'web_url' ? { url: m.url.trim() } : { payload: m.payload.trim() || m.title.trim() }),
        }))
      )
      showToast('Persistent Menu가 설정되었습니다.')
    } catch (err) {
      showToast(err.message || 'Persistent Menu 설정에 실패했습니다.', 'error')
    } finally {
      setPersistentMenuSaving(false)
    }
  }
  const deleteAllPersistentMenu = async () => {
    setPersistentMenuSaving(true)
    try {
      await instagramProfileService.deletePersistentMenu()
      setPersistentMenu([{ title: '', type: 'postback', payload: '', url: '' }])
      showToast('Persistent Menu가 삭제되었습니다.')
    } catch (err) {
      showToast(err.message || 'Persistent Menu 삭제에 실패했습니다.', 'error')
    } finally {
      setPersistentMenuSaving(false)
    }
  }

  // Tab content renderers
  const renderMessagingTab = () => (
    <>
      {/* Ice Breaker Section */}
      <div className="settings-section">
        <div className="messaging-section-header">
          <div>
            <h3><i className="ri-questionnaire-line" /> Ice Breaker</h3>
            <p className="messaging-section-desc">
              DM 대화를 처음 시작할 때 표시되는 FAQ 버튼입니다. 최대 4개까지 설정할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="messaging-items-list">
          {iceBreakers.map((ib, idx) => (
            <div className="messaging-item-row" key={idx}>
              <div className="messaging-item-number">{idx + 1}</div>
              <div className="messaging-item-fields">
                <input
                  type="text"
                  className="setting-input"
                  placeholder="질문 텍스트 (예: 💰 가격 문의)"
                  value={ib.question}
                  onChange={(e) => handleIceBreakerChange(idx, 'question', e.target.value)}
                  maxLength={80}
                />
                <input
                  type="text"
                  className="setting-input small"
                  placeholder="Payload (비우면 질문과 동일)"
                  value={ib.payload}
                  onChange={(e) => handleIceBreakerChange(idx, 'payload', e.target.value)}
                />
              </div>
              {iceBreakers.length > 1 && (
                <button className="messaging-item-remove" onClick={() => removeIceBreaker(idx)} title="삭제">
                  <i className="ri-close-line" />
                </button>
              )}
            </div>
          ))}
        </div>

        {iceBreakers.length < 4 && (
          <button className="btn-secondary small" onClick={addIceBreaker} style={{ marginTop: 8 }}>
            <i className="ri-add-line" /> 항목 추가
          </button>
        )}

        <div className="messaging-actions">
          <button className="btn-primary" onClick={saveIceBreakers} disabled={iceBreakerSaving}>
            {iceBreakerSaving ? <><i className="ri-loader-4-line spin" /> 저장 중...</> : <><i className="ri-save-line" /> Ice Breaker 저장</>}
          </button>
          <button className="btn-ghost" onClick={deleteAllIceBreakers} disabled={iceBreakerSaving}>
            <i className="ri-delete-bin-line" /> 초기화
          </button>
        </div>

        {/* DM Preview */}
        <div className="messaging-preview">
          <div className="messaging-preview-title">
            <i className="ri-smartphone-line" /> 미리보기
          </div>
          <div className="messaging-preview-phone">
            <div className="messaging-preview-header">
              <div className="mp-avatar"><i className="ri-instagram-line" /></div>
              <span>내 비즈니스</span>
            </div>
            <div className="messaging-preview-body">
              <div className="mp-welcome">자주 묻는 질문을 선택해 주세요</div>
              <div className="mp-icebreakers">
                {iceBreakers.filter(ib => ib.question.trim()).length === 0 ? (
                  <div className="mp-ib-empty">질문을 입력하면 여기에 표시됩니다</div>
                ) : (
                  iceBreakers.filter(ib => ib.question.trim()).map((ib, i) => (
                    <div className="mp-ib-btn" key={i}>{ib.question}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Menu Section */}
      <div className="settings-section">
        <div className="messaging-section-header">
          <div>
            <h3><i className="ri-menu-line" /> Persistent Menu</h3>
            <p className="messaging-section-desc">
              DM 대화 하단에 항상 표시되는 메뉴입니다. 사용자가 ≡ 아이콘을 탭하면 표시됩니다.
            </p>
          </div>
        </div>

        <div className="messaging-items-list">
          {persistentMenu.map((item, idx) => (
            <div className="messaging-item-row" key={idx}>
              <div className="messaging-item-number">{idx + 1}</div>
              <div className="messaging-item-fields">
                <input
                  type="text"
                  className="setting-input"
                  placeholder="메뉴 제목 (예: 주문 조회)"
                  value={item.title}
                  onChange={(e) => handleMenuChange(idx, 'title', e.target.value)}
                  maxLength={30}
                />
                <div className="messaging-item-type-row">
                  <select
                    className="setting-input small"
                    value={item.type}
                    onChange={(e) => handleMenuChange(idx, 'type', e.target.value)}
                  >
                    <option value="postback">Postback (자동화 트리거)</option>
                    <option value="web_url">URL 링크</option>
                  </select>
                  {item.type === 'web_url' ? (
                    <input
                      type="url"
                      className="setting-input small"
                      placeholder="https://example.com"
                      value={item.url}
                      onChange={(e) => handleMenuChange(idx, 'url', e.target.value)}
                    />
                  ) : (
                    <input
                      type="text"
                      className="setting-input small"
                      placeholder="Payload (비우면 제목과 동일)"
                      value={item.payload}
                      onChange={(e) => handleMenuChange(idx, 'payload', e.target.value)}
                    />
                  )}
                </div>
              </div>
              {persistentMenu.length > 1 && (
                <button className="messaging-item-remove" onClick={() => removeMenuItem(idx)} title="삭제">
                  <i className="ri-close-line" />
                </button>
              )}
            </div>
          ))}
        </div>

        {persistentMenu.length < 5 && (
          <button className="btn-secondary small" onClick={addMenuItem} style={{ marginTop: 8 }}>
            <i className="ri-add-line" /> 메뉴 추가
          </button>
        )}

        <div className="messaging-actions">
          <button className="btn-primary" onClick={savePersistentMenu} disabled={persistentMenuSaving}>
            {persistentMenuSaving ? <><i className="ri-loader-4-line spin" /> 저장 중...</> : <><i className="ri-save-line" /> Persistent Menu 저장</>}
          </button>
          <button className="btn-ghost" onClick={deleteAllPersistentMenu} disabled={persistentMenuSaving}>
            <i className="ri-delete-bin-line" /> 초기화
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="settings-section">
        <div className="messaging-info-box">
          <i className="ri-information-line" />
          <div>
            <strong>Ice Breaker & Persistent Menu 안내</strong>
            <ul>
              <li>Ice Breaker의 Payload는 자동화 트리거의 키워드와 매칭됩니다.</li>
              <li>Persistent Menu의 Postback 타입도 동일하게 키워드 트리거로 동작합니다.</li>
              <li>설정 변경 후 Instagram 앱에 반영되기까지 몇 분이 소요될 수 있습니다.</li>
              <li>Instagram 비즈니스 계정이 연결되어 있어야 합니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )

  const renderAccountTab = () => (
    <>
      <div className="settings-section">
        <h3>연결된 인스타그램 계정</h3>
        {connectedAccount.connected ? (
          <div className="connected-account">
            <div className="ca-info">
              <div
                className="ca-avatar"
                style={{ background: connectedAccount.profilePictureUrl ? 'transparent' : 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)' }}
              >
                {connectedAccount.profilePictureUrl
                  ? <img src={connectedAccount.profilePictureUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : <i className="ri-instagram-line" style={{ color: 'white', fontSize: 24 }} />}
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

  // ═══════════════════════════════════════
  // Recurring Notification 탭
  // ═══════════════════════════════════════

  const loadRecurringData = async () => {
    setRecurringLoading(true)
    try {
      const [topics, quota] = await Promise.all([
        recurringService.getTopics(),
        recurringService.getQuota(),
      ])
      setRecurringTopics(topics)
      setRecurringQuota(quota)
    } catch (err) {
      toast.error('알림 구독 데이터를 불러올 수 없습니다')
    } finally {
      setRecurringLoading(false)
    }
  }

  const loadSubscribers = async (topic) => {
    setSelectedTopic(topic)
    try {
      const subs = await recurringService.getSubscribers(topic.topic)
      setTopicSubscribers(subs)
    } catch (err) {
      toast.error('구독자 목록을 불러올 수 없습니다')
    }
  }

  const handleSendRecurring = async () => {
    if (!selectedTopic || !sendMessage.trim()) return
    setSendingRecurring(true)
    try {
      const result = await recurringService.send(selectedTopic.topic, sendMessage)
      toast.success(`${result.sentCount}명에게 발송 완료 (실패: ${result.failedCount})`)
      setSendMessage('')
    } catch (err) {
      toast.error(err.message || '발송 실패')
    } finally {
      setSendingRecurring(false)
    }
  }

  const handleUnsubscribe = async (subId) => {
    try {
      await recurringService.unsubscribe(subId)
      if (selectedTopic) loadSubscribers(selectedTopic)
      loadRecurringData()
      toast.success('구독이 해제되었습니다')
    } catch (err) {
      toast.error('구독 해제 실패')
    }
  }

  const renderRecurringTab = () => {
    return (
      <>
        {/* 쿼터 정보 */}
        {recurringQuota && (
          <div className="settings-section">
            <div className="messaging-section-header">
              <h3><i className="ri-bar-chart-box-line" /> 사용량</h3>
            </div>
            <div className="recurring-quota-bar">
              <div className="recurring-quota-item">
                <span>활성 토픽</span>
                <strong>{recurringQuota.activeTopics} / {recurringQuota.maxTopics}</strong>
              </div>
              <div className="recurring-quota-item">
                <span>전체 구독자</span>
                <strong>{recurringQuota.totalSubscribers}명</strong>
              </div>
            </div>
          </div>
        )}

        {/* 토픽 목록 */}
        <div className="settings-section">
          <div className="messaging-section-header">
            <h3><i className="ri-notification-3-line" /> 토픽별 구독 현황</h3>
          </div>

          {recurringLoading ? (
            <div className="loading-state"><div className="spinner" /> 로딩 중...</div>
          ) : recurringTopics.length === 0 ? (
            <div className="messaging-info-box">
              <i className="ri-information-line" />
              <div>
                <strong>구독 토픽이 없습니다</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                  플로우 빌더에서 "알림 구독" 노드를 추가하면 사용자가 옵트인할 수 있습니다.
                  옵트인한 사용자에게는 24시간 외에도 메시지를 발송할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="recurring-topics-list">
              {recurringTopics.map(t => (
                <div key={t.topic}
                  className={`recurring-topic-card ${selectedTopic?.topic === t.topic ? 'active' : ''}`}
                  onClick={() => loadSubscribers(t)}>
                  <div className="recurring-topic-info">
                    <strong>{t.topicLabel || t.topic}</strong>
                    <span className="recurring-topic-id">{t.topic}</span>
                  </div>
                  <div className="recurring-topic-count">
                    <i className="ri-user-line" /> {t.subscriberCount}명
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 선택된 토픽 상세 */}
        {selectedTopic && (
          <div className="settings-section">
            <div className="messaging-section-header">
              <h3><i className="ri-send-plane-line" /> {selectedTopic.topicLabel || selectedTopic.topic} — 메시지 발송</h3>
            </div>

            <div className="recurring-send-form">
              <textarea className="ne-textarea" rows={3}
                value={sendMessage}
                onChange={e => setSendMessage(e.target.value)}
                placeholder="구독자에게 보낼 메시지를 입력하세요..." />
              <button className="btn btn-primary"
                disabled={sendingRecurring || !sendMessage.trim()}
                onClick={handleSendRecurring}>
                {sendingRecurring ? '발송 중...' : `${selectedTopic.subscriberCount}명에게 발송`}
              </button>
            </div>

            <div className="messaging-section-header" style={{ marginTop: 20 }}>
              <h3>구독자 목록 ({topicSubscribers.length}명)</h3>
            </div>

            {topicSubscribers.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: 13 }}>구독자가 없습니다</p>
            ) : (
              <div className="recurring-subscribers-list">
                {topicSubscribers.map(s => (
                  <div key={s.id} className="recurring-subscriber-row">
                    <div className="recurring-subscriber-info">
                      <strong>{s.contactName || '알 수 없음'}</strong>
                      {s.contactUsername && <span className="gb-username">@{s.contactUsername}</span>}
                    </div>
                    <div className="recurring-subscriber-meta">
                      <span>{s.frequency === 'DAILY' ? '매일' : s.frequency === 'WEEKLY' ? '매주' : '매월'}</span>
                      <span>발송 {s.sentCount}회</span>
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleUnsubscribe(s.id)}>
                      구독 해제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 안내 */}
        <div className="messaging-info-box">
          <i className="ri-information-line" />
          <div>
            <strong>Recurring Notification이란?</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              Instagram의 24시간 메시징 윈도우 외에도 마케팅 메시지를 보낼 수 있는 기능입니다.
              사용자가 명시적으로 옵트인해야 하며, Meta 정책에 따라 7일간 최대 10개 토픽, 일일 5개 토픽까지 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </>
    )
  }

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
              <label className="settings-label">업종</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {(() => {
                  const ind = INDUSTRIES.find(i => i.id === profile.industry)
                  if (ind) {
                    return (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 8,
                        background: '#F1F5F9', color: '#1F2937', fontWeight: 600,
                      }}>
                        <i className={ind.icon} style={{ fontSize: 18, color: '#7c3aed' }} />
                        <span>{ind.label}</span>
                      </div>
                    )
                  }
                  return (
                    <span style={{ color: '#94A3B8', fontSize: 14 }}>
                      아직 업종을 선택하지 않았습니다.
                    </span>
                  )
                })()}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowIndustryModal(true)}
                  style={{ padding: '6px 14px' }}
                >
                  <i className="ri-edit-line" /> {profile.industry ? '변경' : '선택'}
                </button>
              </div>
              <span style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                업종에 따라 추천 템플릿과 자동화가 달라집니다.
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

      {/* 비밀번호 변경은 로그인 페이지의 "비밀번호 찾기"에서 처리 */}
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
        설정은 서버에 안전하게 저장됩니다.
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
              className={`settings-integration-card${isConnected ? ' connected' : ''}${def.comingSoon ? ' coming-soon' : ''}`}
              key={def.id}
            >
              <div className="settings-integration-header">
                <div className="settings-integration-icon" style={{ background: def.comingSoon ? '#D1D5DB' : def.color }}>
                  <i className={def.icon} style={{ color: 'white', fontSize: 20 }} />
                </div>
                <div className="settings-integration-title">
                  <strong>{def.name}</strong>
                  {def.comingSoon ? (
                    <span className="settings-integration-status coming-soon">
                      준비중
                    </span>
                  ) : isConnected ? (
                    <span className="settings-integration-status connected">
                      <i className="ri-checkbox-circle-fill" /> 연결됨
                    </span>
                  ) : (
                    <span className="settings-integration-status disconnected">
                      미연결
                    </span>
                  )}
                </div>
              </div>
              <p className="settings-integration-desc">{def.description}</p>

              {/* 준비중 */}
              {def.comingSoon && (
                <div className="settings-integration-coming-soon">
                  <i className="ri-time-line" /> 곧 출시 예정입니다
                </div>
              )}

              {/* 연결 안 됨 — 가이드 + 입력 */}
              {!def.comingSoon && !isConnected && (
                <div className="settings-integration-key">
                  {/* 단계별 가이드 */}
                  {def.guide && (
                    <div className="integration-guide">
                      {def.guide.map((step, i) => (
                        <div className="integration-guide-step" key={i}>
                          <span className="integration-guide-num">{i + 1}</span>
                          {step.link ? (
                            <a href={step.link} target="_blank" rel="noopener noreferrer">
                              {step.text} <i className="ri-external-link-line" />
                            </a>
                          ) : (
                            <span>{step.text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Webhook 도움말 */}
                  {def.helpText && (
                    <div className="integration-help-box">
                      <i className="ri-lightbulb-line" />
                      <span>{def.helpText}</span>
                    </div>
                  )}
                  <div className="settings-key-input-wrapper">
                    <input
                      type={isKeyVisible ? 'text' : 'password'}
                      className="setting-input"
                      placeholder={def.id === 'openai' ? 'sk-... 형식의 API Key 붙여넣기' : def.id === 'webhook' ? 'https://your-server.com/webhook' : 'API Key 입력'}
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
                  {def.id === 'openai' && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="btn-outline small"
                        disabled={openaiTestLoading || !apiKeys['openai']}
                        onClick={handleOpenaiTest}
                        style={{ fontSize: 12 }}
                      >
                        {openaiTestLoading ? (
                          <><i className="ri-loader-4-line spin" /> 테스트 중...</>
                        ) : (
                          <><i className="ri-flask-line" /> 연결 테스트</>
                        )}
                      </button>
                      {openaiTestResult === 'success' && (
                        <span style={{ color: '#10B981', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ri-checkbox-circle-fill" /> 연결 정상
                        </span>
                      )}
                      {openaiTestResult === 'error' && (
                        <span style={{ color: '#EF4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ri-error-warning-fill" /> 연결 실패
                        </span>
                      )}
                    </div>
                  )}
                  {def.id === 'webhook' && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="btn-outline small"
                        disabled={webhookTestLoading || !apiKeys['webhook']}
                        onClick={handleWebhookTest}
                        style={{ fontSize: 12 }}
                      >
                        {webhookTestLoading ? (
                          <><i className="ri-loader-4-line spin" /> 테스트 중...</>
                        ) : (
                          <><i className="ri-send-plane-line" /> 연결 테스트</>
                        )}
                      </button>
                      {webhookTestResult?.success === true && (
                        <span style={{ color: '#10B981', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ri-checkbox-circle-fill" /> {webhookTestResult.message}
                        </span>
                      )}
                      {webhookTestResult?.success === false && (
                        <span style={{ color: '#EF4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ri-error-warning-fill" /> {webhookTestResult.message}
                        </span>
                      )}
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, lineHeight: 1.5 }}>
                    <i className="ri-shield-check-line" /> API 키는 암호화하여 안전하게 저장됩니다.
                  </p>
                </div>
              )}

              {/* OpenAI 연결됨 상태 */}
              {def.id === 'openai' && isConnected && (
                <div className="settings-openai-usage">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                    <i className="ri-checkbox-circle-fill" style={{ color: '#10B981', fontSize: 16 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>AI 자동응답 활성화됨</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        Flow Builder에서 AI 응답 노드를 추가하면 바로 사용됩니다
                      </div>
                    </div>
                  </div>
                  <a
                    href="https://platform.openai.com/usage"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#10A37F', marginTop: 8, textDecoration: 'none' }}
                  >
                    <i className="ri-external-link-line" /> OpenAI 사용량 확인
                  </a>
                </div>
              )}

              {/* 연결/해제 버튼 */}
              {!def.comingSoon && (
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
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── 카카오 채널 함수들 ──
  const loadKakaoChannel = async () => {
    setKakaoLoading(true)
    try {
      const data = await kakaoService.getChannel()
      setKakaoChannel(data || null)
    } catch {
      setKakaoChannel(null)
    } finally {
      setKakaoLoading(false)
    }
  }

  const handleKakaoConnect = async () => {
    if (!kakaoForm.channelId || !kakaoForm.senderKey || !kakaoForm.apiKey) {
      toast.error('채널 ID, 발신 프로필 키, API 키는 필수입니다')
      return
    }
    setKakaoConnecting(true)
    try {
      const data = await kakaoService.connectChannel(kakaoForm)
      setKakaoChannel(data)
      setKakaoForm({ channelId: '', searchId: '', senderKey: '', apiKey: '', channelName: '', profileImageUrl: '' })
      toast.success('카카오 채널이 연결되었습니다')
    } catch (err) {
      toast.error(err.message || '카카오 채널 연결 실패')
    } finally {
      setKakaoConnecting(false)
    }
  }

  const handleKakaoDisconnect = async () => {
    try {
      await kakaoService.disconnectChannel()
      setKakaoChannel(null)
      toast.success('카카오 채널 연결이 해제되었습니다')
    } catch (err) {
      toast.error(err.message || '연결 해제 실패')
    }
  }

  const renderKakaoTab = () => {
    return (
      <>
        <div className="settings-section-card">
          <div className="settings-section-header">
            <div>
              <h3><i className="ri-kakao-talk-fill" style={{ color: '#3C1E1E' }} /> 카카오톡 채널 연동</h3>
              <p>카카오 비즈니스 채널을 연결하여 알림톡/친구톡을 자동 발송하세요</p>
            </div>
          </div>

          {kakaoLoading ? (
            <div className="loading-spinner" style={{ padding: 40 }}>
              <div className="spinner" />
              <p>로딩 중...</p>
            </div>
          ) : kakaoChannel ? (
            <div className="kakao-channel-connected">
              <div className="kakao-channel-card">
                <div className="kakao-channel-icon">
                  {kakaoChannel.profileImageUrl ? (
                    <img src={kakaoChannel.profileImageUrl} alt="" />
                  ) : (
                    <i className="ri-kakao-talk-fill" />
                  )}
                </div>
                <div className="kakao-channel-info">
                  <strong>{kakaoChannel.channelName || '카카오 채널'}</strong>
                  <span className="kakao-channel-id">@{kakaoChannel.searchId || kakaoChannel.channelId}</span>
                  <div className="kakao-channel-meta">
                    <span className={`badge ${kakaoChannel.active ? 'badge-success' : 'badge-warning'}`}>
                      {kakaoChannel.active ? '활성' : '비활성'}
                    </span>
                    {kakaoChannel.connectedAt && (
                      <span className="text-muted">연결일: {new Date(kakaoChannel.connectedAt).toLocaleDateString('ko-KR')}</span>
                    )}
                  </div>
                </div>
                <button className="btn btn-outline-danger" onClick={handleKakaoDisconnect}>
                  <i className="ri-link-unlink-m" /> 연결 해제
                </button>
              </div>

              <div className="kakao-features-grid">
                <div className="kakao-feature-card">
                  <i className="ri-notification-line" style={{ color: '#FEE500' }} />
                  <strong>알림톡</strong>
                  <p>승인된 템플릿 기반 발송. 주문확인, 배송알림 등에 사용.</p>
                </div>
                <div className="kakao-feature-card">
                  <i className="ri-chat-smile-3-line" style={{ color: '#3C1E1E' }} />
                  <strong>친구톡</strong>
                  <p>채널 친구에게 자유 형식 메시지 발송. 마케팅, 프로모션에 활용.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="kakao-connect-form">
              <div className="kakao-connect-guide">
                <h4><i className="ri-guide-line" /> 연동 가이드</h4>
                <ol>
                  <li><a href="https://center-pf.kakao.com" target="_blank" rel="noopener noreferrer">카카오톡 채널 관리자센터</a>에서 비즈니스 채널을 생성하세요</li>
                  <li>비즈뿌리오 등 공식 발송 대행사에 가입하고 API 키를 발급받으세요</li>
                  <li>아래 정보를 입력하여 채널을 연결하세요</li>
                </ol>
              </div>

              <div className="form-grid-2col">
                <div className="ne-field">
                  <label>채널 ID *</label>
                  <input className="ne-input" placeholder="@channel_id"
                    value={kakaoForm.channelId}
                    onChange={e => setKakaoForm(f => ({ ...f, channelId: e.target.value }))} />
                </div>
                <div className="ne-field">
                  <label>검색용 ID</label>
                  <input className="ne-input" placeholder="@search_id (선택)"
                    value={kakaoForm.searchId}
                    onChange={e => setKakaoForm(f => ({ ...f, searchId: e.target.value }))} />
                </div>
                <div className="ne-field">
                  <label>발신 프로필 키 (Sender Key) *</label>
                  <input className="ne-input" placeholder="카카오 비즈센터에서 발급"
                    value={kakaoForm.senderKey}
                    onChange={e => setKakaoForm(f => ({ ...f, senderKey: e.target.value }))} />
                </div>
                <div className="ne-field">
                  <label>API 키 *</label>
                  <input className="ne-input" type="password" placeholder="발송 대행사 API 키"
                    value={kakaoForm.apiKey}
                    onChange={e => setKakaoForm(f => ({ ...f, apiKey: e.target.value }))} />
                </div>
                <div className="ne-field">
                  <label>채널 이름</label>
                  <input className="ne-input" placeholder="표시될 채널 이름 (선택)"
                    value={kakaoForm.channelName}
                    onChange={e => setKakaoForm(f => ({ ...f, channelName: e.target.value }))} />
                </div>
                <div className="ne-field">
                  <label>프로필 이미지 URL</label>
                  <input className="ne-input" placeholder="https://... (선택)"
                    value={kakaoForm.profileImageUrl}
                    onChange={e => setKakaoForm(f => ({ ...f, profileImageUrl: e.target.value }))} />
                </div>
              </div>

              <button className="btn-primary" style={{
                marginTop: 20, marginBottom: 8, background: '#FEE500', color: '#3C1E1E', border: 'none',
                maxWidth: 240, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
                onClick={handleKakaoConnect} disabled={kakaoConnecting}>
                {kakaoConnecting ? (
                  <><i className="ri-loader-4-line spin" /> 연결 중...</>
                ) : (
                  <><i className="ri-kakao-talk-fill" /> 카카오 채널 연결하기</>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="settings-section-card">
          <div className="settings-section-header">
            <div>
              <h3>발송 안내</h3>
              <p>카카오톡 발송 시 유의사항</p>
            </div>
          </div>
          <div className="kakao-notice-list">
            <div className="kakao-notice-item">
              <i className="ri-checkbox-circle-line" style={{ color: '#10B981' }} />
              <div>
                <strong>알림톡</strong>
                <p>카카오 비즈센터에서 템플릿을 등록하고 승인을 받아야 발송할 수 있습니다. 변수(#{'{변수명}'})를 사용하여 개인화된 메시지를 보낼 수 있습니다.</p>
              </div>
            </div>
            <div className="kakao-notice-item">
              <i className="ri-checkbox-circle-line" style={{ color: '#10B981' }} />
              <div>
                <strong>친구톡</strong>
                <p>카카오 채널의 친구(구독자)에게만 발송 가능합니다. 이미지를 첨부할 수 있으며, 버튼을 추가하여 웹 링크나 앱 링크를 연결할 수 있습니다.</p>
              </div>
            </div>
            <div className="kakao-notice-item">
              <i className="ri-information-line" style={{ color: '#F59E0B' }} />
              <div>
                <strong>전화번호 필수</strong>
                <p>카카오톡 발송을 위해서는 연락처에 전화번호(phone) 정보가 필요합니다. 연락처 관리에서 커스텀 필드로 전화번호를 수집하세요.</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const renderBillingTab = () => {
    const isSubscribed = billingInfo && billingInfo.plan && billingInfo.plan.toLowerCase() !== 'free'
    const isCancelPending = billingInfo?.cancelAtPeriodEnd

    const formatPrice = (amount) => {
      if (amount === 0) return '₩0'
      return `₩${amount.toLocaleString('ko-KR')}`
    }

    const getPlanButton = (plan) => {
      const isCurrent = plan.id === currentUserPlan.toLowerCase()
      if (plan.id === 'business') {
        return (
          <button className="btn-primary billing-plan-btn" onClick={() => handlePlanAction('business')}>
            <i className="ri-mail-send-line" /> 영업팀 문의
          </button>
        )
      }
      if (isCurrent) {
        return (
          <button className="btn-secondary billing-plan-btn" disabled>
            현재 플랜
          </button>
        )
      }
      if (plan.id === 'free') {
        if (isSubscribed) return (
          <button className="btn-secondary billing-plan-btn" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? '로딩 중...' : '다운그레이드'}
          </button>
        )
        return <button className="btn-secondary billing-plan-btn" disabled>현재 플랜</button>
      }
      return (
        <button
          className="btn-primary billing-plan-btn"
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

    const usageItems = [
      { label: '월 DM 발송', current: planUsage.monthlyDM || 0, max: planLimits.monthlyDM, icon: 'ri-message-3-line' },
      { label: '자동화 플로우', current: planUsage.flows, max: planLimits.flows, icon: 'ri-flow-chart' },
      { label: '트리거', current: planUsage.automations, max: planLimits.automations, icon: 'ri-robot-2-line' },
    ]

    return (
      <>
        {/* Subscription status */}
        <div className="settings-section">
          <h3>구독 현황</h3>
          {billingLoading ? (
            <div className="billing-status-card">
              <i className="ri-loader-4-line spin" style={{ fontSize: 20 }} /> 로딩 중...
            </div>
          ) : isSubscribed ? (
            <div className="billing-status-card subscribed">
              <div className="billing-status-info">
                <div className="billing-status-icon">
                  <i className="ri-vip-crown-2-line" />
                </div>
                <div>
                  <div className="billing-status-plan">
                    <strong>{billingInfo.plan} 플랜</strong>
                    <span className={`billing-status-badge ${isCancelPending ? 'warning' : 'active'}`}>
                      {isCancelPending ? '취소 예정' : '활성'}
                    </span>
                  </div>
                  {billingInfo.currentPeriodEnd && (
                    <div className="billing-status-date">
                      {isCancelPending ? '만료일' : '다음 결제일'}:{' '}
                      <strong>{new Date(billingInfo.currentPeriodEnd).toLocaleDateString('ko-KR')}</strong>
                    </div>
                  )}
                </div>
              </div>
              <button className="btn-secondary" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <><i className="ri-loader-4-line spin" /> 로딩 중...</> : <><i className="ri-settings-3-line" /> 구독 관리</>}
              </button>
            </div>
          ) : (
            <div className="billing-status-card free">
              <i className="ri-information-line" />
              <span>현재 무료 플랜입니다. 아래에서 업그레이드하여 모든 기능을 활용하세요.</span>
            </div>
          )}
        </div>

        {/* Usage overview */}
        <div className="settings-section">
          <h3>사용량</h3>
          <div className="billing-usage-grid">
            {usageItems.map(item => {
              const isUnlimited = item.max === Infinity
              const pct = isUnlimited ? 5 : Math.min(100, Math.round((item.current / item.max) * 100))
              const isNear = !isUnlimited && pct >= 80
              const isFull = !isUnlimited && pct >= 100
              return (
                <div className="billing-usage-item" key={item.label}>
                  <div className="billing-usage-header">
                    <i className={item.icon} />
                    <span>{item.label}</span>
                    <span className={`billing-usage-count${isFull ? ' full' : isNear ? ' near' : ''}`}>
                      {item.current.toLocaleString()} / {isUnlimited ? '무제한' : item.max.toLocaleString()}
                    </span>
                  </div>
                  <div className="billing-usage-track">
                    <div
                      className={`billing-usage-fill${isFull ? ' full' : isNear ? ' near' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Plan cards */}
        <div className="settings-section">
          <div className="billing-plans-header">
            <h3>요금제</h3>
            <div className="billing-cycle-toggle">
              <button
                className={billingCycle === 'monthly' ? 'active' : ''}
                onClick={() => setBillingCycle('monthly')}
              >
                월간
              </button>
              <button
                className={billingCycle === 'annual' ? 'active' : ''}
                onClick={() => setBillingCycle('annual')}
              >
                연간 <span className="billing-save-tag">20% 할인</span>
              </button>
            </div>
          </div>
          <div className="billing-plans-grid">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentUserPlan.toLowerCase()
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
              return (
                <div className={`billing-plan-card${isCurrent ? ' current' : ''}${plan.popular ? ' popular' : ''}`} key={plan.id}>
                  {plan.popular && <div className="billing-plan-popular">추천</div>}
                  {isCurrent && <div className="billing-plan-current">현재</div>}
                  <h4>{plan.name}</h4>
                  <div className="billing-plan-price">
                    <span className="billing-plan-amount">{formatPrice(price)}</span>
                    <span className="billing-plan-period">/월</span>
                  </div>
                  {billingCycle === 'annual' && plan.monthlyPrice > 0 && (
                    <div className="billing-plan-annual-note">
                      연 {formatPrice(price * 12)} (월 {formatPrice(plan.monthlyPrice)}에서 절약)
                    </div>
                  )}
                  <ul className="billing-plan-features">
                    {plan.features.map((f) => (
                      <li key={f.text} className={f.included ? '' : 'excluded'}>
                        <i className={f.included ? 'ri-check-line' : 'ri-close-line'} /> {f.text}
                      </li>
                    ))}
                  </ul>
                  {getPlanButton(plan)}
                </div>
              )
            })}
          </div>
        </div>

        {/* Billing history */}
        <div className="settings-section">
          <h3>결제 내역</h3>
          {billingLoading ? (
            <div className="billing-history-card empty">
              <i className="ri-loader-4-line spin" style={{ fontSize: 20 }} />
              <p>결제 정보를 불러오는 중...</p>
            </div>
          ) : isSubscribed ? (
            <div className="billing-history-card">
              <i className="ri-file-list-3-line" />
              <p>다음 결제 예정일: {billingInfo?.currentPeriodEnd ? new Date(billingInfo.currentPeriodEnd).toLocaleDateString('ko-KR') : '—'}</p>
              {billingInfo?.cancelAtPeriodEnd ? (
                <p style={{ color: '#ef4444', fontSize: 13 }}>해지 예약됨 — 위 날짜 이후 FREE 플랜으로 전환됩니다.</p>
              ) : (
                <button className="btn-secondary small" onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading ? <><i className="ri-loader-4-line spin" /> 처리 중...</> : <><i className="ri-close-circle-line" /> 구독 해지</>}
                </button>
              )}
            </div>
          ) : (
            <div className="billing-history-card empty">
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
    messaging: renderMessagingTab,
    recurring: renderRecurringTab,
    kakao: renderKakaoTab,
    profile: renderProfileTab,
    team: renderTeamTab,
    notifications: renderNotificationsTab,
    integrations: renderIntegrationsTab,
    billing: renderBillingTab,
  }

  return (
    <>
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
              className={`settings-nav-item${activeTab === tab.key ? ' active' : ''}${tab.comingSoon ? ' coming-soon' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                if (!tab.comingSoon) setActiveTab(tab.key)
              }}
              style={tab.comingSoon ? { opacity: 0.5, cursor: 'default' } : undefined}
            >
              <i className={tab.icon} /> {tab.label}
              {tab.comingSoon && <span style={{ fontSize: 10, background: '#e5e7eb', color: '#6b7280', padding: '1px 6px', borderRadius: 8, marginLeft: 6 }}>준비중</span>}
            </a>
          ))}
        </div>
        <div className="settings-content">
          {TAB_RENDERERS[activeTab]()}
        </div>
      </div>

      {showIndustryModal && (
        <IndustrySelectModal
          initialSelected={profile.industry || null}
          onCancel={() => setShowIndustryModal(false)}
          onComplete={(newIndustry) => {
            setShowIndustryModal(false)
            if (newIndustry && newIndustry !== 'skipped') {
              setProfile(prev => ({ ...prev, industry: newIndustry }))
              showToast('업종이 변경되었습니다.')
            }
          }}
        />
      )}
    </>
  )
}
