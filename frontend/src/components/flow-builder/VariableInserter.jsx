import { useState, useRef, useEffect } from 'react'

/* ────────────────────────────────────────────
 *  메시지 변수 삽입 드롭다운
 *  textarea ref를 받아 커서 위치에 변수를 삽입
 * ──────────────────────────────────────────── */

const VARIABLES = [
  { token: '{이름}', label: '이름', desc: '사용자 이름', preview: '홍길동', icon: 'ri-user-line' },
  { token: '{username}', label: '사용자명', desc: 'Instagram @아이디', preview: '@user123', icon: 'ri-at-line' },
  { token: '{키워드}', label: '키워드', desc: '트리거 키워드', preview: '가격', icon: 'ri-hashtag' },
  { token: '{날짜}', label: '날짜', desc: '오늘 날짜', preview: formatKoreanDate(new Date()), icon: 'ri-calendar-line' },
]

export { VARIABLES }

export default function VariableInserter({ textareaRef, value, onChange }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const insertVariable = (token) => {
    const ta = textareaRef?.current
    if (ta) {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = value.slice(0, start) + token + value.slice(end)
      onChange(newVal)
      // 커서를 삽입된 변수 뒤로 이동
      requestAnimationFrame(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = start + token.length
      })
    } else {
      onChange(value + token)
    }
    setOpen(false)
  }

  return (
    <div className="var-inserter" ref={dropdownRef}>
      <button
        type="button"
        className="var-inserter-btn"
        onClick={() => setOpen(!open)}
        title="변수 삽입"
      >
        <i className="ri-braces-line" />
        <span>변수</span>
        <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line`} />
      </button>
      {open && (
        <div className="var-inserter-dropdown">
          <div className="var-inserter-title">변수 삽입</div>
          {VARIABLES.map((v) => (
            <button
              key={v.token}
              className="var-inserter-item"
              onClick={() => insertVariable(v.token)}
            >
              <i className={v.icon} />
              <div className="var-inserter-item-info">
                <span className="var-inserter-item-label">{v.label}</span>
                <span className="var-inserter-item-desc">{v.desc}</span>
              </div>
              <code className="var-inserter-item-token">{v.token}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 변수 보간 유틸리티 ── */

function formatKoreanDate(date) {
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${m}월 ${d}일`
}

/**
 * 메시지 템플릿의 변수를 미리보기 값으로 치환
 */
export function interpolateVariables(template, context = {}) {
  if (!template) return template
  return template
    .replace(/\{이름\}|\{name\}/g, context.name || '홍길동')
    .replace(/\{username\}/g, context.username || '@user123')
    .replace(/\{키워드\}|\{keyword\}/g, context.keyword || '키워드')
    .replace(/\{날짜\}|\{date\}/g, formatKoreanDate(new Date()))
    .replace(/\{custom\.(\w+)\}/g, (_, field) => context.customFields?.[field] || `[${field}]`)
}

/**
 * 메시지에 변수가 포함되어 있는지 확인
 */
export function hasVariables(text) {
  return /\{(이름|name|username|키워드|keyword|날짜|date|custom\.\w+)\}/.test(text)
}
