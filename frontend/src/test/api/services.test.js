import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock global fetch before importing modules that use it
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

// Now import services (they use fetch via client.js)
const { authService, flowService } = await import('../../api/services.js')

function jsonResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  })
}

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('signup sends correct payload and stores token', async () => {
    const mockResponse = {
      token: 'test-token-123',
      email: 'user@test.com',
      name: 'Test User',
      plan: 'FREE',
      emailVerified: false,
    }
    mockFetch.mockReturnValueOnce(jsonResponse(mockResponse))

    const result = await authService.signup({
      email: 'user@test.com',
      password: 'password123',
      name: 'Test User',
    })

    // Verify fetch was called with correct URL and body
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/auth/signup')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body).toEqual({
      email: 'user@test.com',
      password: 'password123',
      name: 'Test User',
    })

    // Verify token was stored
    expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'test-token-123')
    expect(result.token).toBe('test-token-123')
  })

  it('login sends correct payload and stores token', async () => {
    const mockResponse = {
      token: 'login-token-456',
      email: 'user@test.com',
      name: 'Test User',
      plan: 'PRO',
      emailVerified: true,
    }
    mockFetch.mockReturnValueOnce(jsonResponse(mockResponse))

    const result = await authService.login({
      email: 'user@test.com',
      password: 'password123',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/auth/login')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body).toEqual({
      email: 'user@test.com',
      password: 'password123',
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'login-token-456')
    expect(result.emailVerified).toBe(true)
  })
})

describe('flowService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('list calls GET /flows', async () => {
    const mockFlows = [
      { id: 1, name: 'Flow 1', active: true },
      { id: 2, name: 'Flow 2', active: false },
    ]
    mockFetch.mockReturnValueOnce(jsonResponse(mockFlows))

    const result = await flowService.list()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/flows')
    expect(options.method).toBe('GET')
    expect(result).toEqual(mockFlows)
  })

  it('create sends correct data via POST', async () => {
    const newFlow = {
      name: 'New Flow',
      triggerType: 'KEYWORD',
      flowData: '{}',
    }
    const mockResponse = { id: 3, ...newFlow }
    mockFetch.mockReturnValueOnce(jsonResponse(mockResponse))

    const result = await flowService.create(newFlow)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/flows')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body).toEqual(newFlow)
    expect(result.id).toBe(3)
  })

  it('toggle calls PATCH /flows/:id/toggle', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ id: 5, active: true }))

    await flowService.toggle(5)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/flows/5/toggle')
    expect(options.method).toBe('PATCH')
  })
})
