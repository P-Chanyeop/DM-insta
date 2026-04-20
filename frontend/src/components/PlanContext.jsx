import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { billingService } from '../api/services'
import { getStoredUser, getToken } from '../api/client'

const PlanContext = createContext(null)

const PLAN_LIMITS = {
  FREE: {
    label: '무료',
    price: 0,
    monthlyDM: 300,
    contacts: 5000,
    flows: 3,
    automations: 5,
    broadcast: false,
    sequences: false,
    abTesting: false,
    advancedAnalytics: false,
    aiResponse: false,
    teamMembers: 1,
    igAccounts: 1,
    apiWebhooks: false,
    branding: true,  // 센드잇 브랜딩 표시
  },
  STARTER: {
    label: '스타터',
    price: 19900,
    monthlyDM: 3000,
    contacts: 15000,
    flows: 5,
    automations: 10,
    broadcast: true,
    sequences: false,
    abTesting: false,
    advancedAnalytics: false,
    aiResponse: false,
    teamMembers: 2,
    igAccounts: 2,
    apiWebhooks: false,
    branding: false,
  },
  PRO: {
    label: '프로',
    price: 49900,
    monthlyDM: 30000,
    contacts: 50000,
    flows: Infinity,
    automations: Infinity,
    broadcast: true,
    sequences: true,
    abTesting: true,
    advancedAnalytics: true,
    aiResponse: true,
    teamMembers: 5,
    igAccounts: 5,
    apiWebhooks: false,
    branding: false,
  },
  BUSINESS: {
    label: '비즈니스',
    price: 149900,
    monthlyDM: Infinity,
    contacts: Infinity,
    flows: Infinity,
    automations: Infinity,
    broadcast: true,
    sequences: true,
    abTesting: true,
    advancedAnalytics: true,
    aiResponse: true,
    teamMembers: Infinity,
    igAccounts: Infinity,
    apiWebhooks: true,
    branding: false,
  },
}

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState('FREE')
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState({ contacts: 0, flows: 0, automations: 0, monthlyDM: 0 })
  const [loading, setLoading] = useState(true)

  const fetchBilling = useCallback(async () => {
    // 토큰 없으면 호출 skip — OAuth 콜백 등 비인증 상태에서 403 방지
    if (!getToken()) {
      setLoading(false)
      return false
    }
    try {
      const info = await billingService.getInfo()
      if (info) {
        setPlan(info.plan || 'FREE')
        setSubscription(info.subscription || null)
        setUsage({
          contacts: info.contactCount || 0,
          flows: info.flowCount || 0,
          automations: info.automationCount || 0,
          monthlyDM: info.monthlyDMCount || 0,
        })
      }
      return true
    } catch {
      // API 실패 시 로컬 유저 정보에서 플랜 확인
      const user = getStoredUser()
      if (user?.plan) setPlan(user.plan)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBilling()
    // OAuth/로그인 성공 후 token이 저장되면 재조회
    const onAuthChange = () => fetchBilling()
    window.addEventListener('auth:login', onAuthChange)
    const onStorage = (e) => { if (e.key === 'authToken' && e.newValue) fetchBilling() }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('auth:login', onAuthChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [fetchBilling])

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE

  const canUse = useCallback((feature) => {
    return !!limits[feature]
  }, [limits])

  const isAtLimit = useCallback((resource) => {
    const limit = limits[resource]
    if (limit === Infinity) return false
    return (usage[resource] || 0) >= limit
  }, [limits, usage])

  const getLimit = useCallback((resource) => {
    return limits[resource]
  }, [limits])

  const getUsage = useCallback((resource) => {
    return usage[resource] || 0
  }, [usage])

  const value = {
    plan,
    planLabel: limits.label,
    limits,
    usage,
    subscription,
    loading,
    canUse,
    isAtLimit,
    getLimit,
    getUsage,
    refresh: fetchBilling,
  }

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within PlanProvider')
  return ctx
}

export { PLAN_LIMITS }
