import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { accountService } from '../api/services'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState([])
  const [activeAccount, setActiveAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const list = await accountService.list()
      if (list && list.length > 0) {
        setAccounts(list)
        const active = list.find(a => a.active)
        setActiveAccount(active || list[0])
      } else {
        setAccounts([])
        setActiveAccount(null)
      }
    } catch {
      // 실패 시 빈 상태 유지
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
