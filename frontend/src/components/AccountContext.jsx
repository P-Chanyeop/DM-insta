import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { accountService } from '../api/services'

const AccountContext = createContext(null)

const DEMO_ACCOUNTS = [
  {
    id: 1, igUserId: '17841400001', username: 'my_brand_kr',
    profilePictureUrl: null, followersCount: 12500,
    accountType: '비즈니스 계정', connected: true, active: true,
    connectedAt: '2025-01-15T10:00:00',
  },
]

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState(DEMO_ACCOUNTS)
  const [activeAccount, setActiveAccount] = useState(DEMO_ACCOUNTS[0])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    try {
      const list = await accountService.list()
      if (list && list.length > 0) {
        setAccounts(list)
        const active = list.find(a => a.active)
        setActiveAccount(active || list[0])
      }
      // API 실패 or 빈 응답 → 데모 데이터 유지
    } catch {
      // API 실패 시 데모 데이터 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const switchAccount = useCallback(async (accountId) => {
    try {
      const switched = await accountService.switch(accountId)
      setActiveAccount(switched)
      setAccounts(prev => prev.map(a => ({
        ...a,
        active: a.id === accountId,
      })))
      return switched
    } catch (err) {
      throw err
    }
  }, [])

  const value = {
    accounts,
    activeAccount,
    loading,
    switchAccount,
    refresh: fetchAccounts,
  }

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
