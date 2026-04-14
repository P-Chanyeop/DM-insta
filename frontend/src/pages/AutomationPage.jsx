import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkeletonRow } from '../components/PageLoader'
import { useToast } from '../components/Toast'
import { usePlan } from '../components/PlanContext'
import UpgradeModal, { QuotaBar } from '../components/UpgradeModal'
import { useConfirm } from '../components/ConfirmDialog'
import { automationService, flowService } from '../api/services'

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value || 0)
}

export default function AutomationPage() {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const { getLimit, isAtLimit } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [automations, setAutomations] = useState([])
  const [flows, setFlows] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'DM_KEYWORD',
    keyword: '',
    matchType: 'CONTAINS',
    flowId: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [autoList, flowList] = await Promise.all([
        automationService.list(),
        flowService.list(),
      ])
      setAutomations(autoList || [])
      setFlows(flowList || [])
    } catch (err) {
      setError(err.message || '자동화를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const dmKeywordTriggers = automations.filter((a) => a.type === 'DM_KEYWORD')
  const commentTriggers = automations.filter((a) => a.type === 'COMMENT')
  const storyTriggers = automations.filter((a) => a.type === 'STORY_MENTION' || a.type === 'STORY_REPLY')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.keyword) {
      toast.warning('이름과 키워드를 입력해주세요.')
      return
    }
    try {
      await automationService.create({
        ...form,
        flowId: form.flowId ? Number(form.flowId) : null,
      })
      setForm({ name: '', type: 'DM_KEYWORD', keyword: '', matchType: 'CONTAINS', flowId: '' })
      setShowForm(false)
      toast.success('트리거가 생성되었습니다.')
      await loadData()
    } catch (err) {
      toast.error(err.message || '생성에 실패했습니다.')
    }
  }

  const handleToggle = async (id) => {
    try {
      await automationService.toggle(id)
      await loadData()
    } catch (err) {
      toast.error(err.message || '상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmDialog({
      title: '자동화 삭제',
      message: '이 자동화 트리거를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
      icon: 'ri-delete-bin-line',
    })
    if (!ok) return
    try {
      await automationService.delete(id)
      toast.success('트리거가 삭제되었습니다.')
      await loadData()
    } catch (err) {
      toast.error(err.message || '삭제에 실패했습니다.')
    }
  }

  const flowNameOf = (flowId) => {
    const f = flows.find((x) => x.id === flowId)
    return f ? f.name : '연결 없음'
  }

  return (
    <>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="트리거 개수 한도 초과"
        description={`무료 플랜에서는 최대 ${getLimit('automations')}개의 트리거를 생성할 수 있습니다. 무제한 트리거를 사용하려면 업그레이드하세요.`}
      />
      <div className="page-header">
        <div>
          <h2>자동화 트리거</h2>
          <p>다양한 이벤트에 자동으로 반응하는 트리거를 설정하세요</p>
        </div>
        <button className="btn-primary" onClick={() => {
          if (isAtLimit('automations')) { setUpgradeOpen(true); return }
          setShowForm((v) => !v)
        }}>
          <i className="ri-add-line" /> {showForm ? '닫기' : '새 트리거 추가'}
        </button>
      </div>

      {getLimit('automations') !== Infinity && (
        <QuotaBar current={automations.length} max={getLimit('automations')} label="트리거" loading={loading} />
      )}

      {error && (
        <div className="alert-banner error">
          <i className="ri-error-warning-line" /> {error}
        </div>
      )}

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          <div className="form-row">
            <input
              type="text"
              placeholder="트리거 이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="DM_KEYWORD">DM 키워드</option>
              <option value="COMMENT">댓글 트리거</option>
              <option value="STORY_MENTION">스토리 멘션</option>
              <option value="STORY_REPLY">스토리 답장</option>
            </select>
            <input
              type="text"
              placeholder="키워드 (예: 가격)"
              value={form.keyword}
              onChange={(e) => setForm({ ...form, keyword: e.target.value })}
            />
            <select
              value={form.matchType}
              onChange={(e) => setForm({ ...form, matchType: e.target.value })}
            >
              <option value="CONTAINS">포함</option>
              <option value="EXACT">정확</option>
              <option value="STARTS_WITH">시작</option>
            </select>
            <select
              value={form.flowId}
              onChange={(e) => setForm({ ...form, flowId: e.target.value })}
            >
              <option value="">플로우 선택 (선택 사항)</option>
              {flows.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary">저장</button>
          </div>
        </form>
      )}

      {/* DM Keyword Triggers */}
      <div className="trigger-section">
        <div className="trigger-section-header">
          <div className="trigger-section-icon blue"><i className="ri-message-3-line" /></div>
          <div><h3>DM 키워드 트리거</h3><p>고객이 DM으로 특정 키워드를 보내면 자동으로 플로우 실행</p></div>
        </div>
        <div className="trigger-table">
          <table>
            <thead>
              <tr>
                <th>이름</th><th>키워드</th><th>일치 유형</th><th>연결 플로우</th><th>발동 횟수</th><th>상태</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading && <><SkeletonRow cols={7} /><SkeletonRow cols={7} /></>}
              {!loading && dmKeywordTriggers.length === 0 && (
                <tr><td colSpan={7} className="empty-state">등록된 DM 키워드 트리거가 없습니다.</td></tr>
              )}
              {dmKeywordTriggers.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td><span className="keyword-tag">{t.keyword}</span></td>
                  <td><span className="match-type">{t.matchType || '-'}</span></td>
                  <td><span className="flow-link">{flowNameOf(t.flowId)}</span></td>
                  <td>{formatNumber(t.triggeredCount)}</td>
                  <td>
                    <span
                      className={`status-badge ${t.active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggle(t.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {t.active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => handleDelete(t.id)}>
                      <i className="ri-delete-bin-line" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comment Triggers */}
      <div className="trigger-section">
        <div className="trigger-section-header">
          <div className="trigger-section-icon orange"><i className="ri-chat-smile-3-line" /></div>
          <div><h3>댓글 자동 응답</h3><p>게시물에 특정 키워드 댓글 시 자동으로 DM 발송</p></div>
        </div>
        <div className="comment-trigger-cards">
          {!loading && commentTriggers.length === 0 && (
            <EmptyState compact icon="ri-chat-smile-3-line" title="등록된 댓글 트리거가 없습니다" description="댓글 키워드 감지 자동화를 추가해 보세요" />
          )}
          {commentTriggers.map((c) => (
            <div className="comment-trigger-card" key={c.id}>
              <div className="ct-post-preview">
                <div className="ct-post-img"><i className="ri-image-line" /></div>
                <div className="ct-post-info">
                  <strong>{c.name}</strong>
                  <span>Post ID: {c.postId || '전체 게시물'}</span>
                </div>
              </div>
              <div className="ct-settings">
                <div className="ct-setting-row">
                  <label>감지 키워드</label>
                  <div className="ct-keywords">
                    <span className="keyword-tag">{c.keyword}</span>
                  </div>
                </div>
                <div className="ct-setting-row">
                  <label>연결 플로우</label>
                  <div>{flowNameOf(c.flowId)}</div>
                </div>
              </div>
              <div className="ct-stats">
                <span>발동: {formatNumber(c.triggeredCount)}</span>
                <span
                  className={`status-badge ${c.active ? 'active' : 'inactive'}`}
                  onClick={() => handleToggle(c.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {c.active ? '활성' : '비활성'}
                </span>
                <button className="icon-btn" onClick={() => handleDelete(c.id)}>
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Story Triggers */}
      <div className="trigger-section">
        <div className="trigger-section-header">
          <div className="trigger-section-icon purple"><i className="ri-camera-lens-line" /></div>
          <div><h3>스토리 자동화</h3><p>스토리 멘션 및 스토리 답장에 자동으로 반응</p></div>
        </div>
        <div className="story-triggers">
          {!loading && storyTriggers.length === 0 && (
            <EmptyState compact icon="ri-camera-lens-line" title="등록된 스토리 트리거가 없습니다" description="스토리 멘션/답장 자동화를 추가해 보세요" />
          )}
          {storyTriggers.map((s) => (
            <div className="story-trigger-item" key={s.id}>
              <div className={`st-icon ${s.type === 'STORY_MENTION' ? 'mention' : 'reply'}`}>
                <i className={s.type === 'STORY_MENTION' ? 'ri-at-line' : 'ri-reply-line'} />
              </div>
              <div className="st-info">
                <strong>{s.name}</strong>
                <p>{s.type === 'STORY_MENTION' ? '스토리 멘션 감지' : '스토리 답장 감지'}</p>
              </div>
              <div className="st-flow">→ {flowNameOf(s.flowId)}</div>
              <div className="st-stats">{formatNumber(s.triggeredCount)} 발송</div>
              <div
                className={`flow-card-toggle${s.active ? ' active' : ''}`}
                onClick={() => handleToggle(s.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
