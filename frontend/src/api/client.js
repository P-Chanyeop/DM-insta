const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

function getToken() {
  return localStorage.getItem('authToken')
}

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
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let errorMessage = `요청 실패 (${res.status})`
    let errorCode = null
    try {
      const errorBody = await res.json()
      errorMessage = errorBody.message || errorBody.error || errorMessage
      errorCode = errorBody.code || null
    } catch {}

    // 401 인증 만료 시 자동 로그아웃
    if (res.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
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
