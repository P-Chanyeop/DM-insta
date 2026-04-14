/* ────────────────────────────────────────────
 *  공통 로딩 컴포넌트
 *  - PageLoader: 전체 페이지 / 섹션 로딩 스피너
 *  - Skeleton: 콘텐츠 플레이스홀더 (카드, 텍스트, 원형)
 * ──────────────────────────────────────────── */

/**
 * 페이지 / 섹션 로딩 스피너
 * @param {string} text - 로딩 메시지 (기본: "불러오는 중...")
 * @param {boolean} compact - true면 작은 인라인 스피너
 */
export default function PageLoader({ text = '불러오는 중...', compact = false }) {
  return (
    <div className={`page-loader${compact ? ' compact' : ''}`}>
      <i className="ri-loader-4-line spin" />
      {text && <span>{text}</span>}
    </div>
  )
}

/**
 * 스켈레톤 플레이스홀더
 * @param {'text'|'title'|'card'|'circle'|'rect'} variant
 * @param {number} width - px 또는 % (문자열 가능)
 * @param {number} height - px
 * @param {number} count - 반복 횟수 (text일 때 유용)
 */
export function Skeleton({ variant = 'text', width, height, count = 1, style }) {
  const cls = `skeleton skeleton-${variant}`
  const s = { ...style }
  if (width) s.width = typeof width === 'number' ? `${width}px` : width
  if (height) s.height = typeof height === 'number' ? `${height}px` : height

  if (count > 1) {
    return (
      <div className="skeleton-group">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={cls} style={i === count - 1 ? { ...s, width: '60%' } : s} />
        ))}
      </div>
    )
  }

  return <div className={cls} style={s} />
}

/**
 * 카드형 스켈레톤 (대시보드/플로우 카드용)
 */
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="rect" height={12} width="40%" />
      <Skeleton variant="text" count={2} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Skeleton variant="rect" height={24} width={80} style={{ borderRadius: 6 }} />
        <Skeleton variant="rect" height={24} width={60} style={{ borderRadius: 6 }} />
      </div>
    </div>
  )
}

/**
 * 테이블 행 스켈레톤
 */
export function SkeletonRow({ cols = 4 }) {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i}>
          <Skeleton variant="text" width={i === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  )
}
