import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { billingService } from '../api/services'
import { getStoredUser } from '../api/client'

const PlanContext = createContext(null)

const PLAN_LIMITS = {
  FREE: {
    label: '무료',
    contacts: 1000,
    flows: 3,
    automations: 5,
    broadcast: false,
    sequences: false,
    abTesting: false,
    advancedAnalytics: false,
    teamMembers: 1,
    igAccounts: 1,
    apiWebhooks: false,
  },
  PRO: {
    label: '프로',
    contacts: 15000,
    flows: Infinity,
    automations: Infinity,
    broadcast: true,
    sequences: true,
    abTesting: true,
    advancedAnalytics: true,
    teamMembers: 5,
    igAccounts: 5,
    apiWebhooks: false,
  },
  ENTERPRISE: {
    label: '비즈니스',
    contacts: Infinity,
    flows: Infinity,
    automations: Infinity,
    broadcast: true,
    sequences: true,
    abTesting: true,
    advancedAnalytics: true,
    teamMembers: Infinity,
    igAccounts: Infinity,
    apiWebhooks: true,
  },
}

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState('FREE')
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState({ contacts: 0, flows: 0, automations: 0 })
  const [loading, setLoading] = useState(true)

  const fetchBilling = useCallback(async () => {
    try {
      const info = await billingService.getInfo()
      if (info) {
        setPlan(info.plan || 'FREE')
        setSubscription(info.subscription || null)
        setUsage({
          contacts: info.contactCount || 0,
          flows: info.flowCount || 0,
          automations: info.automationCount || 0,
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
