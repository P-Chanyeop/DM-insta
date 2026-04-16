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
    responseMessage: '',
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
  const commentTriggers = automations.filter((a) => a.type === 'COMMENT_TRIGGER')
  const storyTriggers = automations.filter((a) => a.type === 'STORY_MENTION' || a.type === 'STORY_REPLY')
  const welcomeMessages = automations.filter((a) => a.type === 'WELCOME_MESSAGE')

  const isKeywordRequired = form.type === 'DM_KEYWORD' || form.type === 'COMMENT_TRIGGER'

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name) {
      toast.warning('이름을 입력해주세요.')
      return
    }
    if (isKeywordRequired && !form.keyword) {
      toast.warning('키워드를 입력해주세요.')
      return
    }
    try {
      await automationService.create({
        ...form,
        flowId: form.flowId ? Number(form.flowId) : null,
      })
      setForm({ name: '', type: 'DM_KEYWORD', keyword: '', matchType: 'CONTAINS', responseMessage: '', flowId: '' })
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
              <option value="COMMENT_TRIGGER">댓글 트리거</option>
              <option value="STORY_MENTION">스토리 멘션</option>
              <option value="STORY_REPLY">스토리 답장</option>
              <option value="WELCOME_MESSAGE">환영 메시지</option>
            </select>
            {isKeywordRequired && (
              <>
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
              </>
            )}
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
          <div className="form-row" style={{ marginTop: 8 }}>
            <textarea
              placeholder="자동 응답 메시지 (트리거 발동 시 보낼 DM 내용)"
              value={form.responseMessage}
              onChange={(e) => setForm({ ...form, responseMessage: e.target.value })}
              rows={2}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
            />
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
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    {t.responseMessage && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.responseMessage}>
                        💬 {t.responseMessage}
                      </div>
                    )}
                  </td>
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
                    {c.keyword
                      ? <span className="keyword-tag">{c.keyword}</span>
                      : <span style={{ fontSize: 12, color: '#94a3b8' }}>모든 댓글</span>}
                  </div>
                </div>
                {c.responseMessage && (
                  <div className="ct-setting-row">
                    <label>응답 메시지</label>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{c.responseMessage}</div>
                  </div>
                )}
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
                {s.responseMessage && (
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>💬 {s.responseMessage}</p>
                )}
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

      {/* Welcome Message */}
      <div className="trigger-section">
        <div className="trigger-section-header">
          <div className="trigger-section-icon green"><i className="ri-hand-heart-line" /></div>
          <div><h3>환영 메시지</h3><p>새로운 팔로워에게 첫 DM을 자동으로 보냅니다 (사용자당 1개)</p></div>
        </div>
        <div className="story-triggers">
          {!loading && welcomeMessages.length === 0 && (
            <EmptyState compact icon="ri-hand-heart-line" title="환영 메시지가 설정되지 않았습니다" description="신규 팔로워에게 첫인상을 남길 환영 DM을 만들어 보세요" />
          )}
          {welcomeMessages.map((w) => (
            <div className="story-trigger-item" key={w.id}>
              <div className="st-icon mention" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <i className="ri-hand-heart-line" />
              </div>
              <div className="st-info">
                <strong>{w.name}</strong>
                {w.responseMessage && (
                  <p style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.5 }}>💬 {w.responseMessage}</p>
                )}
              </div>
              <div className="st-stats">{formatNumber(w.triggeredCount)} 발송</div>
              <div
                className={`flow-card-toggle${w.active ? ' active' : ''}`}
                onClick={() => handleToggle(w.id)}
              />
              <button className="icon-btn" onClick={() => handleDelete(w.id)} style={{ marginLeft: 8 }}>
                <i className="ri-delete-bin-line" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
