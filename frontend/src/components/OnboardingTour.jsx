import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'

const STEPS = [
  {
    selector: '[data-tour="flow-name"]',
    icon: 'ri-edit-line',
    title: '자동화 이름',
    desc: '자동화의 이름을 설정하세요. 나중에 목록에서 쉽게 찾을 수 있도록 알아보기 쉬운 이름을 입력해 주세요.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="flow-guide"]',
    icon: 'ri-route-line',
    title: '자동화 동작 흐름',
    desc: '현재 설정한 자동화가 어떤 순서로 작동하는지 한눈에 보여줍니다. 아래에서 설정을 변경하면 이 흐름도 자동으로 업데이트돼요.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="trigger"]',
    icon: 'ri-flashlight-line',
    title: '트리거 설정',
    desc: '자동화가 시작되는 조건을 선택하세요. 예를 들어 "게시물 댓글"을 선택하면, 누군가 게시물에 특정 키워드를 댓글로 남겼을 때 자동으로 DM이 발송됩니다.',
    placement: 'right',
  },
  {
    selector: '[data-tour="public-reply"]',
    icon: 'ri-chat-smile-2-line',
    title: '공개 댓글 답장',
    desc: '사용자가 댓글을 남기면 그 아래에 자동으로 공개 답장을 남길 수 있어요. 다른 사람들도 참여하도록 유도하는 효과가 있습니다.',
    placement: 'right',
    optional: true,
  },
  {
    selector: '[data-tour="opening-dm"]',
    icon: 'ri-message-3-line',
    title: '오프닝 DM',
    desc: '사용자에게 보내는 첫 번째 DM이에요. 버튼을 포함해서 보내면, 사용자가 버튼을 탭했을 때 24시간 대화창이 열리고 다음 단계로 진행됩니다.',
    placement: 'right',
  },
  {
    selector: '[data-tour="requirements"]',
    icon: 'ri-shield-check-line',
    title: '요구사항',
    desc: '링크를 보내기 전에 조건을 추가할 수 있어요. 팔로우를 했는지 확인하거나, 이메일을 먼저 수집한 후에 링크를 전달할 수 있습니다.',
    placement: 'right',
  },
  {
    selector: '[data-tour="main-dm"]',
    icon: 'ri-link',
    title: 'DM 메시지 (링크 포함)',
    desc: '모든 조건을 충족한 사용자에게 최종적으로 전달되는 메시지입니다. 여기에 공유하고 싶은 링크를 최대 3개까지 버튼으로 추가할 수 있어요.',
    placement: 'right',
  },
  {
    selector: '[data-tour="followup"]',
    icon: 'ri-time-line',
    title: '팔로업 메시지',
    desc: '일정 시간이 지나도 링크를 클릭하지 않은 사용자에게 자동으로 리마인더를 보냅니다. 전환율을 높이는 데 효과적이에요!',
    placement: 'right',
  },
  {
    selector: '[data-tour="preview"]',
    icon: 'ri-smartphone-line',
    title: '실시간 미리보기',
    desc: '왼쪽에서 설정을 변경하면 여기에 실제 인스타그램 DM이 어떻게 보이는지 바로 확인할 수 있어요. 실시간으로 업데이트됩니다!',
    placement: 'left',
  },
  {
    selector: '[data-tour="header-actions"]',
    icon: 'ri-save-line',
    title: '저장 및 활성화',
    desc: '설정을 모두 마쳤다면 저장 버튼을 눌러주세요. Live 토글을 켜면 저장과 동시에 자동화가 바로 활성화됩니다!',
    placement: 'bottom',
  },
]

const STORAGE_KEY = 'onboarding_flow-builder_completed'

const OnboardingTour = forwardRef(function OnboardingTour(props, ref) {
  const [phase, setPhase] = useState('idle') // idle | welcome | touring | done
  const [step, setStep] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState(null)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const [placement, setPlacement] = useState('bottom')
  const rafRef = useRef(null)

  // Expose restart method to parent
  useImperativeHandle(ref, () => ({
    restart() {
      localStorage.removeItem(STORAGE_KEY)
      setStep(0)
      setSpotlightRect(null)
      setPhase('welcome')
    }
  }))

  // Check if tour already completed
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY)
    if (!completed) {
      const timer = setTimeout(() => setPhase('welcome'), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  // Get visible steps (skip optional steps whose targets don't exist)
  const getVisibleSteps = useCallback(() => {
    return STEPS.filter(s => {
      if (s.optional && !document.querySelector(s.selector)) return false
      return true
    })
  }, [])

  // Position spotlight and tooltip for current step
  const positionStep = useCallback(() => {
    const visibleSteps = getVisibleSteps()
    const currentStep = visibleSteps[step]
    if (!currentStep) return

    const el = document.querySelector(currentStep.selector)
    if (!el) {
      // Skip missing elements
      if (step < visibleSteps.length - 1) setStep(step + 1)
      return
    }

    // Scroll into view within wizard container
    const wizard = document.querySelector('.fb-wizard')
    if (wizard && wizard.contains(el)) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Measure after scroll settles
    const measure = () => {
      const rect = el.getBoundingClientRect()
      const pad = 8
      setSpotlightRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      })

      // Tooltip positioning
      const tooltipW = 340
      const tooltipH = 260
      const gap = 16
      let pref = currentStep.placement
      let t = {}, finalPlacement = pref

      if (pref === 'bottom' && rect.bottom + gap + tooltipH < window.innerHeight) {
        t = { top: rect.bottom + gap, left: Math.max(12, Math.min(rect.left, window.innerWidth - tooltipW - 12)) }
      } else if (pref === 'top' && rect.top - gap - tooltipH > 0) {
        t = { top: rect.top - gap - tooltipH, left: Math.max(12, Math.min(rect.left, window.innerWidth - tooltipW - 12)) }
      } else if (pref === 'right' && rect.right + gap + tooltipW < window.innerWidth) {
        t = { top: Math.max(12, rect.top), left: rect.right + gap }
        finalPlacement = 'right'
      } else if (pref === 'left' && rect.left - gap - tooltipW > 0) {
        t = { top: Math.max(12, rect.top), left: rect.left - gap - tooltipW }
        finalPlacement = 'left'
      } else {
        // Fallback: bottom
        t = { top: rect.bottom + gap, left: Math.max(12, Math.min(rect.left, window.innerWidth - tooltipW - 12)) }
        finalPlacement = 'bottom'
      }

      // Clamp vertical
      if (t.top + tooltipH > window.innerHeight - 12) {
        t.top = window.innerHeight - tooltipH - 12
      }
      if (t.top < 12) t.top = 12

      setTooltipStyle(t)
      setPlacement(finalPlacement)
    }

    // Delay to let scroll finish
    setTimeout(measure, 350)
  }, [step, getVisibleSteps])

  useEffect(() => {
    if (phase !== 'touring') return
    positionStep()

    const handleResize = () => positionStep()
    window.addEventListener('resize', handleResize)

    const wizard = document.querySelector('.fb-wizard')
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(positionStep)
    }
    if (wizard) wizard.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (wizard) wizard.removeEventListener('scroll', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [phase, positionStep])

  // Keyboard support
  useEffect(() => {
    if (phase !== 'touring') return
    const handleKey = (e) => {
      if (e.key === 'Escape') handleSkip()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const handleStart = () => {
    setPhase('touring')
    setStep(0)
  }

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setPhase('done')
  }

  const handleNext = () => {
    const visibleSteps = getVisibleSteps()
    if (step >= visibleSteps.length - 1) {
      handleSkip()
    } else {
      setStep(step + 1)
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  if (phase === 'done' || phase === 'idle') return null

  const visibleSteps = getVisibleSteps()
  const currentStepData = visibleSteps[step]

  return createPortal(
    <>
      {phase === 'welcome' && (
        <div className="onboarding-welcome">
          <div className="onboarding-welcome-card">
            <div className="onboarding-welcome-icon">
              <i className="ri-magic-line" />
            </div>
            <h2>자동화 빌더에 오신 것을 환영합니다!</h2>
            <p>
              인스타그램 댓글이나 DM에 자동으로 응답하는 자동화를 만들어보세요.
              간단한 가이드로 각 기능을 설명해 드릴게요.
            </p>
            <div className="onboarding-welcome-actions">
              <button className="onboarding-btn-skip" onClick={handleSkip}>
                건너뛰기
              </button>
              <button className="onboarding-btn-next" onClick={handleStart}>
                시작하기 <i className="ri-arrow-right-line" style={{ marginLeft: 4 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'touring' && spotlightRect && (
        <>
          <div className="onboarding-backdrop" onClick={handleSkip} />
          <div
            className="onboarding-spotlight"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
          />
          <div
            className="onboarding-tooltip"
            data-placement={placement}
            style={tooltipStyle}
          >
            <div className="onboarding-dots">
              {visibleSteps.map((_, i) => (
                <div
                  key={i}
                  className={`onboarding-dot${i === step ? ' active' : i < step ? ' done' : ''}`}
                />
              ))}
            </div>
            <div className="onboarding-step-icon">
              <i className={currentStepData.icon} />
            </div>
            <div className="onboarding-title">{currentStepData.title}</div>
            <div className="onboarding-desc">{currentStepData.desc}</div>
            <div className="onboarding-footer">
              <span className="onboarding-indicator">{step + 1} / {visibleSteps.length}</span>
              <div className="onboarding-actions">
                <button className="onboarding-btn-skip" onClick={handleSkip}>
                  건너뛰기
                </button>
                {step > 0 && (
                  <button className="onboarding-btn-prev" onClick={handlePrev}>
                    이전
                  </button>
                )}
                <button className="onboarding-btn-next" onClick={handleNext}>
                  {step === visibleSteps.length - 1 ? '완료' : '다음'}
                  {step < visibleSteps.length - 1 && <i className="ri-arrow-right-s-line" style={{ marginLeft: 2 }} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  )
})

export default OnboardingTour
