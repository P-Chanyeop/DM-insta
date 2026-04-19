import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { accountService } from '../api/services'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState([])
  const [activeAccount, setActiveAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  const retryRef = useRef(0)

  const fetchAccounts = useCallback(async (isRetry = false) => {
    try {
      const list = await accountService.list()
      if (list && list.length > 0) {
        setAccounts(list)
        const active = list.find(a => a.active)
        setActiveAccount(active || list[0])
        retryRef.current = 0
      } else {
        setAccounts([])
        setActiveAccount(null)
        // OAuth 직후 계정이 아직 없을 수 있으므로 최대 3회 재시도
        if (retryRef.current < 3) {
          retryRef.current++
          setTimeout(() => fetchAccounts(true), 1500)
          return // loading 상태 유지
        }
      }
    } catch {
      // API 실패 시 재시도
      if (retryRef.current < 3) {
        retryRef.current++
        setTimeout(() => fetchAccounts(true), 1500)
        return
      }
    } finally {
      if (!isRetry || retryRef.current >= 3) {
        setLoading(false)
      }
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
