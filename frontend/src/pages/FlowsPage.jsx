import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageLoader, { SkeletonCard } from '../components/PageLoader'
import { useToast } from '../components/Toast'
import { usePlan } from '../components/PlanContext'
import UpgradeModal, { QuotaBar } from '../components/UpgradeModal'
import { useConfirm } from '../components/ConfirmDialog'
import { flowService } from '../api/services'

// Canonical enum values match backend Flow.TriggerType
const TRIGGER_META = {
  KEYWORD:       { label: 'DM 키워드',   icon: 'ri-message-3-line',    color: 'blue' },
  COMMENT:       { label: '댓글 트리거', icon: 'ri-chat-smile-3-line', color: 'orange' },
  STORY_MENTION: { label: '스토리 멘션', icon: 'ri-camera-lens-line',  color: 'purple' },
  STORY_REPLY:   { label: '스토리 답장', icon: 'ri-reply-line',        color: 'purple' },
  WELCOME:       { label: '환영 메시지', icon: 'ri-hand-heart-line',   color: 'green' },
  ICEBREAKER:    { label: '아이스브레이커', icon: 'ri-ice-cream-line', color: 'pink' },
}

// Reverse lookup: label -> trigger key
const LABEL_TO_TRIGGER = {}
for (const [key, meta] of Object.entries(TRIGGER_META)) {
  LABEL_TO_TRIGGER[meta.label] = key
}

function metaFor(triggerType) {
  return TRIGGER_META[triggerType] || { label: triggerType || '수동', icon: 'ri-flow-chart', color: 'blue' }
}

function formatRelative(dateString) {
  if (!dateString) return '방금 전'
  const then = new Date(dateString)
  const diff = Date.now() - then.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전 수정`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전 수정`
  const day = Math.floor(hr / 24)
  return `${day}일 전 수정`
}

export default function FlowsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirmDialog = useConfirm()
  const { getLimit, isAtLimit } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('전체')
  const [search, setSearch] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('전체')
  const [sortBy, setSortBy] = useState('최근 수정')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flows, setFlows] = useState([])

  const loadFlows = async () => {
    try {
      setLoading(true)
      const data = await flowService.list()
      setFlows(data || [])
    } catch (err) {
      setError(err.message || '플로우를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFlows() }, [])

  const counts = useMemo(() => ({
    total: flows.length,
    active: flows.filter((f) => f.active).length,
    inactive: flows.filter((f) => !f.active).length,
    draft: flows.filter((f) => f.status === 'DRAFT').length,
  }), [flows])

  const tabs = [
    { key: '전체', label: `전체 (${counts.total})` },
    { key: '활성', label: `활성 (${counts.active})` },
    { key: '비활성', label: `비활성 (${counts.inactive})` },
    { key: '임시저장', label: `임시저장 (${counts.draft})` },
  ]

  const visibleFlows = useMemo(() => {
    let result = flows.filter((f) => {
      if (activeTab === '활성' && !f.active) return false
      if (activeTab === '비활성' && f.active) return false
      if (activeTab === '임시저장' && f.status !== 'DRAFT') return false
      if (search && !f.name?.toLowerCase().includes(search.toLowerCase())) return false
      // Trigger type filter
      if (triggerFilter !== '전체') {
        const triggerKey = LABEL_TO_TRIGGER[triggerFilter]
        if (triggerKey && f.triggerType !== triggerKey) return false
      }
      return true
    })

    // Sort
    if (sortBy === '이름순') {
      result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))
    } else if (sortBy === '발송 수') {
      result = [...result].sort((a, b) => (b.sentCount ?? 0) - (a.sentCount ?? 0))
    } else {
      // 최근 수정 (default)
      result = [...result].sort((a, b) => {
        const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return db - da
      })
    }

    return result
  }, [flows, activeTab, search, triggerFilter, sortBy])

  const handleCreate = () => {
    if (isAtLimit('flows')) {
      setUpgradeOpen(true)
      return
    }
    navigate('/app/flows/builder')
  }

  const handleToggle = async (id) => {
    try {
      await flowService.toggle(id)
      await loadFlows()
    } catch (err) {
      toast.error(err.message || '상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (id) => {
    const flow = flows.find(f => f.id === id)
    const ok = await confirmDialog({
      title: '플로우 삭제',
      message: `"${flow?.name || '플로우'}"를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
      icon: 'ri-delete-bin-line',
    })
    if (!ok) return
    try {
      await flowService.delete(id)
      toast.success('플로우가 삭제되었습니다.')
      await loadFlows()
    } catch (err) {
      toast.error(err.message || '삭제에 실패했습니다.')
    }
  }

  const handleClone = async (flow) => {
    try {
      await flowService.create({
        name: `복사 - ${flow.name}`,
        triggerType: flow.triggerType || 'KEYWORD',
        flowData: flow.flowData || '{}',
      })
      toast.success('플로우가 복제되었습니다.')
      await loadFlows()
    } catch (err) {
      toast.error(err.message || '플로우 복제에 실패했습니다.')
    }
  }

  return (
    <>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="플로우 개수 한도 초과"
        description={`무료 플랜에서는 최대 ${getLimit('flows')}개의 플로우를 생성할 수 있습니다. 무제한 플로우를 사용하려면 업그레이드하세요.`}
      />
      <div className="page-header">
        <div>
          <h2>자동화 플로우</h2>
          <p>드래그 앤 드롭으로 자동화 시나리오를 만들고 관리하세요</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <i className="ri-add-line" /> 새 자동화 만들기
        </button>
      </div>

      {getLimit('flows') !== Infinity && (
        <QuotaBar current={flows.length} max={getLimit('flows')} label="플로우" loading={loading} />
      )}

      {error && (
        <div className="alert-banner error">
          <i className="ri-error-warning-line" /> {error}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }} onClick={() => setError('')}>
            <i className="ri-close-line" />
          </button>
        </div>
      )}

      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-filter">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="플로우 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
        >
          <option value="전체">트리거 유형: 전체</option>
          <option value="DM 키워드">DM 키워드</option>
          <option value="댓글 트리거">댓글 트리거</option>
          <option value="스토리 멘션">스토리 멘션</option>
          <option value="스토리 답장">스토리 답장</option>
          <option value="환영 메시지">환영 메시지</option>
          <option value="아이스브레이커">아이스브레이커</option>
        </select>
        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="최근 수정">정렬: 최근 수정</option>
          <option value="이름순">이름순</option>
          <option value="발송 수">발송 수</option>
        </select>
      </div>

      <div className="flow-cards-grid">
        {loading && <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}

        {!loading && visibleFlows.length === 0 && flows.length > 0 && (
          <EmptyState
            icon="ri-search-line"
            title="조건에 맞는 플로우가 없습니다"
            description="필터를 변경하거나 새 자동화를 만들어 보세요"
          />
        )}

        {!loading && visibleFlows.map((f) => {
          const meta = metaFor(f.triggerType)
          return (
            <div className="flow-card" key={f.id}>
              <div className="flow-card-header">
                <div className={`flow-card-icon ${meta.color}`}><i className={meta.icon} /></div>
                <div
                  className={`flow-card-toggle${f.active ? ' active' : ''}`}
                  onClick={() => handleToggle(f.id)}
                />
              </div>
              <h4>{f.name}</h4>
              <p className="flow-card-desc">{meta.label} 기반 자동화 플로우</p>
              <div className="flow-card-trigger"><i className="ri-flashlight-line" /> {meta.label}</div>
              <div className="flow-card-stats">
                <span><i className="ri-message-3-line" /> {f.sentCount ?? 0} 발송</span>
                <span><i className="ri-cursor-line" /> {f.openRate != null ? `${Math.round(f.openRate)}%` : '--'} 열림률</span>
              </div>
              <div className="flow-card-footer">
                <span className="flow-date">{formatRelative(f.updatedAt)}</span>
                <div className="flow-card-actions">
                  <button
                    className="icon-btn"
                    title="수정"
                    onClick={() => navigate(`/app/flows/builder/${f.id}`)}
                  >
                    <i className="ri-edit-line" />
                  </button>
                  <button className="icon-btn" title="복제" onClick={() => handleClone(f)}>
                    <i className="ri-file-copy-line" />
                  </button>
                  <button className="icon-btn" title="삭제" onClick={() => handleDelete(f.id)}>
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        <div className="flow-card add-new" onClick={handleCreate}>
          <div className="add-new-content">
            <div className="add-new-icon"><i className="ri-add-line" /></div>
            <h4>새 자동화 만들기</h4>
            <p>빈 플로우 또는 템플릿에서 시작</p>
          </div>
        </div>
      </div>
    </>
  )
}
