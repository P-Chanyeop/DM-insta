const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export function getToken() {
  return localStorage.getItem('authToken')
}

/** 인증 실패 시 정상 비즈니스 에러 코드 (로그아웃 대상 아님) */
const BUSINESS_DENY_CODES = new Set([
  'QUOTA_EXCEEDED',
  'PLAN_UPGRADE_REQUIRED',
  'BROADCAST_ACCESS_DENIED',
  'SEQUENCE_ACCESS_DENIED',
  'FORBIDDEN_RESOURCE',
])

export function setToken(token) {
  if (token) localStorage.setItem('authToken', token)
  else localStorage.removeItem('authToken')
}

export function getStoredUser() {
  const raw = localStorage.getItem('authUser')
  return raw ? JSON.parse(raw) : null
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('authUser', JSON.stringify(user))
  else localStorage.removeItem('authUser')
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    // S58 fix: 네트워크 실패 (백엔드 다운 등) → 배너 표시 이벤트
    window.dispatchEvent(new CustomEvent('api:offline', { detail: { path, message: e.message } }))
    const err = new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    err.status = 0
    err.code = 'NETWORK_ERROR'
    throw err
  }
  // 성공 응답 수신 시 online 복구 이벤트
  window.dispatchEvent(new CustomEvent('api:online'))

  if (!res.ok) {
    let errorMessage = `요청 실패 (${res.status})`
    let errorCode = null
    try {
      const errorBody = await res.json()
      errorMessage = errorBody.message || errorBody.error || errorMessage
      errorCode = errorBody.code || null
    } catch {}

    // 401 또는 (토큰 있는데 403이고 비즈니스 거절 코드 아님) 시 자동 로그아웃 (S52 fix)
    const isAuthFailure =
      res.status === 401 ||
      (res.status === 403 && token && !BUSINESS_DENY_CODES.has(errorCode))
    if (isAuthFailure) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      if (window.location.pathname !== '/login') {
        // 원래 위치로 돌아갈 수 있게 redirect 파라미터 부착
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?redirect=${redirect}`
      }
    }

    const err = new Error(errorMessage)
    err.status = res.status
    err.code = errorCode
    throw err
  }

  if (res.status === 204) return null
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

/** 파일 업로드 (multipart/form-data) */
export async function uploadFile(file) {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/files/upload`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  if (!res.ok) {
    // 서버가 {error}, {message} 어떤 키로 실패 이유를 내려도 같이 보여줌 — 디버깅 용.
    const err = await res.json().catch(() => ({}))
    const reason = err.error || err.message || `HTTP ${res.status}`
    throw new Error(`파일 업로드에 실패했습니다. (${reason})`)
  }
  return res.json()
}
