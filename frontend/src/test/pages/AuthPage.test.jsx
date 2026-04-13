import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AuthPage from '../../pages/AuthPage'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value) }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function jsonResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  })
}

function renderAtPath(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthPage />
    </MemoryRouter>
  )
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('renders login form by default', () => {
    renderAtPath('/login')

    expect(screen.getByText('다시 오신 것을 환영합니다')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('비밀번호')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument()
  })

  it('renders signup form at /signup path', () => {
    renderAtPath('/signup')

    expect(screen.getByText('무료 계정 만들기')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('홍길동')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /무료로 시작하기/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields on login', async () => {
    const user = userEvent.setup()
    renderAtPath('/login')

    const submitBtn = screen.getByRole('button', { name: /로그인/i })
    await user.click(submitBtn)

    // Should show email and password validation errors
    expect(screen.getByText('이메일을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('비밀번호를 입력해주세요')).toBeInTheDocument()
    // fetch should NOT have been called
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows validation errors for empty fields on signup', async () => {
    const user = userEvent.setup()
    renderAtPath('/signup')

    const submitBtn = screen.getByRole('button', { name: /무료로 시작하기/i })
    await user.click(submitBtn)

    expect(screen.getByText('이름을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('이메일을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('비밀번호를 입력해주세요')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows password validation error for short password', async () => {
    const user = userEvent.setup()
    renderAtPath('/login')

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('비밀번호'), '123')
    await user.click(screen.getByRole('button', { name: /로그인/i }))

    expect(screen.getByText('비밀번호는 6자 이상이어야 합니다')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows email verification screen after successful signup', async () => {
    const user = userEvent.setup()
    mockFetch.mockReturnValueOnce(jsonResponse({
      token: 'new-token',
      email: 'test@example.com',
      name: 'Test',
      plan: 'FREE',
      emailVerified: false,
    }))

    renderAtPath('/signup')

    await user.type(screen.getByPlaceholderText('홍길동'), 'Test')
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('6자 이상 입력해주세요'), 'password123')
    await user.click(screen.getByRole('button', { name: /무료로 시작하기/i }))

    // Wait for the verification screen to appear
    await waitFor(() => {
      expect(screen.getByText('이메일 인증')).toBeInTheDocument()
    })
    expect(screen.getByText(/인증 코드가 이메일로 발송되었습니다/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('6자리 숫자')).toBeInTheDocument()
  })
})
