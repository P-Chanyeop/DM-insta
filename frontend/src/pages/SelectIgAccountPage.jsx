import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { instagramAssetService } from '../api/services'

/**
 * IG 자산 선택 페이지 — 매니챗 동일 UX.
 *
 * 사용자가 IG 연결 OAuth 받은 후, 박찬엽 비즈니스 포트폴리오에 IG 자산이
 * 여러 개 있을 때 어떤 IG 계정을 연결할지 명시적으로 선택.
 *
 * 진입 경로:
 *   handleConnectFlow 가 자산 list 가 2개 이상이면 이 페이지로 redirect.
 *   이 페이지는 GET /api/instagram/assets 로 자산 list 조회 → 사용자 선택 →
 *   POST /api/instagram/select-asset 으로 저장 → /app/onboarding 또는 /app 로 이동.
 */
export default function SelectIgAccountPage() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    instagramAssetService
      .list()
      .then((list) => {
        setAssets(list)
        setLoading(false)
        // 자산 0개면 onboarding 으로 돌아감 (에러 표시)
        if (list.length === 0) {
          navigate('/app/onboarding?ig_error=NO_IG_ASSET', { replace: true })
        }
        // 자산 1개면 자동 선택
        if (list.length === 1) {
          handleSelect(list[0])
        }
      })
      .catch((e) => {
        setError(e.response?.data?.message ?? 'Instagram 자산 조회에 실패했습니다.')
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = async (asset) => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await instagramAssetService.select({
        pageId: asset.page_id,
        igUserId: asset.user_id,
      })
      if (res.success) {
        navigate(`/app/onboarding?ig_connected=true&username=${encodeURIComponent(res.username)}`, {
          replace: true,
        })
      } else {
        setError(res.message ?? '연결 실패')
        setSubmitting(false)
      }
    } catch (e) {
      setError(e.response?.data?.message ?? '연결 실패')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Instagram 계정 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>연결할 Instagram 계정 선택</h1>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
        센드잇과 연결할 Instagram 비즈니스 계정을 선택해주세요.
      </p>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: 12,
            color: '#b91c1c',
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {assets.map((asset) => (
          <button
            key={asset.user_id}
            onClick={() => handleSelect(asset)}
            disabled={submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              textAlign: 'left',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {asset.profile_picture_url ? (
              <img
                src={asset.profile_picture_url}
                alt={asset.username}
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#6b7280',
                }}
              >
                {(asset.username ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                @{asset.username}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {asset.name}
                {asset.followers_count > 0 && ` · 팔로워 ${asset.followers_count.toLocaleString()}`}
              </div>
            </div>
            <span style={{ color: '#9ca3af', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={() => navigate('/app/onboarding')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: 13,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          취소하고 돌아가기
        </button>
      </div>
    </div>
  )
}
