/* ────────────────────────────────────────────
 *  공통 EmptyState 컴포넌트
 *  모든 페이지에서 데이터가 없을 때 일관된 UI 제공
 * ──────────────────────────────────────────── */

export default function EmptyState({
  icon = 'ri-inbox-line',
  title = '데이터가 없습니다',
  description,
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <div className={`empty-state${compact ? ' compact' : ''}`}>
      <div className="empty-state-icon">
        <i className={icon} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      {description && <p className="empty-state-desc">{description}</p>}
      {actionLabel && onAction && (
        <button className="empty-state-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
