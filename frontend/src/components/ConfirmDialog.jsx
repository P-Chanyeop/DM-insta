import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'

/* ── ConfirmDialog Context ── */
const ConfirmContext = createContext(null)

/**
 * useConfirm() - window.confirm 대체
 * 사용법:
 *   const confirm = useConfirm()
 *   const ok = await confirm({ title: '삭제 확인', message: '정말 삭제하시겠습니까?' })
 *   if (ok) { ... }
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setDialog({
        title: options.title || '확인',
        message: options.message || '계속 진행하시겠습니까?',
        confirmText: options.confirmText || '확인',
        // null 이면 취소 버튼 숨김 — "확인만 누를 수 있는" 알림형 모달에 사용 (e.g. HARD_BLOCK).
        cancelText: options.cancelText === null ? null : (options.cancelText || '취소'),
        variant: options.variant || 'default', // 'default' | 'danger' | 'warning'
        icon: options.icon || null,
      })
    })
  }, [])

  const handleConfirm = () => {
    resolveRef.current?.(true)
    setDialog(null)
  }

  const handleCancel = () => {
    resolveRef.current?.(false)
    setDialog(null)
  }

  // ESC to cancel
  useEffect(() => {
    if (!dialog) return
    const handler = (e) => {
      if (e.key === 'Escape') handleCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [dialog])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            {dialog.icon && (
              <div className={`confirm-icon ${dialog.variant}`}>
                <i className={dialog.icon} />
              </div>
            )}
            <h3 className="confirm-title">{dialog.title}</h3>
            <p className="confirm-message">{dialog.message}</p>
            <div className="confirm-actions">
              {dialog.cancelText && (
                <button className="btn-secondary" onClick={handleCancel}>{dialog.cancelText}</button>
              )}
              <button
                className={dialog.variant === 'danger' ? 'btn-danger' : 'btn-primary'}
                onClick={handleConfirm}
                autoFocus
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

/**
 * useUnsavedChanges(hasChanges) - 미저장 변경사항 경고
 * 브라우저 새로고침/탭 닫기 시 경고
 */
export function useUnsavedChanges(hasChanges) {
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])
}
