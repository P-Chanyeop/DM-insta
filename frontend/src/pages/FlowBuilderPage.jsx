import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { flowService } from '../api/services'
import OnboardingTour from '../components/OnboardingTour'

/* ── 매니챗 스타일 Quick Automation 위저드 ── */
export default function FlowBuilderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentFlowId, setCurrentFlowId] = useState(location.state?.flowId || null)

  const tourRef = useRef(null)
  const [flowName, setFlowName] = useState('새 자동화')
  const [isLive, setIsLive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  /* ── 자동화 설정 상태 ── */
  const [config, setConfig] = useState({
    // 1. 트리거
    triggerType: 'comment',       // comment | keyword | story_mention | story_reply | welcome
    postTarget: 'any',            // specific | any | next
    specificPostUrl: '',
    keywords: '',
    keywordMatch: 'CONTAINS',     // CONTAINS | EXACT | ANY
    excludeKeywords: '',

    // 2. 공개 댓글 답장
    publicReplyEnabled: false,
    publicReplies: ['댓글 감사합니다! DM으로 링크를 보내드릴게요 :)'],

    // 3. 오프닝 DM
    openingDmEnabled: true,
    openingDmText: '안녕하세요! 요청하신 정보를 보내드릴게요.',
    openingDmButtonText: '링크 받기',

    // 4. 요구사항
    followCheckEnabled: false,
    followPromptText: '링크를 받으시려면 먼저 팔로우해 주세요! 팔로우 후 다시 댓글을 남겨주세요.',
    emailCollectionEnabled: false,
    emailPromptText: '이메일 주소를 입력해 주세요.',

    // 5. 메인 DM (링크 포함)
    mainDmText: '요청하신 링크입니다!',
    links: [{ label: '', url: '' }],

    // 6. 팔로업
    followUpEnabled: false,
    followUpDelay: 30,
    followUpDelayUnit: 'minutes',
    followUpText: '혹시 링크를 확인하셨나요? 도움이 필요하시면 언제든 말씀해 주세요!',
  })

  const set = (patch) => setConfig(prev => ({ ...prev, ...patch }))

  /**
   * UI flat config → 백엔드 nested flowData JSON 변환
   */
  const configToFlowData = (c) => {
    const delayUnitMap = { minutes: '분', hours: '시간', days: '일' }
    return {
      trigger: {
        type: c.triggerType,
        keywords: c.keywords ? c.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        excludeKeywords: c.excludeKeywords ? c.excludeKeywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        matchType: c.keywordMatch || 'CONTAINS',
        postTarget: c.postTarget || 'any',
      },
      commentReply: {
        enabled: c.publicReplyEnabled || false,
        replies: c.publicReplies || [],
      },
      openingDm: {
        enabled: c.openingDmEnabled || false,
        message: c.openingDmText || '',
        buttonText: c.openingDmButtonText || '',
      },
      requirements: {
        followCheck: {
          enabled: c.followCheckEnabled || false,
          message: c.followPromptText || '',
        },
        emailCollection: {
          enabled: c.emailCollectionEnabled || false,
          message: c.emailPromptText || '',
        },
      },
      mainDm: {
        message: c.mainDmText || '',
        links: (c.links || []).filter(l => l.url).map(l => ({ text: l.label || '', url: l.url })),
      },
      followUp: {
        enabled: c.followUpEnabled || false,
        delay: c.followUpDelay || 30,
        unit: delayUnitMap[c.followUpDelayUnit] || '분',
        message: c.followUpText || '',
      },
    }
  }

  /**
   * 백엔드 nested flowData JSON → UI flat config 역변환
   */
  const flowDataToConfig = (fd) => {
    const unitMap = { '분': 'minutes', '시간': 'hours', '일': 'days' }
    // nested 구조인지 판별 (trigger 또는 commentReply 키가 있으면 nested)
    if (!fd.trigger && !fd.commentReply && !fd.openingDm) {
      return fd // 이미 flat 구조 (레거시 호환)
    }
    return {
      triggerType: fd.trigger?.type || 'comment',
      postTarget: fd.trigger?.postTarget || 'any',
      specificPostUrl: '',
      keywords: (fd.trigger?.keywords || []).join(', '),
      keywordMatch: fd.trigger?.matchType || 'CONTAINS',
      excludeKeywords: (fd.trigger?.excludeKeywords || []).join(', '),
      publicReplyEnabled: fd.commentReply?.enabled || false,
      publicReplies: fd.commentReply?.replies || [''],
      openingDmEnabled: fd.openingDm?.enabled || false,
      openingDmText: fd.openingDm?.message || '',
      openingDmButtonText: fd.openingDm?.buttonText || '',
      followCheckEnabled: fd.requirements?.followCheck?.enabled || false,
      followPromptText: fd.requirements?.followCheck?.message || '',
      emailCollectionEnabled: fd.requirements?.emailCollection?.enabled || false,
      emailPromptText: fd.requirements?.emailCollection?.message || '',
      mainDmText: fd.mainDm?.message || '',
      links: (fd.mainDm?.links || [{ text: '', url: '' }]).map(l => ({ label: l.text || '', url: l.url || '' })),
      followUpEnabled: fd.followUp?.enabled || false,
      followUpDelay: fd.followUp?.delay || 30,
      followUpDelayUnit: unitMap[fd.followUp?.unit] || 'minutes',
      followUpText: fd.followUp?.message || '',
    }
  }

  // 기존 플로우 로드
  useEffect(() => {
    if (!currentFlowId) return
    ;(async () => {
      try {
        const f = await flowService.get(currentFlowId)
        setFlowName(f.name)
        setIsLive(f.active || false)
        if (f.flowData) {
          try {
            const parsed = JSON.parse(f.flowData)
            setConfig(prev => ({ ...prev, ...flowDataToConfig(parsed) }))
          } catch {}
        }
      } catch (err) { setError(err.message || '불러오기 실패') }
    })()
  }, [currentFlowId])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      const payload = {
        name: flowName,
        triggerType: config.triggerType.toUpperCase(),
        flowData: JSON.stringify(configToFlowData(config)),
        active: isLive,
        status: isLive ? 'PUBLISHED' : 'DRAFT',
      }
      if (currentFlowId) {
        await flowService.update(currentFlowId, payload)
      } else {
        const created = await flowService.create(payload)
        if (created?.id) setCurrentFlowId(created.id)
      }
      setSavedAt(new Date())
    } catch (err) { setError(err.message || '저장 실패') }
    finally { setSaving(false) }
  }

  const handleToggleLive = () => {
    setIsLive(!isLive)
  }

  return (
    <div className="flow-builder-page">
      {/* ── 헤더 ── */}
      <div className="fb-header">
        <div className="fb-header-left">
          <button className="icon-btn" onClick={() => navigate('/app/flows')}>
            <i className="ri-arrow-left-line" />
          </button>
          <input
            className="fb-title-input"
            data-tour="flow-name"
            value={flowName}
            onChange={e => setFlowName(e.target.value)}
            placeholder="자동화 이름"
          />
        </div>
        <div className="fb-header-right" data-tour="header-actions">
          <button className="fb-tour-btn" onClick={() => tourRef.current?.restart()} title="사용법 가이드">
            <i className="ri-question-line" />
          </button>
          <div className={`fb-live-badge ${isLive ? 'live' : 'draft'}`}>
            {isLive ? 'Live' : 'Draft'}
          </div>
          <label className="fb-live-toggle">
            <input type="checkbox" checked={isLive} onChange={handleToggleLive} />
            <span className="fb-toggle-slider" />
          </label>
          <button className="btn-primary small" onClick={handleSave} disabled={saving}>
            <i className={saving ? 'ri-loader-4-line spin' : 'ri-save-line'} />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ margin: '8px 16px' }}><i className="ri-error-warning-line" /> {error}</div>}

      {/* ── 본문 ── */}
      <div className="fb-body">
        {/* 왼쪽: 설정 위저드 */}
        <div className="fb-wizard">
          {/* 동작 흐름 안내 */}
          <div className="fb-flow-guide" data-tour="flow-guide">
            <h3><i className="ri-route-line" /> 자동화 동작 흐름</h3>
            <div className="fb-flow-steps">
              <div className="fb-flow-step">
                <div className="fb-flow-dot" style={{ background: '#EF4444' }} />
                <span>사용자가 {config.triggerType === 'comment' ? '게시물에 키워드 댓글 작성' : config.triggerType === 'keyword' ? 'DM으로 키워드 전송' : config.triggerType === 'story_mention' ? '스토리에 계정 멘션' : config.triggerType === 'story_reply' ? '스토리에 답장' : '처음 DM 전송'}</span>
              </div>
              {config.triggerType === 'comment' && config.publicReplyEnabled && (
                <div className="fb-flow-step">
                  <div className="fb-flow-dot" style={{ background: '#06B6D4' }} />
                  <span>댓글 아래에 공개 답장 자동 게시</span>
                </div>
              )}
              {config.openingDmEnabled && (
                <div className="fb-flow-step">
                  <div className="fb-flow-dot" style={{ background: '#3B82F6' }} />
                  <span>오프닝 DM 발송 → 사용자가 버튼 탭 → 대화 시작</span>
                </div>
              )}
              {config.followCheckEnabled && (
                <div className="fb-flow-step">
                  <div className="fb-flow-dot" style={{ background: '#8B5CF6' }} />
                  <span>팔로우 여부 확인 (미팔로우 시 안내 메시지)</span>
                </div>
              )}
              {config.emailCollectionEnabled && (
                <div className="fb-flow-step">
                  <div className="fb-flow-dot" style={{ background: '#8B5CF6' }} />
                  <span>이메일 주소 수집</span>
                </div>
              )}
              <div className="fb-flow-step">
                <div className="fb-flow-dot" style={{ background: '#10B981' }} />
                <span>메인 DM + 링크 전달</span>
              </div>
              {config.followUpEnabled && (
                <div className="fb-flow-step">
                  <div className="fb-flow-dot" style={{ background: '#F59E0B' }} />
                  <span>{config.followUpDelay}{config.followUpDelayUnit === 'minutes' ? '분' : config.followUpDelayUnit === 'hours' ? '시간' : '일'} 후 팔로업 메시지 발송</span>
                </div>
              )}
            </div>
          </div>

          {/* ── 1. 트리거 설정 ── */}
          <Section
            num="1"
            title="트리거"
            desc="어떤 상황에서 자동화가 시작될까요?"
            icon="ri-flashlight-line"
            color="#F59E0B"
            tourId="trigger"
          >
            <div className="fb-field">
              <label>트리거 유형</label>
              <div className="fb-trigger-cards">
                {[
                  { value: 'comment', icon: 'ri-chat-3-line', label: '게시물/릴스 댓글', color: '#EF4444' },
                  { value: 'keyword', icon: 'ri-chat-1-line', label: 'DM 키워드', color: '#F59E0B' },
                  { value: 'story_mention', icon: 'ri-camera-line', label: '스토리 멘션', color: '#8B5CF6' },
                  { value: 'story_reply', icon: 'ri-reply-line', label: '스토리 답장', color: '#EC4899' },
                  { value: 'welcome', icon: 'ri-hand-heart-line', label: '환영 메시지', color: '#10B981' },
                ].map(t => (
                  <button
                    key={t.value}
                    className={`fb-trigger-card ${config.triggerType === t.value ? 'active' : ''}`}
                    onClick={() => set({ triggerType: t.value })}
                  >
                    <i className={t.icon} style={{ color: t.color }} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {config.triggerType === 'comment' && (
              <>
                <div className="fb-field">
                  <label>게시물 선택</label>
                  <div className="fb-radio-group">
                    {[
                      { value: 'any', label: '모든 게시물/릴스' },
                      { value: 'next', label: '다음 게시물/릴스' },
                      { value: 'specific', label: '특정 게시물/릴스' },
                    ].map(o => (
                      <label key={o.value} className="fb-radio">
                        <input type="radio" name="postTarget" value={o.value} checked={config.postTarget === o.value} onChange={e => set({ postTarget: e.target.value })} />
                        <span className="fb-radio-dot" />
                        {o.label}
                      </label>
                    ))}
                  </div>
                  {config.postTarget === 'specific' && (
                    <input className="fb-input" placeholder="게시물 URL을 붙여넣기 하세요" value={config.specificPostUrl} onChange={e => set({ specificPostUrl: e.target.value })} style={{ marginTop: 8 }} />
                  )}
                </div>
              </>
            )}

            <div className="fb-field">
              <label>키워드</label>
              <input className="fb-input" placeholder='예: 가격, 예약, 링크 (쉼표로 구분)' value={config.keywords} onChange={e => set({ keywords: e.target.value })} />
              <div className="fb-field-hint">비워두면 모든 {config.triggerType === 'comment' ? '댓글' : '메시지'}에 반응합니다</div>
            </div>

            <div className="fb-field">
              <label>키워드 매칭</label>
              <select className="fb-select" value={config.keywordMatch} onChange={e => set({ keywordMatch: e.target.value })}>
                <option value="CONTAINS">포함</option>
                <option value="EXACT">정확히 일치</option>
                <option value="ANY">모든 댓글</option>
              </select>
            </div>

            <div className="fb-field">
              <label>제외 키워드 (선택)</label>
              <input className="fb-input" placeholder="이 키워드가 포함된 댓글은 무시" value={config.excludeKeywords} onChange={e => set({ excludeKeywords: e.target.value })} />
            </div>
          </Section>

          {/* ── 2. 공개 댓글 답장 ── */}
          {config.triggerType === 'comment' && (
            <Section
              num="2"
              title="공개 댓글 답장"
              desc="키워드 댓글 아래에 자동 답장을 남겨 다른 사람들에게도 참여를 유도합니다"
              icon="ri-chat-smile-2-line"
              color="#06B6D4"
              tourId="public-reply"
              toggle={config.publicReplyEnabled}
              onToggle={() => set({ publicReplyEnabled: !config.publicReplyEnabled })}
            >
              {config.publicReplyEnabled && (
                <div className="fb-field">
                  <label>답장 메시지 (최대 3개, 랜덤 발송)</label>
                  {config.publicReplies.map((reply, i) => (
                    <div key={i} className="fb-field-row">
                      <span className="fb-field-num">{i + 1}</span>
                      <input className="fb-input" value={reply} onChange={e => {
                        const arr = [...config.publicReplies]
                        arr[i] = e.target.value
                        set({ publicReplies: arr })
                      }} />
                      {config.publicReplies.length > 1 && (
                        <button className="fb-field-remove" onClick={() => set({ publicReplies: config.publicReplies.filter((_, j) => j !== i) })}>
                          <i className="ri-close-line" />
                        </button>
                      )}
                    </div>
                  ))}
                  {config.publicReplies.length < 3 && (
                    <button className="fb-add-btn" onClick={() => set({ publicReplies: [...config.publicReplies, ''] })}>
                      + 답장 추가
                    </button>
                  )}
                  <div className="fb-field-hint">여러 개 등록하면 랜덤으로 하나가 선택됩니다</div>
                </div>
              )}
            </Section>
          )}

          {/* ── 3. 오프닝 DM ── */}
          <Section
            num={config.triggerType === 'comment' ? '3' : '2'}
            title="오프닝 DM"
            desc="사용자에게 첫 DM이 발송됩니다. 사용자가 아래 버튼을 탭해야 Instagram 24시간 대화창이 열리고, 그 이후 단계(팔로우 확인, 링크 전달 등)가 자동 진행됩니다."
            icon="ri-message-3-line"
            color="#3B82F6"
            tourId="opening-dm"
            toggle={config.openingDmEnabled}
            onToggle={() => set({ openingDmEnabled: !config.openingDmEnabled })}
          >
            {config.openingDmEnabled && (
              <>
                <div className="fb-info-box">
                  <i className="ri-information-line" />
                  <span>Instagram 정책상, 사용자가 버튼을 탭해야 봇이 추가 메시지를 보낼 수 있습니다. 버튼 탭 = 대화 시작 동의로, 이후 24시간 동안 자동 메시지 전송이 가능해집니다.</span>
                </div>
                <div className="fb-field">
                  <label>메시지</label>
                  <textarea className="fb-textarea" rows={3} value={config.openingDmText} onChange={e => set({ openingDmText: e.target.value })}
                    placeholder="안녕하세요! 요청하신 정보를 보내드릴게요." />
                  <div className="fb-field-hint">변수 사용: {'{first_name}'}, {'{username}'}</div>
                </div>
                <div className="fb-field">
                  <label>버튼 텍스트</label>
                  <input className="fb-input" value={config.openingDmButtonText} onChange={e => set({ openingDmButtonText: e.target.value })} placeholder="링크 받기" />
                  <div className="fb-field-hint">사용자가 이 버튼을 탭하면 버튼 텍스트가 자동 전송되고, 다음 단계로 넘어갑니다</div>
                </div>
              </>
            )}
          </Section>

          {/* ── 4. 요구사항 ── */}
          <Section
            num={config.triggerType === 'comment' ? '4' : '3'}
            title="요구사항"
            desc="링크를 보내기 전에 팔로우 여부 확인이나 이메일 수집 등 조건을 추가합니다"
            icon="ri-shield-check-line"
            color="#8B5CF6"
            tourId="requirements"
          >
            {/* 팔로우 체크 */}
            <div className="fb-option-card">
              <div className="fb-option-header">
                <div className="fb-option-info">
                  <i className="ri-user-follow-line" style={{ color: '#10B981' }} />
                  <div>
                    <strong>팔로우 확인</strong>
                    <p>팔로우한 사용자에게만 DM을 보냅니다</p>
                  </div>
                </div>
                <label className="fb-live-toggle small">
                  <input type="checkbox" checked={config.followCheckEnabled} onChange={() => set({ followCheckEnabled: !config.followCheckEnabled })} />
                  <span className="fb-toggle-slider" />
                </label>
              </div>
              {config.followCheckEnabled && (
                <div className="fb-option-body">
                  <div className="fb-field">
                    <label>팔로우 안 한 사용자에게 보낼 메시지</label>
                    <textarea className="fb-textarea" rows={2} value={config.followPromptText} onChange={e => set({ followPromptText: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            {/* 이메일 수집 */}
            <div className="fb-option-card">
              <div className="fb-option-header">
                <div className="fb-option-info">
                  <i className="ri-mail-line" style={{ color: '#3B82F6' }} />
                  <div>
                    <strong>이메일 수집</strong>
                    <p>링크 전달 전 이메일 주소를 수집합니다</p>
                  </div>
                </div>
                <label className="fb-live-toggle small">
                  <input type="checkbox" checked={config.emailCollectionEnabled} onChange={() => set({ emailCollectionEnabled: !config.emailCollectionEnabled })} />
                  <span className="fb-toggle-slider" />
                </label>
              </div>
              {config.emailCollectionEnabled && (
                <div className="fb-option-body">
                  <div className="fb-field">
                    <label>이메일 요청 메시지</label>
                    <textarea className="fb-textarea" rows={2} value={config.emailPromptText} onChange={e => set({ emailPromptText: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── 5. 메인 DM (링크 포함) ── */}
          <Section
            num={config.triggerType === 'comment' ? '5' : '4'}
            title="DM 메시지 (링크 포함)"
            desc="모든 조건 충족 후 사용자에게 최종 전달되는 메시지와 링크입니다"
            icon="ri-link"
            color="#10B981"
            tourId="main-dm"
          >
            <div className="fb-field">
              <label>메시지</label>
              <textarea className="fb-textarea" rows={3} value={config.mainDmText} onChange={e => set({ mainDmText: e.target.value })}
                placeholder="여기에 메인 메시지를 입력하세요" />
            </div>
            <div className="fb-field">
              <label>링크 (최대 3개)</label>
              {config.links.map((link, i) => (
                <div key={i} className="fb-link-row">
                  <input className="fb-input" placeholder="버튼 텍스트" value={link.label} onChange={e => {
                    const arr = [...config.links]; arr[i] = { ...arr[i], label: e.target.value }; set({ links: arr })
                  }} style={{ flex: '0 0 140px' }} />
                  <input className="fb-input" placeholder="https://..." value={link.url} onChange={e => {
                    const arr = [...config.links]; arr[i] = { ...arr[i], url: e.target.value }; set({ links: arr })
                  }} />
                  {config.links.length > 1 && (
                    <button className="fb-field-remove" onClick={() => set({ links: config.links.filter((_, j) => j !== i) })}>
                      <i className="ri-close-line" />
                    </button>
                  )}
                </div>
              ))}
              {config.links.length < 3 && (
                <button className="fb-add-btn" onClick={() => set({ links: [...config.links, { label: '', url: '' }] })}>
                  + 링크 추가
                </button>
              )}
            </div>
          </Section>

          {/* ── 6. 팔로업 메시지 ── */}
          <Section
            num={config.triggerType === 'comment' ? '6' : '5'}
            title="팔로업 메시지"
            desc="일정 시간이 지나도 링크를 클릭하지 않은 사용자에게 자동으로 리마인더를 보냅니다"
            icon="ri-time-line"
            color="#F59E0B"
            tourId="followup"
            toggle={config.followUpEnabled}
            onToggle={() => set({ followUpEnabled: !config.followUpEnabled })}
          >
            {config.followUpEnabled && (
              <>
                <div className="fb-field">
                  <label>대기 시간</label>
                  <div className="fb-delay-row">
                    <input type="number" className="fb-input" value={config.followUpDelay} onChange={e => set({ followUpDelay: Number(e.target.value) })} style={{ width: 80 }} min={1} />
                    <select className="fb-select" value={config.followUpDelayUnit} onChange={e => set({ followUpDelayUnit: e.target.value })}>
                      <option value="minutes">분</option>
                      <option value="hours">시간</option>
                      <option value="days">일</option>
                    </select>
                    <span className="fb-field-hint" style={{ margin: 0 }}>후 발송</span>
                  </div>
                </div>
                <div className="fb-field">
                  <label>메시지</label>
                  <textarea className="fb-textarea" rows={3} value={config.followUpText} onChange={e => set({ followUpText: e.target.value })} />
                </div>
              </>
            )}
          </Section>

          {/* 저장 버튼 (하단) */}
          <div className="fb-wizard-footer">
            <button className="btn-secondary" onClick={() => navigate('/app/flows')}>취소</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              <i className={saving ? 'ri-loader-4-line spin' : 'ri-save-line'} />
              {saving ? '저장 중...' : isLive ? '저장 및 활성화' : '저장'}
            </button>
          </div>
        </div>

        {/* 오른쪽: 폰 프리뷰 */}
        <PhonePreview config={config} />
      </div>

      <OnboardingTour ref={tourRef} />
    </div>
  )
}

/* ── 섹션 카드 컴포넌트 ── */
function Section({ num, title, desc, icon, color, toggle, onToggle, tourId, children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="fb-section" data-tour={tourId}>
      <div className="fb-section-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="fb-section-num" style={{ background: color + '18', color }}>{num}</div>
        <div className="fb-section-info">
          <h3><i className={icon} style={{ color }} /> {title}</h3>
          <p>{desc}</p>
        </div>
        <div className="fb-section-actions">
          {onToggle && (
            <label className="fb-live-toggle small" onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={toggle} onChange={onToggle} />
              <span className="fb-toggle-slider" />
            </label>
          )}
          <i className={`ri-arrow-${collapsed ? 'down' : 'up'}-s-line fb-section-chevron`} />
        </div>
      </div>
      {!collapsed && <div className="fb-section-body">{children}</div>}
    </div>
  )
}

/* ── 인스타그램 DM 폰 프리뷰 (다크모드) ── */
function PhonePreview({ config }) {
  const msgs = []

  // 오프닝 DM (버튼은 버블 안에 포함)
  if (config.openingDmEnabled) {
    msgs.push({
      type: 'bot-bubble',
      text: config.openingDmText || '오프닝 메시지',
      buttons: config.openingDmButtonText ? [{ label: config.openingDmButtonText }] : [],
      step: '오프닝 DM',
    })
    if (config.openingDmButtonText) {
      msgs.push({ type: 'user-action', text: `"${config.openingDmButtonText}" 버튼 탭` })
    }
  }

  // 팔로우 체크 메시지
  if (config.followCheckEnabled) {
    msgs.push({
      type: 'bot-bubble',
      text: config.followPromptText || '팔로우 후 다시 시도해 주세요',
      buttons: [{ label: '팔로우 하기' }],
      step: '팔로우 확인',
    })
    msgs.push({ type: 'user-action', text: '팔로우 완료' })
  }

  // 이메일 수집
  if (config.emailCollectionEnabled) {
    msgs.push({ type: 'bot-bubble', text: config.emailPromptText || '이메일을 입력해 주세요', buttons: [], step: '이메일 수집' })
    msgs.push({ type: 'user-text', text: 'example@email.com' })
  }

  // 메인 DM + 링크 버튼들 (모두 버블 안에)
  if (config.mainDmText) {
    const linkBtns = config.links.filter(l => l.label || l.url).map(l => ({ label: l.label || '링크', url: l.url }))
    msgs.push({ type: 'bot-bubble', text: config.mainDmText, buttons: linkBtns, step: '메인 DM' })
  }

  // 팔로업
  if (config.followUpEnabled && config.followUpText) {
    msgs.push({ type: 'delay', value: config.followUpDelay, unit: config.followUpDelayUnit })
    msgs.push({ type: 'bot-bubble', text: config.followUpText, buttons: [], step: '팔로업' })
  }

  return (
    <div className="ig-preview-wrap" data-tour="preview">
      <div className="ig-phone">
        <div className="ig-phone-notch" />
        <div className="ig-screen">
          {/* 헤더 */}
          <div className="ig-header">
            <i className="ri-arrow-left-s-line" />
            <div className="ig-header-avatar">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='1' x2='1' y2='0'%3E%3Cstop stop-color='%23FCAF45'/%3E%3Cstop offset='.5' stop-color='%23FD1D1D'/%3E%3Cstop offset='1' stop-color='%23833AB4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='16' cy='16' r='16' fill='url(%23g)'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='sans-serif'%3EB%3C/text%3E%3C/svg%3E" alt="" />
            </div>
            <div className="ig-header-info">
              <strong>my_brand</strong>
              <span>Business chat</span>
            </div>
            <div className="ig-header-actions">
              <i className="ri-phone-line" />
              <i className="ri-vidicon-line" />
            </div>
          </div>

          {/* 대화 영역 */}
          <div className="ig-chat">
            <div className="ig-chat-notice">
              <i className="ri-store-2-line" /> Business chat
            </div>

            <div className="ig-timestamp">오늘</div>

            {/* 유저 시작 메시지 */}
            <div className="ig-msg-row sent">
              <div className="ig-bubble-sent">
                {config.triggerType === 'comment' ? (config.keywords || '키워드') : '안녕하세요'}
              </div>
            </div>

            {msgs.length === 0 && (
              <div className="ig-empty-hint">
                <p>설정을 완료하면 미리보기가 표시됩니다</p>
              </div>
            )}

            {msgs.map((msg, i) => {
              if (msg.type === 'bot-bubble') {
                const showAvatar = i === 0 || msgs[i-1]?.type === 'user-text' || msgs[i-1]?.type === 'user-action' || msgs[i-1]?.type === 'delay'
                return (
                  <div key={i}>
                    {msg.step && <div className="ig-step-label"><i className="ri-arrow-right-s-fill" /> {msg.step}</div>}
                    <div className="ig-msg-row received">
                      {showAvatar ? <div className="ig-avatar-small">B</div> : <div className="ig-avatar-spacer" />}
                      <div className={`ig-bubble-received${msg.buttons?.length ? ' has-buttons' : ''}`}>
                        <div className="ig-bubble-text">{msg.text}</div>
                        {msg.buttons?.length > 0 && (
                          <div className="ig-bubble-buttons">
                            {msg.buttons.map((btn, j) => (
                              <div key={j} className="ig-bubble-btn">
                                {btn.url && <i className="ri-external-link-line" />}
                                {btn.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
              if (msg.type === 'user-action') {
                return (
                  <div key={i} className="ig-user-action">
                    <i className="ri-cursor-line" /> {msg.text}
                  </div>
                )
              }
              if (msg.type === 'user-text') {
                return (
                  <div key={i} className="ig-msg-row sent">
                    <div className="ig-bubble-sent">{msg.text}</div>
                  </div>
                )
              }
              if (msg.type === 'delay') {
                const unitLabel = msg.unit === 'minutes' ? '분' : msg.unit === 'hours' ? '시간' : '일'
                return (
                  <div key={i} className="ig-delay-badge">
                    <i className="ri-time-line" /> {msg.value}{unitLabel} 후
                  </div>
                )
              }
              return null
            })}
          </div>

          {/* 하단 입력 */}
          <div className="ig-input-bar">
            <div className="ig-input-camera"><i className="ri-camera-line" /></div>
            <div className="ig-input-field">Message...</div>
            <div className="ig-input-icons">
              <i className="ri-mic-line" />
              <i className="ri-image-line" />
              <i className="ri-sticker-line" />
            </div>
          </div>
        </div>
      </div>

      {/* 공개 댓글 프리뷰 */}
      {config.triggerType === 'comment' && config.publicReplyEnabled && config.publicReplies[0] && (
        <div className="fb-comment-preview">
          <h4><i className="ri-chat-3-line" /> 공개 댓글 답장 미리보기</h4>
          <div className="fb-comment-preview-body">
            <div className="fb-comment-item">
              <div className="fb-comment-avatar">U</div>
              <div>
                <strong>@user</strong>
                <p>{config.keywords || '키워드'}</p>
              </div>
            </div>
            <div className="fb-comment-item reply">
              <div className="fb-comment-avatar brand">B</div>
              <div>
                <strong>@my_brand</strong>
                <p>{config.publicReplies[0]}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
