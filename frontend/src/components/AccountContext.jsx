import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { accountService } from '../api/services'
import { getToken } from '../api/client'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState([])
  const [activeAccount, setActiveAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    // 토큰 없으면 호출 skip — OAuth 콜백 등 비인증 상태에서 403 방지
    if (!getToken()) {
      setAccounts([])
      setActiveAccount(null)
      setLoading(false)
      return
    }
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
    // OAuth 콜백/로그인 성공 후 token이 localStorage에 저장되면
    // storage 이벤트나 커스텀 이벤트로 재조회 트리거
    const onAuthChange = () => fetchAccounts()
    window.addEventListener('auth:login', onAuthChange)
    window.addEventListener('storage', (e) => {
      if (e.key === 'authToken' && e.newValue) fetchAccounts()
    })
    return () => {
      window.removeEventListener('auth:login', onAuthChange)
      window.removeEventListener('storage', onAuthChange)
    }
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
