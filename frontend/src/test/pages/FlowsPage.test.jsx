import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FlowsPage from '../../pages/FlowsPage'

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

function renderFlowsPage() {
  return render(
    <MemoryRouter>
      <FlowsPage />
    </MemoryRouter>
  )
}

describe('FlowsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('renders with loading state initially', () => {
    // Make fetch hang (never resolve) so we stay in loading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    renderFlowsPage()

    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })

  it('displays flows after API call resolves', async () => {
    const mockFlows = [
      {
        id: 1,
        name: '환영 인사 플로우',
        triggerType: 'WELCOME',
        active: true,
        sentCount: 150,
        openRate: 65.5,
        updatedAt: '2026-04-10T10:00:00Z',
      },
      {
        id: 2,
        name: '키워드 응답 플로우',
        triggerType: 'KEYWORD',
        active: false,
        sentCount: 42,
        openRate: 30,
        updatedAt: '2026-04-09T08:00:00Z',
      },
    ]
    mockFetch.mockReturnValueOnce(jsonResponse(mockFlows))

    renderFlowsPage()

    // Wait for loading to finish and flows to appear
    await waitFor(() => {
      expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('환영 인사 플로우')).toBeInTheDocument()
    expect(screen.getByText('키워드 응답 플로우')).toBeInTheDocument()
  })

  it('shows empty state when no flows returned', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([]))

    renderFlowsPage()

    await waitFor(() => {
      expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument()
    })

    // The "add new" card and header button should be present
    expect(screen.getAllByText(/새 자동화 만들기/).length).toBeGreaterThanOrEqual(1)
    // Tab counts should show 0
    expect(screen.getByText('전체 (0)')).toBeInTheDocument()
  })

  it('shows tab counts matching flow data', async () => {
    const mockFlows = [
      { id: 1, name: 'Active Flow', active: true, triggerType: 'KEYWORD' },
      { id: 2, name: 'Inactive Flow', active: false, triggerType: 'COMMENT' },
      { id: 3, name: 'Draft Flow', active: false, status: 'DRAFT', triggerType: 'WELCOME' },
    ]
    mockFetch.mockReturnValueOnce(jsonResponse(mockFlows))

    renderFlowsPage()

    await waitFor(() => {
      expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('전체 (3)')).toBeInTheDocument()
    expect(screen.getByText('활성 (1)')).toBeInTheDocument()
    expect(screen.getByText('비활성 (2)')).toBeInTheDocument()
    expect(screen.getByText('임시저장 (1)')).toBeInTheDocument()
  })
})
