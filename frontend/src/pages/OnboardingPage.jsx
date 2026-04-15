import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { automationService } from '../api/services'
import { useToast } from '../components/Toast'
import '../styles/onboarding-wizard.css'

const STEPS = [
  { id: 'instagram', title: 'Instagram 계정 연결', icon: 'ri-instagram-line' },
  { id: 'keyword', title: '첫 키워드 자동응답', icon: 'ri-chat-settings-line' },
  { id: 'welcome', title: '환영 메시지 설정', icon: 'ri-hand-heart-line' },
  { id: 'growth', title: '성장 도구 선택', icon: 'ri-seedling-line' },
  { id: 'done', title: '설정 완료', icon: 'ri-check-double-line' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [instagramConnected, setInstagramConnected] = useState(false)
  const [keywordForm, setKeywordForm] = useState({ keyword: '', message: '' })
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [growthTools, setGrowthTools] = useState({ commentDM: false, storyMention: false, storyReply: false })
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const toast = useToast()

  // 인스타 연결 상태 주기적 체크 (OAuth 팝업 완료 감지)
  useEffect(() => {
    if (step !== 0 || instagramConnected) return
    const interval = setInterval(async () => {
      try {
        const data = await api.get('/instagram/account')
        if (data && data.username) {
          setInstagramConnected(true)
          clearInterval(interval)
        }
      } catch { /* not connected yet */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [step, instagramConnected])

  const handleInstagramConnect = async () => {
    try {
      const data = await api.get('/instagram/oauth-url')
      if (data?.url) {
        window.open(data.url, '_blank', 'width=600,height=700')
      }
    } catch {
      toast.info('Instagram 앱 설정이 필요합니다. 설정 페이지에서 연결할 수 있습니다.')
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
      setStep(2)
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
      setStep(3)
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
      setStep(4)
    } catch { toast.info('일부 설정에 실패했습니다.'); setStep(4) }
    finally { setLoading(false) }
  }

  const handleFinish = () => { localStorage.setItem('onboarding_completed', 'true'); navigate('/app') }
  const handleSkip = () => { if (step < 4) setStep(step + 1) }
  const handleSkipAll = () => { localStorage.setItem('onboarding_completed', 'true'); navigate('/app') }

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
              <div className="ob-success"><i className="ri-check-line" /><span>Instagram 계정이 연결되었습니다!</span></div>
            ) : (
              <div className="ob-tips">
                <div className="ob-tip"><i className="ri-checkbox-circle-line" /><span>비즈니스 또는 크리에이터 계정이어야 합니다</span></div>
                <div className="ob-tip"><i className="ri-checkbox-circle-line" /><span>Facebook 페이지와 연결되어 있어야 합니다</span></div>
                <div className="ob-tip"><i className="ri-checkbox-circle-line" /><span>DM 자동화를 위한 메시지 권한이 필요합니다</span></div>
              </div>
            )}
            <div className="ob-actions">
              {!instagramConnected
                ? <button className="ob-btn-primary" onClick={handleInstagramConnect}><i className="ri-instagram-line" /> Instagram 계정 연결하기</button>
                : <button className="ob-btn-primary" onClick={() => setStep(1)}>다음 단계로 <i className="ri-arrow-right-line" /></button>
              }
              <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
            </div>
          </div>
        )}

        {/* Step 1: 키워드 자동응답 */}
        {step === 1 && (
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
              <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
            </div>
          </div>
        )}

        {/* Step 2: 환영 메시지 */}
        {step === 2 && (
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
              <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
            </div>
          </div>
        )}

        {/* Step 3: 성장 도구 */}
        {step === 3 && (
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
              <button className="ob-btn-ghost" onClick={handleSkip}>건너뛰기</button>
            </div>
          </div>
        )}

        {/* Step 4: 완료 */}
        {step === 4 && (
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
