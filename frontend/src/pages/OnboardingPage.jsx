import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, getStoredUser, setStoredUser } from '../api/client'
import { automationService, userService } from '../api/services'
import { useToast } from '../components/Toast'
import { INDUSTRIES } from '../components/IndustrySelectModal'
import '../styles/onboarding-wizard.css'

const STEPS = [
  { id: 'instagram', title: 'Instagram 계정 연결', icon: 'ri-instagram-line' },
  { id: 'industry',  title: '업종 선택',            icon: 'ri-store-2-line' },
  { id: 'keyword',   title: '첫 키워드 자동응답',    icon: 'ri-chat-settings-line' },
  { id: 'welcome',   title: '환영 메시지 설정',      icon: 'ri-hand-heart-line' },
  { id: 'growth',    title: '성장 도구 선택',        icon: 'ri-seedling-line' },
  { id: 'done',      title: '설정 완료',             icon: 'ri-check-double-line' },
]

/** IG 에러 코드 → 사용자 친화적 메시지 */
const IG_ERROR_MESSAGES = {
  NO_FB_PAGE: {
    title: 'Facebook 페이지가 없습니다',
    desc: 'Instagram을 연결하려면 먼저 Facebook 페이지가 필요합니다. 페이지를 만든 뒤 Instagram 비즈니스 계정을 연결해주세요.',
    actions: [
      { label: 'Facebook 페이지 만들기', href: 'https://www.facebook.com/pages/create', external: true },
    ],
  },
  NO_IG_BUSINESS: {
    title: 'Instagram 비즈니스 계정 연결이 필요합니다',
    desc: 'Facebook 페이지에 Instagram 비즈니스(또는 크리에이터) 계정을 연결해주세요. 연결 후 아래의 "재시도" 버튼을 눌러주세요.',
    actions: [
      { label: 'Instagram 계정 유형 변경 안내', href: 'https://help.instagram.com/502981923235522', external: true },
    ],
  },
  IG_ALREADY_OWNED: {
    title: '이미 다른 계정에 연결된 Instagram입니다',
    desc: '이 Instagram 계정은 이미 다른 센드잇 사용자 계정에 연결되어 있습니다. 고객지원으로 문의해주세요.',
    actions: [],
  },
  IG_PROFILE_ERROR: {
    title: 'Instagram 정보를 가져오지 못했습니다',
    desc: 'Instagram 프로필 정보를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    actions: [],
  },
  FB_API_ERROR: {
    title: 'Facebook API 오류',
    desc: 'Facebook API 호출 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    actions: [],
  },
  FB_TOKEN_MISSING: {
    title: 'Facebook 인증이 만료되었습니다',
    desc: 'Instagram 연결을 위해 Facebook 인증을 다시 진행해주세요.',
    actions: [],
  },
  FB_TOKEN_INVALID: {
    title: 'Facebook 인증 정보가 유효하지 않습니다',
    desc: '다시 로그인한 뒤 시도해주세요.',
    actions: [],
  },
  SESSION_EXPIRED: {
    title: '세션이 만료되었습니다',
    desc: '다시 로그인해주세요.',
    actions: [],
  },
  oauth_cancelled: {
    title: 'Facebook 로그인이 취소되었습니다',
    desc: 'Instagram 연결을 완료하려면 다시 시도해주세요.',
    actions: [],
  },
  UNKNOWN: {
    title: 'Instagram 연결에 실패했습니다',
    desc: '문제가 계속되면 고객지원으로 문의해주세요.',
    actions: [],
  },
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [instagramConnected, setInstagramConnected] = useState(false)
  const [instagramUsername, setInstagramUsername] = useState('')
  const [igError, setIgError] = useState(null) // { code, reason }
  const [retrying, setRetrying] = useState(false)
  const [industry, setIndustry] = useState(() => getStoredUser()?.industry || null)
  const [keywordForm, setKeywordForm] = useState({ keyword: '', message: '' })
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [growthTools, setGrowthTools] = useState({ commentDM: false, storyMention: false, storyReply: false })
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // URL 파라미터로 온 IG 연결 결과 처리 (OAuth 콜백 후)
  useEffect(() => {
    const igConnected = searchParams.get('ig_connected')
    const errorCode = searchParams.get('ig_error')
    const errorReason = searchParams.get('ig_reason')
    const usernameParam = searchParams.get('username')

    if (igConnected === 'true') {
      setInstagramConnected(true)
      if (usernameParam) setInstagramUsername(usernameParam)
      setIgError(null)
      toast.info('Instagram 계정이 연결되었습니다!')
      // 이미 연결됐으니 Instagram 단계는 건너뛰고 업종 선택으로
      // 업종도 이미 있다면 키워드 단계로 한 칸 더 진행
      const existingIndustry = getStoredUser()?.industry
      setStep(existingIndustry && existingIndustry !== 'skipped' ? 2 : 1)
      // URL에서 파라미터 제거
      searchParams.delete('ig_connected')
      searchParams.delete('username')
      setSearchParams(searchParams, { replace: true })
    } else if (errorCode) {
      setIgError({ code: errorCode, reason: errorReason })
      // URL에서 파라미터 제거
      searchParams.delete('ig_error')
      searchParams.delete('ig_reason')
      setSearchParams(searchParams, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 최초 진입 시 현재 연결 상태 조회
  useEffect(() => {
    ;(async () => {
      try {
        const data = await api.get('/instagram/account')
        if (data && data.connected && data.username) {
          setInstagramConnected(true)
          setInstagramUsername(data.username)
          // URL에 ig_connected=true가 없더라도 이미 연결되어 있으면 Step 0 스킵
          const existingIndustry = getStoredUser()?.industry
          const target = existingIndustry && existingIndustry !== 'skipped' ? 2 : 1
          setStep((prev) => (prev === 0 ? target : prev))
        }
      } catch { /* ignore */ }
    })()
  }, [])

  /** Instagram 연결 — 전체 페이지 리다이렉트 (팝업 X) */
  const handleInstagramConnect = async () => {
    try {
      const data = await api.get('/instagram/oauth-url')
      if (data?.url) {
        window.location.href = data.url
      } else {
        toast.info('Instagram 연결 URL을 가져오지 못했습니다.')
      }
    } catch {
      toast.info('Instagram 앱 설정이 필요합니다. 설정 페이지에서 연결할 수 있습니다.')
    }
  }

  /** 저장된 FB 토큰으로 재시도 (OAuth 재인증 없음) */
  const handleRetryConnect = async () => {
    setRetrying(true)
    setIgError(null)
    try {
      const res = await api.post('/instagram/retry-connect')
      if (res?.success) {
        setInstagramConnected(true)
        setInstagramUsername(res.username || '')
        toast.info('Instagram 계정이 연결되었습니다!')
        setStep(1) // 업종 선택으로 자동 진행
      } else {
        const code = res?.error || 'UNKNOWN'
        // 세션 만료 → 로그인 페이지로
        if (code === 'SESSION_EXPIRED') {
          toast.info('세션이 만료되었습니다. 다시 로그인해주세요.')
          localStorage.removeItem('authToken')
          localStorage.removeItem('authUser')
          navigate('/login')
          return
        }
        setIgError({ code, reason: res?.message })
      }
    } catch (err) {
      setIgError({ code: 'UNKNOWN', reason: err.message })
    } finally {
      setRetrying(false)
    }
  }

  /** 업종 선택 저장 후 다음 단계 */
  const handleIndustrySave = async () => {
    if (!industry) { toast.info('업종을 선택해주세요'); return }
    setLoading(true)
    try {
      const user = getStoredUser()
      await userService.updateMe({ name: user?.name || '사용자', industry })
      if (user) setStoredUser({ ...user, industry })
      toast.info('업종이 저장되었습니다!')
      setStep(2)
    } catch {
      // 저장 실패 시에도 로컬엔 반영하여 사용자 경험 유지
      const user = getStoredUser()
      if (user) setStoredUser({ ...user, industry })
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  const handleKeywordSave = async () => {
    if (!keywordForm.keyword.trim()) { toast.info('키워드를 입력해주세요'); return }
    setLoading(true)
    try {
      await automationService.create({
        name: `자동응답: ${keywordForm.keyword}`, type: 'DM_KEYWORD',
        keyword: keywordForm.keyword, matchType: 'CONTAINS',
        responseMessage: keywordForm.message || `안녕하세요! "${keywordForm.keyword}" 관련 문의를 주셨군요. 곧 답변드리겠습니다.`,
        active: true,
      })
      toast.info('키워드 자동응답이 생성되었습니다!')
      setStep(3)
    } catch { toast.info('자동응답 생성에 실패했습니다. 건너뛸 수 있습니다.') }
    finally { setLoading(false) }
  }

  const handleWelcomeSave = async () => {
    if (!welcomeMessage.trim()) { toast.info('환영 메시지를 입력해주세요'); return }
    setLoading(true)
    try {
      await automationService.create({
        name: '신규 팔로워 환영 메시지', type: 'WELCOME_DM',
        responseMessage: welcomeMessage, active: true,
      })
      toast.info('환영 메시지가 설정되었습니다!')
      setStep(4)
    } catch { toast.info('환영 메시지 저장에 실패했습니다. 건너뛸 수 있습니다.') }
    finally { setLoading(false) }
  }

  const handleGrowthSave = async () => {
    setLoading(true)
    try {
      const promises = []
      if (growthTools.commentDM) promises.push(automationService.create({ name: '댓글 자동 DM', type: 'COMMENT', keyword: '', matchType: 'CONTAINS', responseMessage: '댓글 감사합니다! DM으로 자세한 정보를 보내드릴게요.', active: true }))
      if (growthTools.storyMention) promises.push(automationService.create({ name: '스토리 멘션 자동응답', type: 'STORY_MENTION', responseMessage: '스토리에 태그해주셔서 감사합니다!', active: true }))
      if (growthTools.storyReply) promises.push(automationService.create({ name: '스토리 답장 자동응답', type: 'STORY_REPLY', responseMessage: '스토리에 반응해주셔서 감사합니다!', active: true }))
      if (promises.length > 0) await Promise.all(promises)
      setStep(5)
    } catch { toast.info('일부 설정에 실패했습니다.'); setStep(5) }
    finally { setLoading(false) }
  }

  /** 이메일 범위 플래그 키 — 다른 사용자/재가입자와 혼동 방지 */
  const onboardingKey = () => {
    const email = getStoredUser()?.email
    return email ? `onboarding_completed_${email}` : 'onboarding_completed'
  }

  const handleFinish = () => { localStorage.setItem(onboardingKey(), 'true'); navigate('/app') }
  const handleSkip = () => { if (step < STEPS.length - 1) setStep(step + 1) }
  const handleBack = () => { if (step > 0) setStep(step - 1) }
  const handleSkipAll = () => { localStorage.setItem(onboardingKey(), 'true'); navigate('/app') }

  // IG 에러 정보 가져오기
  const errorInfo = igError ? (IG_ERROR_MESSAGES[igError.code] || IG_ERROR_MESSAGES.UNKNOWN) : null
  // 재시도 가능한지 판단 (토큰 만료면 OAuth부터 다시)
  const needsReauth = igError && (igError.code === 'FB_TOKEN_MISSING' || igError.code === 'FB_TOKEN_INVALID' || igError.code === 'oauth_cancelled')

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <div className="onboarding-logo">
          <img src="/images/sendit_04_full_gradient.png" alt="센드잇" />
        </div>
        <button className="onboarding-skip-all" onClick={handleSkipAll}>나중에 할게요</button>
      </div>

      <div className="ob-progress">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`ob-progress-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
            <div className="ob-progress-dot">
              {i < step ? <i className="ri-check-line" /> : <span>{i + 1}</span>}
            </div>
            <span className="ob-progress-label">{s.title}</span>
            {i < STEPS.length - 1 && <div className="ob-progress-line" />}
          </div>
        ))}
      </div>

      <div className="ob-card">
        {/* Step 0: Instagram 연결 */}
        {step === 0 && (
          <div className="ob-step">
            <div className="ob-step-icon instagram"><i className="ri-instagram-line" /></div>
            <h2>Instagram 비즈니스 계정을 연결하세요</h2>
            <p className="ob-step-desc">
              센드잇의 모든 자동화 기능을 사용하려면<br />
              Instagram 비즈니스 또는 크리에이터 계정 연결이 필요합니다.
            </p>

            {instagramConnected ? (
              <div className="ob-success">
                <i className="ri-check-line" />
                <span>
                  Instagram 계정이 연결되었습니다!
                  {instagramUsername && <strong style={{ marginLeft: 6 }}>@{instagramUsername}</strong>}
                </span>
              </div>
            ) : errorInfo ? (
              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 12,
                padding: 20,
                textAlign: 'left',
                marginTop: 8,
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <i className="ri-error-warning-line" style={{ fontSize: 24, color: '#e11d48', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#9f1239', fontWeight: 700 }}>
                      {errorInfo.title}
                    </h3>
                    <p style={{ margin: '6px 0 0', color: '#881337', fontSize: 14, lineHeight: 1.6 }}>
                      {errorInfo.desc}
                    </p>
                    {igError?.reason && errorInfo.desc !== igError.reason && (
                      <p style={{ margin: '6px 0 0', color: '#9f1239', fontSize: 12, fontFamily: 'monospace' }}>
                        상세: {igError.reason}
                      </p>
                    )}
                    {errorInfo.actions && errorInfo.actions.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {errorInfo.actions.map((action, idx) => (
                          <a
                            key={idx}
                            href={action.href}
                            target={action.external ? '_blank' : undefined}
                            rel={action.external ? 'noopener noreferrer' : undefined}
                            style={{
                              padding: '6px 12px',
                              background: '#fff',
                              border: '1px solid #fca5a5',
                              borderRadius: 6,
                              fontSize: 13,
                              color: '#be123c',
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            {action.label} <i className="ri-external-link-line" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="ob-tips">
                <div className="ob-tip"><i className="ri-checkbox-circle-line" /><span>비즈니스 또는 크리에이터 계정이어야 합니다</span></div>
                <div className="ob-tip"><i className="ri-checkbox-circle-line" /><span>Facebook 페이지와 연결되어 있어야 합니다</span></div>
                <div className="ob-tip"><i className="ri-checkbox-circle-line" /><span>DM 자동화를 위한 메시지 권한이 필요합니다</span></div>
              </div>
            )}

            <div className="ob-actions">
              {instagramConnected ? (
                <button className="ob-btn-primary" onClick={() => setStep(1)}>
                  업종 선택으로 <i className="ri-arrow-right-line" />
                </button>
              ) : errorInfo ? (
                needsReauth ? (
                  <button className="ob-btn-primary" onClick={handleInstagramConnect}>
                    <i className="ri-instagram-line" /> Facebook 다시 인증하기
                  </button>
                ) : (
                  <>
                    <button className="ob-btn-primary" onClick={handleRetryConnect} disabled={retrying}>
                      {retrying ? (
                        <><i className="ri-loader-4-line spin" /> 재시도 중...</>
                      ) : (
                        <><i className="ri-refresh-line" /> 재시도</>
                      )}
                    </button>
                    <button className="ob-btn-ghost" onClick={handleInstagramConnect}>
                      Facebook 다시 인증
                    </button>
                  </>
                )
              ) : (
                <button className="ob-btn-primary" onClick={handleInstagramConnect}>
                  <i className="ri-instagram-line" /> Instagram 계정 연결하기
                </button>
              )}
              <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
            </div>
          </div>
        )}

        {/* Step 1: 업종 선택 */}
        {step === 1 && (
          <div className="ob-step">
            <div className="ob-step-icon industry"><i className="ri-store-2-line" /></div>
            <h2>업종을 선택해 주세요</h2>
            <p className="ob-step-desc">맞춤 템플릿과 자동화 추천을 위해<br />업종을 알려주세요.</p>

            <div className="industry-grid" style={{ marginTop: 16 }}>
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.id}
                  type="button"
                  className={`industry-card${industry === ind.id ? ' selected' : ''}`}
                  onClick={() => setIndustry(ind.id)}
                >
                  <i className={ind.icon} />
                  <strong>{ind.label}</strong>
                  <span>{ind.desc}</span>
                </button>
              ))}
            </div>

            <div className="ob-actions">
              <button className="ob-btn-primary" onClick={handleIndustrySave} disabled={loading || !industry}>
                {loading ? <><i className="ri-loader-4-line spin" /> 저장 중...</> : <>다음 단계로 <i className="ri-arrow-right-line" /></>}
              </button>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button className="ob-btn-ghost" onClick={handleBack}><i className="ri-arrow-left-line" /> 이전</button>
                <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 키워드 자동응답 */}
        {step === 2 && (
          <div className="ob-step">
            <div className="ob-step-icon keyword"><i className="ri-chat-settings-line" /></div>
            <h2>첫 키워드 자동응답을 만들어보세요</h2>
            <p className="ob-step-desc">특정 키워드가 포함된 DM을 받으면 자동으로 응답합니다.<br />예: "가격" → 가격표 자동 발송</p>

            <div className="ob-form">
              <div>
                <label>트리거 키워드</label>
                <div className="ob-input-icon">
                  <i className="ri-hashtag" />
                  <input type="text" placeholder='예: 가격, 문의, 예약' value={keywordForm.keyword} onChange={(e) => setKeywordForm(f => ({ ...f, keyword: e.target.value }))} />
                </div>
              </div>
              <div>
                <label>자동 응답 메시지</label>
                <textarea placeholder='안녕하세요! 문의해주셔서 감사합니다. 곧 답변드리겠습니다.' value={keywordForm.message} onChange={(e) => setKeywordForm(f => ({ ...f, message: e.target.value }))} rows={3} />
                <span className="ob-field-hint">비워두면 기본 메시지가 적용됩니다</span>
              </div>
            </div>

            <div className="ob-preview">
              <div className="ob-preview-label"><i className="ri-smartphone-line" /> 미리보기</div>
              <div className="ob-dm-list">
                <div className="ob-dm in">{keywordForm.keyword || '가격'} 알려주세요</div>
                <div className="ob-dm out">{keywordForm.message || `안녕하세요! "${keywordForm.keyword || '가격'}" 관련 문의를 주셨군요. 곧 답변드리겠습니다.`}</div>
              </div>
            </div>

            <div className="ob-actions">
              <button className="ob-btn-primary" onClick={handleKeywordSave} disabled={loading}>
                {loading ? <><i className="ri-loader-4-line spin" /> 저장 중...</> : <>자동응답 만들기 <i className="ri-arrow-right-line" /></>}
              </button>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button className="ob-btn-ghost" onClick={handleBack}><i className="ri-arrow-left-line" /> 이전</button>
                <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 환영 메시지 */}
        {step === 3 && (
          <div className="ob-step">
            <div className="ob-step-icon welcome"><i className="ri-hand-heart-line" /></div>
            <h2>신규 팔로워 환영 메시지</h2>
            <p className="ob-step-desc">새로운 팔로워에게 자동으로 DM을 보내<br />첫인상을 강하게 남기고 대화를 시작하세요.</p>

            <div className="ob-form">
              <div>
                <label>환영 메시지</label>
                <textarea placeholder='안녕하세요! 팔로우해주셔서 감사합니다 🙏 무엇이든 궁금한 점이 있으시면 편하게 DM 주세요!' value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={4} />
              </div>
            </div>

            <div className="ob-preview">
              <div className="ob-preview-label"><i className="ri-smartphone-line" /> 미리보기</div>
              <div className="ob-dm-list">
                <div className="ob-dm sys"><i className="ri-user-add-line" /> 새 팔로워가 추가되었습니다</div>
                <div className="ob-dm out">{welcomeMessage || '안녕하세요! 팔로우해주셔서 감사합니다 🙏 무엇이든 궁금한 점이 있으시면 편하게 DM 주세요!'}</div>
              </div>
            </div>

            <div className="ob-actions">
              <button className="ob-btn-primary" onClick={handleWelcomeSave} disabled={loading}>
                {loading ? <><i className="ri-loader-4-line spin" /> 저장 중...</> : <>환영 메시지 저장 <i className="ri-arrow-right-line" /></>}
              </button>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button className="ob-btn-ghost" onClick={handleBack}><i className="ri-arrow-left-line" /> 이전</button>
                <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 성장 도구 */}
        {step === 4 && (
          <div className="ob-step">
            <div className="ob-step-icon growth"><i className="ri-seedling-line" /></div>
            <h2>성장 도구를 활성화하세요</h2>
            <p className="ob-step-desc">Instagram 활동을 자동화하여<br />팔로워 참여율과 매출을 높이세요.</p>

            <div className="ob-growth-list">
              <label className={`ob-growth ${growthTools.commentDM ? 'selected' : ''}`}>
                <input type="checkbox" checked={growthTools.commentDM} onChange={(e) => setGrowthTools(g => ({ ...g, commentDM: e.target.checked }))} />
                <div className="ob-growth-icon comment"><i className="ri-chat-3-line" /></div>
                <div className="ob-growth-body"><strong>댓글 자동 DM</strong><span>게시물에 댓글을 남기면 자동으로 DM을 보냅니다</span></div>
                <div className="ob-growth-check"><i className={growthTools.commentDM ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} /></div>
              </label>
              <label className={`ob-growth ${growthTools.storyMention ? 'selected' : ''}`}>
                <input type="checkbox" checked={growthTools.storyMention} onChange={(e) => setGrowthTools(g => ({ ...g, storyMention: e.target.checked }))} />
                <div className="ob-growth-icon mention"><i className="ri-at-line" /></div>
                <div className="ob-growth-body"><strong>스토리 멘션 자동응답</strong><span>스토리에서 태그되면 자동으로 감사 DM을 보냅니다</span></div>
                <div className="ob-growth-check"><i className={growthTools.storyMention ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} /></div>
              </label>
              <label className={`ob-growth ${growthTools.storyReply ? 'selected' : ''}`}>
                <input type="checkbox" checked={growthTools.storyReply} onChange={(e) => setGrowthTools(g => ({ ...g, storyReply: e.target.checked }))} />
                <div className="ob-growth-icon reply"><i className="ri-reply-line" /></div>
                <div className="ob-growth-body"><strong>스토리 답장 자동응답</strong><span>스토리에 답장하면 자동으로 응답합니다</span></div>
                <div className="ob-growth-check"><i className={growthTools.storyReply ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} /></div>
              </label>
            </div>

            <div className="ob-actions">
              <button className="ob-btn-primary" onClick={handleGrowthSave} disabled={loading}>
                {loading ? <><i className="ri-loader-4-line spin" /> 저장 중...</> : <>활성화하고 완료 <i className="ri-arrow-right-line" /></>}
              </button>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button className="ob-btn-ghost" onClick={handleBack}><i className="ri-arrow-left-line" /> 이전</button>
                <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: 완료 */}
        {step === 5 && (
          <div className="ob-step">
            <div className="ob-done-icon"><i className="ri-check-double-line" /></div>
            <h2>센드잇 설정이 완료되었습니다!</h2>
            <p className="ob-step-desc">이제 인스타그램 DM 자동화를 시작할 준비가 되었습니다.<br />대시보드에서 모든 기능을 활용해보세요.</p>

            <div className="ob-summary">
              <div className="ob-summary-item">
                <i className={`ri-instagram-line ${instagramConnected ? 'done' : 'skipped'}`} />
                <span>Instagram 연결</span>
                <span className={instagramConnected ? 'ob-badge-done' : 'ob-badge-skip'}>{instagramConnected ? '완료' : '건너뜀'}</span>
              </div>
              <div className="ob-summary-item">
                <i className={`ri-store-2-line ${industry && industry !== 'skipped' ? 'done' : 'skipped'}`} />
                <span>업종 선택</span>
                <span className={industry && industry !== 'skipped' ? 'ob-badge-done' : 'ob-badge-skip'}>
                  {industry && industry !== 'skipped'
                    ? (INDUSTRIES.find(i => i.id === industry)?.label || '완료')
                    : '건너뜀'}
                </span>
              </div>
              <div className="ob-summary-item">
                <i className={`ri-chat-settings-line ${keywordForm.keyword ? 'done' : 'skipped'}`} />
                <span>키워드 자동응답</span>
                <span className={keywordForm.keyword ? 'ob-badge-done' : 'ob-badge-skip'}>{keywordForm.keyword ? '완료' : '건너뜀'}</span>
              </div>
              <div className="ob-summary-item">
                <i className={`ri-hand-heart-line ${welcomeMessage ? 'done' : 'skipped'}`} />
                <span>환영 메시지</span>
                <span className={welcomeMessage ? 'ob-badge-done' : 'ob-badge-skip'}>{welcomeMessage ? '완료' : '건너뜀'}</span>
              </div>
              <div className="ob-summary-item">
                <i className={`ri-seedling-line ${Object.values(growthTools).some(v => v) ? 'done' : 'skipped'}`} />
                <span>성장 도구</span>
                <span className={Object.values(growthTools).some(v => v) ? 'ob-badge-done' : 'ob-badge-skip'}>{Object.values(growthTools).some(v => v) ? '완료' : '건너뜀'}</span>
              </div>
            </div>

            <div className="ob-actions">
              <button className="ob-btn-primary" onClick={handleFinish}>대시보드로 이동 <i className="ri-arrow-right-line" /></button>
              <button className="ob-btn-ghost" onClick={handleBack}><i className="ri-arrow-left-line" /> 이전</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
