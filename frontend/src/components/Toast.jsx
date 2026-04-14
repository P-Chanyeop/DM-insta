import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: 'ri-check-line',
  error: 'ri-error-warning-line',
  warning: 'ri-alert-line',
  info: 'ri-information-line',
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
  }, [])

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, leaving: false }])
    timers.current[id] = setTimeout(() => {
      removeToast(id)
      delete timers.current[id]
    }, duration)
    return id
  }, [removeToast])

  const toast = useCallback({
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur ?? 5000),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    info: (msg, dur) => showToast(msg, 'info', dur),
  }, [showToast])

  // Make toast callable directly: toast('msg') or toast.success('msg')
  const toastFn = Object.assign(
    (msg, type, dur) => showToast(msg, type, dur),
    toast,
  )

  return (
    <ToastContext.Provider value={toastFn}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item toast-${t.type}${t.leaving ? ' toast-leave' : ''}`}
            role="alert"
          >
            <i className={ICONS[t.type]} />
            <span className="toast-msg">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => {
                clearTimeout(timers.current[t.id])
                delete timers.current[t.id]
                removeToast(t.id)
              }}
              aria-label="닫기"
            >
              <i className="ri-close-line" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
