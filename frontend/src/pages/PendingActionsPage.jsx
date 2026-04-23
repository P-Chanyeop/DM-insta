import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { SkeletonRow } from '../components/PageLoader'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { pendingActionService } from '../api/services'

function formatDate(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return value
  }
}

const STEP_LABEL = {
  AWAITING_POSTBACK: '버튼 클릭 대기',
  AWAITING_FOLLOW: '팔로우 대기',
  AWAITING_EMAIL: '이메일 대기',
  AWAITING_DELAY: '딜레이 재개 대기',
  COMPLETED: '완료',
}

export default function PendingActionsPage() {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const list = await pendingActionService.list()
      setItems(list || [])
    } catch (err) {
      setError(err.message || '대기 액션을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCleanupAll = async () => {
    const ok = await confirmDialog({
      title: '모든 대기 액션 정리',
      message: '활성 대기 액션을 모두 폐기합니다. 플로우가 더 이상 재개되지 않습니다. 계속하시겠어요?',
      confirmText: '모두 정리',
      variant: 'danger',
    })
    if (!ok) return
    try {
      const res = await pendingActionService.cleanupAll()
      toast.success(`${res?.cleanedCount ?? 0}개 정리했습니다`)
      await load()
    } catch (err) {
      toast.error(err.message || '정리 실패')
    }
  }

  const handleCompleteOne = async (id) => {
    const ok = await confirmDialog({
      title: '대기 액션 폐기',
      message: `#${id} 대기를 폐기합니다. 이 발신자는 새 키워드 DM 부터 다시 플로우가 시작됩니다.`,
      confirmText: '폐기',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await pendingActionService.complete(id)
      toast.success('폐기 완료')
      await load()
    } catch (err) {
      toast.error(err.message || '실패')
    }
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1>대기중 플로우 액션</h1>
          <p className="page-desc">
            사용자가 버튼을 누르거나, 팔로우/이메일을 입력할 때까지 대기중인 플로우 상태입니다.
            이 레코드가 남아있으면 동일 발신자의 새 DM 키워드가 스킵될 수 있으므로,
            문제가 있을 때 수동으로 폐기하세요.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>새로고침</button>
          <button className="btn btn-danger" onClick={handleCleanupAll} disabled={loading || items.length === 0}>
            모두 정리
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
      ) : items.length === 0 ? (
        <EmptyState
          title="대기중인 액션이 없습니다"
          description="모든 플로우가 깔끔한 상태입니다."
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>발신자 IG ID</th>
                <th>단계</th>
                <th>플로우</th>
                <th>트리거</th>
                <th>IG 계정</th>
                <th>생성</th>
                <th>만료</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{p.senderIgId}</td>
                  <td>
                    <span className="badge">{STEP_LABEL[p.pendingStep] || p.pendingStep}</span>
                  </td>
                  <td>{p.flowName || '-'}</td>
                  <td>{p.triggerKeyword || '-'}</td>
                  <td>{p.igAccountUsername || '-'}</td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td style={{ color: p.expired ? 'var(--danger, #d33)' : undefined }}>
                    {formatDate(p.expiresAt)}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleCompleteOne(p.id)}>
                      폐기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
