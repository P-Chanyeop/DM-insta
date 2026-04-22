import { Link } from 'react-router-dom'

/**
 * 이용약관 / 개인정보처리방침 / 마케팅 수신 동의 체크박스 묶음.
 * 가입 폼(/signup, /onboarding/email)에서 공통으로 사용.
 *
 * value: { terms: bool, privacy: bool, marketing: bool }
 * onChange: (nextValue) => void
 * error: string | null  (필수 항목 미동의 시 메시지)
 */
export default function TermsAgreement({ value, onChange, error }) {
  const { terms, privacy, marketing } = value

  const allChecked = terms && privacy && marketing
  const toggleAll = () => {
    const next = !allChecked
    onChange({ terms: next, privacy: next, marketing: next })
  }

  const set = (key, v) => onChange({ ...value, [key]: v })

  return (
    <div style={wrap}>
      {/* 전체 동의 */}
      <label style={{ ...row, ...allRow }}>
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          style={cb}
        />
        <span style={{ fontWeight: 700 }}>전체 동의 (필수·선택 모두 포함)</span>
      </label>

      <div style={divider} />

      {/* 필수 — 이용약관 */}
      <label style={row}>
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => set('terms', e.target.checked)}
          style={cb}
        />
        <span>
          <span style={requiredTag}>필수</span>
          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={link}
            onClick={(e) => e.stopPropagation()}
          >
            이용약관
          </Link>
          에 동의합니다
        </span>
      </label>

      {/* 필수 — 개인정보처리방침 */}
      <label style={row}>
        <input
          type="checkbox"
          checked={privacy}
          onChange={(e) => set('privacy', e.target.checked)}
          style={cb}
        />
        <span>
          <span style={requiredTag}>필수</span>
          <Link
            to="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={link}
            onClick={(e) => e.stopPropagation()}
          >
            개인정보처리방침
          </Link>
          에 동의합니다
        </span>
      </label>

      {/* 선택 — 마케팅 */}
      <label style={row}>
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => set('marketing', e.target.checked)}
          style={cb}
        />
        <span>
          <span style={optionalTag}>선택</span>
          마케팅 정보 수신에 동의합니다
        </span>
      </label>

      {error && (
        <div style={errorStyle}>{error}</div>
      )}
    </div>
  )
}

const wrap = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: '12px 14px',
  background: '#fafafa',
  marginBottom: 14,
}

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 0',
  fontSize: 13,
  color: '#374151',
  cursor: 'pointer',
}

const allRow = {
  fontSize: 14,
  color: '#1f2937',
  padding: '4px 0',
}

const cb = {
  width: 18,
  height: 18,
  cursor: 'pointer',
  accentColor: '#7c3aed',
  flexShrink: 0,
}

const divider = {
  height: 1,
  background: '#e5e7eb',
  margin: '8px 0',
}

const requiredTag = {
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 700,
  color: '#dc2626',
  background: '#fee2e2',
  padding: '2px 6px',
  borderRadius: 4,
  marginRight: 6,
}

const optionalTag = {
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 700,
  color: '#4b5563',
  background: '#e5e7eb',
  padding: '2px 6px',
  borderRadius: 4,
  marginRight: 6,
}

const link = {
  color: '#7c3aed',
  textDecoration: 'underline',
  marginRight: 2,
}

const errorStyle = {
  marginTop: 8,
  fontSize: 12,
  color: '#dc2626',
}
