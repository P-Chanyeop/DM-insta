import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageLoader, { SkeletonCard } from '../components/PageLoader'
import { useToast } from '../components/Toast'
import { usePlan } from '../components/PlanContext'
import UpgradeModal, { QuotaBar } from '../components/UpgradeModal'
import { useConfirm } from '../components/ConfirmDialog'
import { flowService } from '../api/services'
import { refreshNavCount } from '../layouts/DashboardLayout'

// Canonical enum values match backend Flow.TriggerType
const TRIGGER_META = {
  KEYWORD:       { label: 'DM 키워드',   icon: 'ri-message-3-line',    color: 'blue' },
  COMMENT:       { label: '댓글 트리거', icon: 'ri-chat-smile-3-line', color: 'orange' },
  STORY_MENTION: { label: '스토리 멘션', icon: 'ri-camera-lens-line',  color: 'purple' },
  STORY_REPLY:   { label: '스토리 답장', icon: 'ri-reply-line',        color: 'purple' },
  WELCOME:       { label: '환영 메시지', icon: 'ri-hand-heart-line',   color: 'green' },
  ICEBREAKER:    { label: '아이스브레이커', icon: 'ri-ice-cream-line', color: 'pink' },
}

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
  // '우선순위' 정렬일 때만 드래그 리오더가 활성화됨 — shadowing 수동 해결 경로.
  const [sortBy, setSortBy] = useState('최근 수정')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flows, setFlows] = useState([])
  // flowId → Conflict[]. 목록 페이지 배지 + toggle 가드에 사용.
  const [conflictsByFlowId, setConflictsByFlowId] = useState({})
  // 배지 클릭 시 팝오버로 충돌 상세 표시
  const [openConflictId, setOpenConflictId] = useState(null)
  // 드래그 상태
  const [dragId, setDragId] = useState(null)

  const loadFlows = async () => {
    try {
      setLoading(true)
      const [data, conflicts] = await Promise.all([
        flowService.list(),
        flowService.allConflicts().catch(() => []),
      ])
      setFlows(data || [])
      const byId = {}
      for (const r of (conflicts || [])) byId[r.flowId] = r.conflicts || []
      setConflictsByFlowId(byId)
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
      if (triggerFilter !== '전체') {
        const triggerKey = LABEL_TO_TRIGGER[triggerFilter]
        if (triggerKey && f.triggerType !== triggerKey) return false
      }
      return true
    })

    if (sortBy === '이름순') {
      result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))
    } else if (sortBy === '발송 수') {
      result = [...result].sort((a, b) => (b.sentCount ?? 0) - (a.sentCount ?? 0))
    } else if (sortBy === '우선순위') {
      // 우선순위 ASC 내에서 createdAt ASC tiebreaker — 백엔드 webhook 순서와 일치.
      // triggerType 별로 그룹핑된 상태로 보여 shadowing 관계를 눈으로 확인하기 쉽게 함.
      result = [...result].sort((a, b) => {
        const tt = (a.triggerType || '').localeCompare(b.triggerType || '')
        if (tt !== 0) return tt
        const pa = a.priority ?? 0
        const pb = b.priority ?? 0
        if (pa !== pb) return pa - pb
        return (a.createdAt || '').localeCompare(b.createdAt || '')
      })
    } else {
      result = [...result].sort((a, b) => {
        const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return db - da
      })
    }

    return result
  }, [flows, activeTab, search, triggerFilter, sortBy])

  // 드래그 리오더는 어떤 정렬 모드에서도 허용.
  // 단, 정렬이 '우선순위' 가 아니면 리오더 직후 '우선순위' 로 자동 전환해
  // 사용자가 바꾼 순서가 즉시 눈에 보이게 함 (시간/이름 정렬은 priority 를 무시하므로).
  const canDragReorder = true

  const handleCreate = () => {
    if (isAtLimit('flows')) {
      setUpgradeOpen(true)
      return
    }
    navigate('/app/flows/builder')
  }

  const handleToggle = async (flow) => {
    // 비활성 → 활성 전환 시에만 충돌 프리플라이트
    if (!flow.active) {
      try {
        const conflicts = await flowService.conflicts(flow.id)
        const hard = (conflicts || []).filter((c) => c.severity === 'HARD_BLOCK')
        const warns = (conflicts || []).filter((c) => c.severity === 'WARN')

        if (hard.length > 0) {
          await confirmDialog({
            title: '활성화할 수 없습니다',
            message: hard.map((c) => c.reason).join('\n'),
            confirmText: '확인',
            cancelText: null,
            variant: 'danger',
            icon: 'ri-forbid-line',
          })
          return
        }

        if (warns.length > 0) {
          const proceed = await confirmDialog({
            title: '충돌 가능한 플로우가 있습니다',
            message: warns.map((c) => c.reason).join('\n')
              + '\n\n계속 활성화하시겠습니까?',
            confirmText: '계속 활성화',
            cancelText: '취소',
            variant: 'warning',
            icon: 'ri-alert-line',
          })
          if (!proceed) return
        }
      } catch {
        // conflicts API 가 실패해도 toggle 은 진행 (후행 가드는 백엔드가 담당)
      }
    }

    try {
      await flowService.toggle(flow.id)
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
      refreshNavCount('flows', -1)
      await loadFlows()
    } catch (err) {
      toast.error(err.message || '삭제에 실패했습니다.')
    }
  }

  const handleClone = async (flow) => {
    if (isAtLimit('flows')) {
      setUpgradeOpen(true)
      return
    }
    try {
      await flowService.create({
        name: `복사 - ${flow.name}`,
        triggerType: flow.triggerType || 'KEYWORD',
        flowData: flow.flowData || '{}',
      })
      toast.success('플로우가 복제되었습니다.')
      refreshNavCount('flows', +1)
      await loadFlows()
    } catch (err) {
      toast.error(err.message || '플로우 복제에 실패했습니다.')
    }
  }

  // ─── 드래그 리오더 핸들러 ───
  const handleDragStart = (e, id) => {
    if (!canDragReorder) return
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    if (!canDragReorder) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetId) => {
    if (!canDragReorder) return
    e.preventDefault()
    if (dragId == null || dragId === targetId) { setDragId(null); return }

    const dragFlow = flows.find(f => f.id === dragId)
    const targetFlow = flows.find(f => f.id === targetId)
    if (!dragFlow || !targetFlow) { setDragId(null); return }
    // 같은 triggerType 안에서만 재정렬 — shadowing 은 같은 타입 내 문제이므로
    if (dragFlow.triggerType !== targetFlow.triggerType) {
      toast.error('다른 트리거 유형끼리는 순서를 바꿀 수 없습니다.')
      setDragId(null)
      return
    }

    // 같은 타입 Flow 만 모아 순서 조정
    const sameType = flows
      .filter(f => f.triggerType === dragFlow.triggerType)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)
        || (a.createdAt || '').localeCompare(b.createdAt || ''))

    const fromIdx = sameType.findIndex(f => f.id === dragId)
    const toIdx = sameType.findIndex(f => f.id === targetId)
    if (fromIdx < 0 || toIdx < 0) { setDragId(null); return }

    const next = [...sameType]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)

    // 낙관적 업데이트 — UI 에 즉시 반영
    setFlows(prev => prev.map(f => {
      const idx = next.findIndex(n => n.id === f.id)
      return idx >= 0 ? { ...f, priority: idx } : f
    }))
    setDragId(null)
    // 시간/이름 정렬 중이면 바뀐 순서가 안 보이므로 '우선순위' 로 전환
    if (sortBy !== '우선순위') setSortBy('우선순위')

    try {
      await flowService.reorder(next.map(f => f.id))
      // 충돌 재계산 (우선순위 변동으로 shadowing 관계가 바뀔 수 있음)
      const conflicts = await flowService.allConflicts().catch(() => [])
      const byId = {}
      for (const r of (conflicts || [])) byId[r.flowId] = r.conflicts || []
      setConflictsByFlowId(byId)
    } catch (err) {
      toast.error(err.message || '순서 저장에 실패했습니다.')
      await loadFlows() // 실패 시 서버 상태로 되돌림
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
          <p><b>"어떤 메시지를 보낼지"</b>를 만드는 곳이에요. 블록을 연결해서 자동 응답 시나리오를 만들고, 트리거에 연결하면 끝!</p>
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
          <option value="우선순위">우선순위 (드래그로 변경)</option>
        </select>
      </div>

      {canDragReorder && (
        <div className="alert-banner" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
          <i className="ri-drag-move-line" />
          같은 트리거 유형 안에서 카드를 드래그해 실행 우선순위를 조정할 수 있습니다. 위쪽이 먼저 매칭됩니다.
        </div>
      )}

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
          const conflicts = conflictsByFlowId[f.id] || []
          const hasHard = conflicts.some(c => c.severity === 'HARD_BLOCK')
          const hasWarn = conflicts.some(c => c.severity === 'WARN')
          const badgeType = hasHard ? 'hard' : hasWarn ? 'warn' : null
          return (
            <div
              className="flow-card"
              key={f.id}
              draggable={canDragReorder}
              onDragStart={(e) => handleDragStart(e, f.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, f.id)}
              style={{
                ...(canDragReorder ? { cursor: 'grab' } : {}),
                ...(dragId === f.id ? { opacity: 0.5 } : {}),
                ...(badgeType ? { borderTop: `3px solid ${badgeType === 'hard' ? '#EF4444' : '#F59E0B'}` } : {}),
              }}
            >
              <div className="flow-card-header">
                <div className={`flow-card-icon ${meta.color}`}><i className={meta.icon} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {badgeType && (
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenConflictId(openConflictId === f.id ? null : f.id) }}
                        title={badgeType === 'hard' ? '활성화 차단' : '충돌 가능'}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 2,
                          color: badgeType === 'hard' ? '#EF4444' : '#F59E0B',
                          fontSize: '1.25rem',
                          lineHeight: 1,
                        }}
                      >
                        <i className="ri-alert-fill" />
                      </button>
                      {openConflictId === f.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 6,
                            zIndex: 20,
                            background: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: 8,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            padding: '12px 14px',
                            width: 280,
                            fontSize: '0.82rem',
                            color: '#374151',
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 6, color: badgeType === 'hard' ? '#B91C1C' : '#B45309' }}>
                            {badgeType === 'hard' ? '활성화 차단' : '충돌 가능성'}
                          </div>
                          {conflicts.map((c, i) => (
                            <div key={i} style={{ marginBottom: i === conflicts.length - 1 ? 0 : 8 }}>
                              {c.reason}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setOpenConflictId(null)}
                            style={{
                              marginTop: 10,
                              background: '#F3F4F6',
                              border: 'none',
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                            }}
                          >
                            닫기
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`flow-card-toggle${f.active ? ' active' : ''}`}
                    onClick={() => handleToggle(f)}
                  />
                </div>
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
                  <button
                    className="icon-btn"
                    title={isAtLimit('flows') ? '플로우 한도 초과 — 업그레이드 필요' : '복제'}
                    onClick={() => handleClone(f)}
                    style={isAtLimit('flows') ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                  >
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

        <div className="flow-card add-new" onClick={handleCreate} title={isAtLimit('flows') ? '플로우 한도 초과 — 업그레이드 필요' : '새 자동화 만들기'}>
          <div className="add-new-content">
            <div className="add-new-icon"><i className="ri-add-line" /></div>
            <h4>새 자동화 만들기</h4>
            <p>{isAtLimit('flows') ? '한도 초과 — 업그레이드하거나 기존 플로우를 삭제하세요' : '빈 플로우 또는 템플릿에서 시작'}</p>
          </div>
        </div>
      </div>
    </>
  )
}
