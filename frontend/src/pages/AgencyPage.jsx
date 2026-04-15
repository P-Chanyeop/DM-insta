import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { accountService } from '../api/services'
import { useAccount } from '../components/AccountContext'
import { usePlan } from '../components/PlanContext'
import { useToast } from '../components/Toast'

export default function AgencyPage() {
  const navigate = useNavigate()
  const { accounts, activeAccount, switchAccount, refresh } = useAccount()
  const { plan, getLimit } = usePlan()
  const toast = useToast()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    setLoading(true)
    try {
      const data = await accountService.getOverview()
      setOverview(data)
    } catch {
      // 에러 시 로컬 accounts 데이터로 fallback
      setOverview({
        totalAccounts: accounts.length,
        connectedAccounts: accounts.filter(a => a.connected).length,
        maxAccounts: getLimit('igAccounts') || 3,
        totalFollowers: accounts.reduce((sum, a) => sum + (a.followersCount || 0), 0),
        totalContacts: 0,
        totalFlows: 0,
        accounts: accounts.map(a => ({
          ...a,
          stats: { followersCount: a.followersCount || 0, flowCount: 0, contactCount: 0, automationCount: 0 }
        })),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const data = await api.get('/instagram/oauth-url')
      if (data && data.url) {
        window.open(data.url, '_blank', 'width=600,height=700')
        setShowConnectModal(false)
      } else {
        toast.error('OAuth URL을 가져올 수 없습니다')
      }
    } catch {
      toast.error('Instagram 연결을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (id) => {
    if (!confirm('이 계정의 연결을 해제하시겠습니까?')) return
    try {
      await accountService.disconnect(id)
      toast.success('계정 연결이 해제되었습니다')
      refresh()
      loadOverview()
    } catch (err) {
      toast.error(err.message || '연결 해제에 실패했습니다')
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('이 계정을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    try {
      await accountService.remove(id)
      toast.success('계정이 삭제되었습니다')
      refresh()
      loadOverview()
    } catch (err) {
      toast.error(err.message || '계정 삭제에 실패했습니다')
    }
  }

  const handleSwitch = async (id) => {
    try {
      await switchAccount(id)
      toast.success('계정이 전환되었습니다')
    } catch (err) {
      toast.error(err.message || '계정 전환에 실패했습니다')
    }
  }

  const maxAccounts = getLimit('igAccounts') || overview?.maxAccounts || 3
  const accountList = overview?.accounts || accounts.map(a => ({
    ...a,
    stats: { followersCount: a.followersCount || 0, flowCount: 0, contactCount: 0, automationCount: 0 }
  }))

  return (
    <div className="agency-page">
      <div className="page-header-row">
        <div>
          <h1>에이전시 대시보드</h1>
          <p className="page-desc">멀티 계정을 관리하고 전환하세요</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowConnectModal(true)}
          disabled={accountList.length >= maxAccounts}
        >
          <i className="ri-add-line" /> 계정 추가
        </button>
      </div>

      {/* 통계 요약 */}
      <div className="agency-stats-grid">
        <div className="agency-stat-card">
          <div className="agency-stat-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <i className="ri-instagram-line" />
          </div>
          <div className="agency-stat-info">
            <span className="agency-stat-value">{overview?.totalAccounts || accountList.length}</span>
            <span className="agency-stat-label">연결된 계정</span>
          </div>
          <span className="agency-stat-limit">/ {maxAccounts}</span>
        </div>
        <div className="agency-stat-card">
          <div className="agency-stat-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
            <i className="ri-user-heart-line" />
          </div>
          <div className="agency-stat-info">
            <span className="agency-stat-value">{(overview?.totalFollowers || 0).toLocaleString()}</span>
            <span className="agency-stat-label">총 팔로워</span>
          </div>
        </div>
        <div className="agency-stat-card">
          <div className="agency-stat-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
            <i className="ri-flow-chart" />
          </div>
          <div className="agency-stat-info">
            <span className="agency-stat-value">{overview?.totalFlows || 0}</span>
            <span className="agency-stat-label">총 플로우</span>
          </div>
        </div>
        <div className="agency-stat-card">
          <div className="agency-stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <i className="ri-contacts-book-2-line" />
          </div>
          <div className="agency-stat-info">
            <span className="agency-stat-value">{(overview?.totalContacts || 0).toLocaleString()}</span>
            <span className="agency-stat-label">총 연락처</span>
          </div>
        </div>
      </div>

      {/* 계정 슬롯 그리드 */}
      <div className="agency-accounts-section">
        <h2><i className="ri-account-circle-line" /> 계정 목록</h2>
        <div className="agency-accounts-grid">
          {accountList.map(acc => (
            <div key={acc.id} className={`agency-account-card${acc.active ? ' active' : ''}${!acc.connected ? ' disconnected' : ''}`}>
              <div className="agency-account-header">
                <div className="agency-account-avatar">
                  {acc.profilePictureUrl
                    ? <img src={acc.profilePictureUrl} alt="" />
                    : <span>{acc.username?.[0]?.toUpperCase() || '?'}</span>}
                  <span className={`agency-account-status ${acc.connected ? 'connected' : 'disconnected'}`} />
                </div>
                <div className="agency-account-info">
                  <span className="agency-account-name">@{acc.username}</span>
                  <span className="agency-account-type">{acc.accountType || '비즈니스'}</span>
                </div>
                {acc.active && <span className="agency-active-badge">활성</span>}
              </div>

              <div className="agency-account-stats">
                <div className="agency-mini-stat">
                  <span className="agency-mini-stat-value">{(acc.stats?.followersCount || 0).toLocaleString()}</span>
                  <span className="agency-mini-stat-label">팔로워</span>
                </div>
                <div className="agency-mini-stat">
                  <span className="agency-mini-stat-value">{acc.stats?.flowCount || 0}</span>
                  <span className="agency-mini-stat-label">플로우</span>
                </div>
                <div className="agency-mini-stat">
                  <span className="agency-mini-stat-value">{(acc.stats?.contactCount || 0).toLocaleString()}</span>
                  <span className="agency-mini-stat-label">연락처</span>
                </div>
              </div>

              <div className="agency-account-actions">
                {acc.connected && !acc.active && (
                  <button className="btn-sm btn-primary" onClick={() => handleSwitch(acc.id)}>
                    <i className="ri-swap-line" /> 전환
                  </button>
                )}
                {acc.connected && (
                  <button className="btn-sm btn-outline" onClick={() => handleDisconnect(acc.id)}>
                    <i className="ri-link-unlink" /> 연결 해제
                  </button>
                )}
                {!acc.connected && (
                  <button className="btn-sm btn-danger" onClick={() => handleRemove(acc.id)}>
                    <i className="ri-delete-bin-line" /> 삭제
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 빈 슬롯 */}
          {accountList.length < maxAccounts && (
            <div
              className="agency-account-card empty"
              onClick={() => setShowConnectModal(true)}
            >
              <div className="agency-empty-slot">
                <i className="ri-add-circle-line" />
                <span>새 계정 추가</span>
                <span className="agency-empty-slot-desc">Instagram 비즈니스 계정을 연결하세요</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 플랜 안내 */}
      <div className="agency-plan-info">
        <div className="agency-plan-info-icon"><i className="ri-information-line" /></div>
        <div>
          <strong>계정 한도 안내</strong>
          <p>
            현재 <strong>{plan}</strong> 플랜에서는 최대 <strong>{maxAccounts}개</strong>의 계정을 연결할 수 있습니다.
            {maxAccounts < 10 && ' 더 많은 계정이 필요하시면 플랜을 업그레이드하세요.'}
          </p>
          {maxAccounts < 10 && (
            <button className="btn-link" onClick={() => navigate('/app/settings', { state: { tab: 'billing' } })}>
              플랜 업그레이드 →
            </button>
          )}
        </div>
      </div>

      {/* 계정 연결 모달 */}
      {showConnectModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setShowConnectModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Instagram 계정 추가</h3>
              <button className="icon-btn" onClick={() => setShowConnectModal(false)}>
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, color: '#fff' }}>
                <i className="ri-instagram-line" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>새 Instagram 계정 연결</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary, #666)', lineHeight: 1.6, marginBottom: 24 }}>
                Facebook 로그인을 통해 Instagram 비즈니스 또는 크리에이터 계정을 연결합니다.
                연결 후 해당 계정의 DM 자동화를 설정할 수 있습니다.
              </p>

              <div style={{ textAlign: 'left', marginBottom: 24 }}>
                <div className="agency-connect-checklist">
                  {[
                    'Instagram 비즈니스 또는 크리에이터 계정',
                    'Facebook 페이지와 연결된 계정',
                    'instagram_manage_messages 권한 허용',
                  ].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13, color: 'var(--text-secondary, #555)' }}>
                      <i className="ri-checkbox-circle-line" style={{ color: '#7C3AED', fontSize: 18 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={handleConnect}
                disabled={connecting}
                style={{ width: '100%', padding: '12px 24px', fontSize: 15, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <i className="ri-facebook-circle-fill" />
                {connecting ? '연결 중...' : 'Facebook으로 계정 연결하기'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary, #aaa)', marginTop: 12 }}>
                현재 {accountList.length} / {maxAccounts}개 계정 사용 중
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
