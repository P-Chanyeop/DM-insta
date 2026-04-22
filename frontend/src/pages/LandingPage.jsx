import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getToken } from '../api/client'

const FEATURES = [
  { icon: 'ri-flow-chart', color: 'blue', title: '비주얼 플로우 빌더', desc: '드래그 앤 드롭으로 복잡한 자동화 시나리오를 코딩 없이 쉽게 만들어보세요.', items: ['드래그 앤 드롭 에디터', '조건 분기 / A-B 테스트', '메시지, 카드, 갤러리, 이미지', '외부 API 연동 (웹훅)'] },
  { icon: 'ri-message-3-line', color: 'purple', title: 'DM 키워드 자동응답', desc: '고객이 DM으로 특정 키워드를 보내면 자동으로 맞춤 메시지를 발송합니다.', items: ['무제한 키워드 등록', '정확/포함 일치 설정', '키워드별 다른 플로우 연결', '우선순위 설정'] },
  { icon: 'ri-chat-smile-3-line', color: 'green', title: '댓글 자동 응답', desc: '게시물에 특정 키워드로 댓글을 달면 자동으로 DM을 발송합니다.', items: ['게시물별 트리거 설정', '댓글 키워드 감지', '댓글 + DM 동시 응답', '자동 좋아요 기능'] },
  { icon: 'ri-camera-lens-line', color: 'orange', title: '스토리 멘션 자동화', desc: '누군가 스토리에서 당신을 멘션하면 자동으로 감사 DM을 보냅니다.', items: ['스토리 멘션 감지', '스토리 답장 자동화', '맞춤 감사 메시지', '자동 리포스트 안내'] },
  { icon: 'ri-hand-heart-line', color: 'pink', title: '환영 메시지 & 아이스브레이커', desc: '새로운 팔로워가 처음 메시지를 보내면 환영 메시지와 대화 시작 버튼을 제공합니다.', items: ['첫 메시지 환영 인사', '아이스브레이커 버튼', '빠른 답장 버튼', '신규 팔로워 자동 태깅'] },
  { icon: 'ri-live-line', color: 'teal', title: '라이브 채팅', desc: '자동화와 수동 대화를 자유롭게 전환하세요. 팀원 배정, 메모, 대화 상태 관리.', items: ['실시간 대화 관리', '자동화 일시정지/재개', '팀원 배정 & 메모', '대화 상태 태그'] },
  { icon: 'ri-broadcast-line', color: 'red', title: '브로드캐스팅', desc: '구독자에게 대량 DM을 발송하세요. 세그먼트별 타겟팅, 예약 발송, A/B 테스트.', items: ['대량 DM 발송', '세그먼트 타겟팅', '예약 발송', 'A/B 테스트'] },
  { icon: 'ri-line-chart-line', color: 'indigo', title: '분석 & 통계', desc: '모든 자동화의 성과를 실시간으로 추적하세요. 핵심 지표를 한눈에 확인합니다.', items: ['실시간 대시보드', '플로우별 성과 분석', '전환 퍼널 추적', 'CSV 리포트 내보내기'] },
  { icon: 'ri-contacts-book-2-line', color: 'cyan', title: '연락처 & CRM', desc: '모든 구독자를 한 곳에서 관리하세요. 태그, 커스텀 필드, 세그먼트로 분류.', items: ['연락처 자동 수집', '태그 & 커스텀 필드', '세그먼트 필터링', '구독자 프로필 관리'] },
]

const TEMPLATES = [
  { icon: 'ri-store-2-line', bg: 'linear-gradient(135deg, #FF6B9D, #C44AFF)', title: '쇼핑몰 상품 안내', desc: '댓글에 "가격" 입력 시 자동으로 상품 카탈로그와 구매 링크를 DM으로 발송', popular: true },
  { icon: 'ri-calendar-check-line', bg: 'linear-gradient(135deg, #4FACFE, #00F2FE)', title: '예약 접수 자동화', desc: 'DM으로 예약 일정, 시간, 인원을 자동으로 수집하고 확인 메시지를 발송' },
  { icon: 'ri-gift-line', bg: 'linear-gradient(135deg, #43E97B, #38F9D7)', title: '이벤트/프로모션', desc: '게시물 댓글 참여 시 자동 DM으로 쿠폰 코드 발급 및 이벤트 안내' },
  { icon: 'ri-customer-service-2-line', bg: 'linear-gradient(135deg, #FA709A, #FEE140)', title: '고객 상담 봇', desc: 'FAQ 기반 자동 응답 + 복잡한 문의는 담당자에게 자동 배정하는 하이브리드 봇' },
  { icon: 'ri-user-star-line', bg: 'linear-gradient(135deg, #A18CD1, #FBC2EB)', title: '리드 수집', desc: '관심 고객의 이름, 연락처, 관심사를 자동으로 수집하고 CRM에 저장' },
  { icon: 'ri-megaphone-line', bg: 'linear-gradient(135deg, #667EEA, #764BA2)', title: '스토리 멘션 감사', desc: '스토리에서 멘션해준 고객에게 자동으로 감사 메시지와 할인 코드를 발송' },
]

const USE_CASES = [
  { icon: 'ri-store-2-line', color: 'blue', title: '쇼핑몰 운영자', desc: '댓글로 가격 문의가 쏟아질 때, 자동으로 DM 발송하여 상담 시간을 절약하세요.' },
  { icon: 'ri-scissors-line', color: 'green', title: '예약 기반 매장', desc: 'DM으로 예약 날짜/시간을 자동 수집하여 전화 응대 부담을 줄이세요.' },
  { icon: 'ri-megaphone-line', color: 'purple', title: '마케팅 에이전시', desc: '여러 고객 계정의 DM 자동화를 한국어 인터페이스로 쉽게 관리하세요.' },
]

const FOOTER_PRODUCT_LINKS = {
  '기능 소개': '#features',
  '플로우 빌더': '#features',
  '자동화 트리거': '#automation',
  '라이브 채팅': '#features',
  '브로드캐스팅': '#features',
  '분석': '#features',
}

const FOOTER_RESOURCE_LINKS = {
  '도움말 센터': '/login',
  '블로그': '/login',
  'API 문서': '/login',
  '템플릿 갤러리': '#templates',
  '웨비나': '/login',
  '커뮤니티': '/login',
}

const FOOTER_COMPANY_LINKS = {
  '회사 소개': '/login',
  '채용': '/login',
  '이용약관': '/terms',
  '개인정보처리방침': '/privacy',
  '파트너십': '/login',
  '문의하기': '/login',
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [isAnnual, setIsAnnual] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToSection = (e, hash) => {
    e.preventDefault()
    setMobileMenu(false)
    const el = document.querySelector(hash)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Update URL hash without jumping
      window.history.pushState(null, '', hash)
    }
  }

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <a href="/" className="logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <img src="/images/sendit_03_icon_gradient.png" alt="센드잇" className="logo-img" />
            <span className="logo-text">센드잇</span>
          </a>
          <ul className="nav-links">
            <li><a href="#features" onClick={(e) => scrollToSection(e, '#features')}>기능</a></li>
            <li><a href="#automation" onClick={(e) => scrollToSection(e, '#automation')}>자동화</a></li>
            <li><a href="#pricing" onClick={(e) => scrollToSection(e, '#pricing')}>요금제</a></li>
            <li><a href="#templates" onClick={(e) => scrollToSection(e, '#templates')}>템플릿</a></li>
            <li><a href="#testimonials" onClick={(e) => scrollToSection(e, '#testimonials')}>활용 사례</a></li>
          </ul>
          <div className="nav-actions">
            {getToken() ? (
              <Link to="/app" className="btn-start">대시보드</Link>
            ) : (
              <>
                <Link to="/login" className="btn-login">로그인</Link>
                <Link to="/signup" className="btn-start">무료로 시작하기</Link>
              </>
            )}
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenu(!mobileMenu)}>
            <i className={mobileMenu ? 'ri-close-line' : 'ri-menu-3-line'} />
          </button>
        </div>
        {mobileMenu && (
          <div className="mobile-menu active">
            <ul>
              <li><a href="#features" onClick={(e) => scrollToSection(e, '#features')}>기능</a></li>
              <li><a href="#automation" onClick={(e) => scrollToSection(e, '#automation')}>자동화</a></li>
              <li><a href="#pricing" onClick={(e) => scrollToSection(e, '#pricing')}>요금제</a></li>
              <li><a href="#templates" onClick={(e) => scrollToSection(e, '#templates')}>템플릿</a></li>
              <li><a href="#testimonials" onClick={(e) => scrollToSection(e, '#testimonials')}>활용 사례</a></li>
            </ul>
            <div className="mobile-menu-actions">
              {getToken() ? (
                <Link to="/app" className="btn-start" onClick={() => setMobileMenu(false)}>대시보드</Link>
              ) : (
                <>
                  <Link to="/login" className="btn-login" onClick={() => setMobileMenu(false)}>로그인</Link>
                  <Link to="/signup" className="btn-start" onClick={() => setMobileMenu(false)}>무료로 시작하기</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-shapes">
          <div className="shape shape-1" /><div className="shape shape-2" /><div className="shape shape-3" />
        </div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge"><i className="ri-rocket-2-line" /><span>인스타그램 마케팅의 새로운 기준</span></div>
            <h1>인스타그램 DM 자동화로<br /><span className="gradient-text">매출 성장</span>을 시작하세요</h1>
            <p className="hero-desc">댓글 자동 응답, DM 키워드 트리거, 스토리 멘션 자동화, 환영 메시지까지.<br />코딩 없이 5분 만에 설정하는 인스타그램 마케팅 자동화 플랫폼</p>
            <div className="hero-cta">
              <Link to="/signup" className="btn-primary lg"><i className="ri-play-circle-line" /> 무료로 시작하기</Link>
              <a href="#automation" className="btn-outline lg" onClick={(e) => scrollToSection(e, '#automation')}><i className="ri-video-line" /> 데모 보기</a>
            </div>
            <div className="hero-trust">
              <div className="trust-features">
                <span><i className="ri-check-line" /> 무료 플랜 제공</span>
                <span><i className="ri-check-line" /> 카드 정보 불필요</span>
                <span><i className="ri-check-line" /> 5분 만에 설정</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="phone-mockup">
              <div className="phone-frame">
                <div className="phone-notch" />
                <div className="phone-screen">
                  <div className="ig-header">
                    <i className="ri-arrow-left-s-line" />
                    <div className="ig-user"><div className="ig-avatar-small" /><span>센드잇</span></div>
                    <i className="ri-phone-line" />
                  </div>
                  <div className="ig-chat">
                    <div className="ig-msg received"><p>안녕하세요! 가격표 받고 싶어요!</p></div>
                    <div className="ig-msg sent">
                      <div className="auto-badge"><i className="ri-robot-2-line" /> 자동응답</div>
                      <p>안녕하세요! 반갑습니다 :)</p>
                    </div>
                    <div className="ig-msg sent">
                      <p>가격표를 보내드릴게요!</p>
                      <div className="ig-card">
                        <div className="ig-card-img"><i className="ri-file-list-3-line" /></div>
                        <div className="ig-card-body"><strong>2024 가격표</strong><span>PDF 다운로드</span></div>
                        <button>받기</button>
                      </div>
                    </div>
                    <div className="ig-msg sent"><p>추가 문의사항이 있으시면 편하게 말씀해주세요!</p></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-stat stat-1">
              <div className="stat-icon green"><i className="ri-message-3-line" /></div>
              <div><div className="stat-value">24/7</div><div className="stat-label">자동 응답</div></div>
            </div>
            <div className="floating-stat stat-2">
              <div className="stat-icon blue"><i className="ri-flashlight-line" /></div>
              <div><div className="stat-value">5분</div><div className="stat-label">초기 설정</div></div>
            </div>
            <div className="floating-stat stat-3">
              <div className="stat-icon purple"><i className="ri-robot-2-line" /></div>
              <div><div className="stat-value">코딩 0</div><div className="stat-label">노코드 플랫폼</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Summary */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <StatCard value="9" suffix="+" label="자동화 기능" />
            <StatCard value="6" suffix="종" label="업종별 템플릿" />
            <StatCard value="24" suffix="/7" label="자동 응답 지원" />
            <StatCard value="0" suffix="원" label="무료 플랜 시작" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">주요 기능</div>
            <h2>인스타그램 마케팅에 필요한<br /><span className="gradient-text">모든 것</span>을 한 곳에서</h2>
            <p>인스타그램 DM 자동화에 필요한 모든 기능을 한국어로, 쉽고 직관적으로</p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div className="feature-card" key={f.title}>
                <div className={`feature-icon ${f.color}`}><i className={f.icon} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <ul className="feature-list">
                  {f.items.map(item => <li key={item}><i className="ri-check-line" />{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section" id="automation">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">작동 방식</div>
            <h2>3단계로 완성하는<br /><span className="gradient-text">인스타그램 자동화</span></h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon"><i className="ri-instagram-line" /></div>
              <h3>인스타그램 계정 연결</h3>
              <p>비즈니스 계정을 연결하면 즉시 모든 기능을 사용할 수 있습니다.</p>
            </div>
            <div className="step-connector"><i className="ri-arrow-right-line" /></div>
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon"><i className="ri-flow-chart" /></div>
              <h3>자동화 플로우 설정</h3>
              <p>템플릿을 선택하거나 플로우 빌더로 나만의 자동화를 만드세요.</p>
            </div>
            <div className="step-connector"><i className="ri-arrow-right-line" /></div>
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon"><i className="ri-rocket-2-line" /></div>
              <h3>자동화 실행 & 분석</h3>
              <p>자동화를 활성화하면 24시간 자동으로 운영됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="templates-section" id="templates">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">템플릿</div>
            <h2>바로 사용 가능한<br /><span className="gradient-text">업종별 템플릿</span></h2>
            <p>검증된 자동화 템플릿으로 5분 만에 시작하세요</p>
          </div>
          <div className="templates-grid">
            {TEMPLATES.map(t => (
              <div className="template-card" key={t.title}>
                <div className="template-icon" style={{background: t.bg}}><i className={t.icon} /></div>
                {t.popular && <div className="template-badge-tag">인기</div>}
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
                <div className="template-stats">
                  <span><i className="ri-eye-line" /> 미리보기</span>
                  <Link to="/signup" style={{ color: 'inherit', textDecoration: 'none' }}><i className="ri-download-2-line" /> 바로 사용</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section" id="pricing">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">요금제</div>
            <h2>비즈니스 규모에 맞는<br /><span className="gradient-text">합리적인 요금제</span></h2>
            <p>무료로 시작하고, 성장에 따라 업그레이드하세요</p>
            <div className="billing-toggle">
              <span className={!isAnnual ? 'active-label' : ''}>월간 결제</span>
              <button className={`billing-toggle-switch ${isAnnual ? 'active' : ''}`} onClick={() => setIsAnnual(!isAnnual)} />
              <span className={isAnnual ? 'active-label' : ''}>연간 결제 <em>20% 할인</em></span>
            </div>
          </div>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-header"><h3>무료</h3><p>인스타그램 자동화를 처음 시작하는 분</p></div>
              <div className="price-amount"><span className="currency">&#8361;</span><span className="amount">0</span><span className="period">/월</span></div>
              <ul className="price-features">
                <li><i className="ri-check-line" /> 월 300건 DM 발송</li>
                <li><i className="ri-check-line" /> 플로우 3개</li>
                <li><i className="ri-check-line" /> 기본 자동응답</li>
                <li><i className="ri-check-line" /> 환영 메시지</li>
                <li><i className="ri-check-line" /> 기본 분석</li>
                <li className="disabled"><i className="ri-close-line" /> 브로드캐스팅</li>
                <li className="disabled"><i className="ri-close-line" /> AI 자동 응답</li>
              </ul>
              <Link to="/signup" className="btn-price">무료로 시작하기</Link>
            </div>
            <div className="price-card">
              <div className="price-header"><h3>스타터</h3><p>소규모 쇼핑몰 & 크리에이터</p></div>
              <div className="price-amount"><span className="currency">&#8361;</span><span className="amount">{isAnnual ? '15,920' : '19,900'}</span><span className="period">/월</span></div>
              <ul className="price-features">
                <li><i className="ri-check-line" /> 월 3,000건 DM 발송</li>
                <li><i className="ri-check-line" /> 플로우 5개</li>
                <li><i className="ri-check-line" /> Instagram 계정 2개</li>
                <li><i className="ri-check-line" /> 팀 멤버 2명</li>
                <li><i className="ri-check-line" /> 브로드캐스팅</li>
                <li><i className="ri-check-line" /> 센드잇 브랜딩 제거</li>
                <li className="disabled"><i className="ri-close-line" /> AI 자동 응답</li>
              </ul>
              <Link to="/signup" className="btn-price">스타터 시작하기</Link>
            </div>
            <div className="price-card popular">
              <div className="popular-badge">가장 인기</div>
              <div className="price-header"><h3>프로</h3><p>본격적으로 인스타 마케팅을 하는 사업자</p></div>
              <div className="price-amount"><span className="currency">&#8361;</span><span className="amount">{isAnnual ? '39,920' : '49,900'}</span><span className="period">/월</span></div>
              <ul className="price-features">
                <li><i className="ri-check-line" /> 월 30,000건 DM 발송</li>
                <li><i className="ri-check-line" /> 무제한 플로우 & 자동화</li>
                <li><i className="ri-check-line" /> Instagram 계정 5개</li>
                <li><i className="ri-check-line" /> 팀 멤버 5명</li>
                <li><i className="ri-check-line" /> AI 자동 응답</li>
                <li><i className="ri-check-line" /> 시퀀스 & A/B 테스트</li>
                <li><i className="ri-check-line" /> 고급 분석</li>
              </ul>
              <Link to="/signup" className="btn-price primary">프로 시작하기</Link>
            </div>
            <div className="price-card">
              <div className="price-header"><h3>비즈니스</h3><p>대규모 운영과 팀 협업이 필요한 기업</p></div>
              <div className="price-amount"><span className="currency">&#8361;</span><span className="amount">{isAnnual ? '119,920' : '149,900'}</span><span className="period">/월</span></div>
              <ul className="price-features">
                <li><i className="ri-check-line" /> 무제한 DM 발송</li>
                <li><i className="ri-check-line" /> 무제한 플로우 & 자동화</li>
                <li><i className="ri-check-line" /> 무제한 계정 & 팀</li>
                <li><i className="ri-check-line" /> API & Webhook 접근</li>
                <li><i className="ri-check-line" /> 전담 매니저</li>
                <li><i className="ri-check-line" /> 우선 지원 & SLA 보장</li>
                <li><i className="ri-check-line" /> 온보딩 지원</li>
              </ul>
              <Link to="/contact" className="btn-price">영업팀 문의</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="testimonials-section" id="testimonials">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">활용 사례</div>
            <h2>이런 분들에게<br /><span className="gradient-text">딱 맞는 서비스</span></h2>
          </div>
          <div className="testimonials-grid">
            {USE_CASES.map(u => (
              <div className="testimonial-card" key={u.title}>
                <div className={`feature-icon ${u.color}`} style={{marginBottom: 16}}><i className={u.icon} /></div>
                <h3 style={{fontSize: 18, fontWeight: 700, marginBottom: 8}}>{u.title}</h3>
                <p>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-bg-shapes"><div className="cta-shape cta-shape-1" /><div className="cta-shape cta-shape-2" /></div>
            <h2>지금 바로 인스타그램<br />자동화를 시작하세요</h2>
            <p>무료 플랜으로 시작하고, 비즈니스가 성장하면 업그레이드하세요.<br />카드 정보 없이 바로 시작할 수 있습니다.</p>
            <div className="cta-actions">
              <Link to="/signup" className="btn-primary lg"><i className="ri-rocket-2-line" /> 무료로 시작하기</Link>
            </div>
            <div className="cta-features">
              <span><i className="ri-check-line" /> 카드 정보 불필요</span>
              <span><i className="ri-check-line" /> 5분 만에 설정 완료</span>
              <span><i className="ri-check-line" /> 언제든 해지 가능</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="/" className="logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                <img src="/images/sendit_03_icon_gradient.png" alt="센드잇" className="logo-img" />
                <span className="logo-text">센드잇</span>
              </a>
              <p>인스타그램 마케팅 자동화의 새로운 기준.<br/>한국 사업자를 위한 최고의 DM 자동화 플랫폼</p>
              <div className="footer-social">
                <a href="https://instagram.com/instabot_kr" target="_blank" rel="noopener noreferrer" title="Instagram"><i className="ri-instagram-line"/></a>
                <a href="https://youtube.com/@instabot_kr" target="_blank" rel="noopener noreferrer" title="YouTube"><i className="ri-youtube-line"/></a>
                <a href="https://open.kakao.com/instabot" target="_blank" rel="noopener noreferrer" title="KakaoTalk"><i className="ri-kakao-talk-fill"/></a>
              </div>
            </div>
            <div className="footer-links">
              <h4>제품</h4>
              <ul>
                {Object.entries(FOOTER_PRODUCT_LINKS).map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      onClick={(e) => {
                        if (href.startsWith('#')) {
                          scrollToSection(e, href)
                        }
                      }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer-links">
              <h4>리소스</h4>
              <ul>
                {Object.entries(FOOTER_RESOURCE_LINKS).map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith('#') ? (
                      <a href={href} onClick={(e) => scrollToSection(e, href)}>{label}</a>
                    ) : (
                      <Link to={href}>{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer-links">
              <h4>회사</h4>
              <ul>
                {Object.entries(FOOTER_COMPANY_LINKS).map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith('/terms') || href.startsWith('/privacy') ? (
                      <Link to={href} target="_blank" rel="noopener noreferrer">{label}</Link>
                    ) : (
                      <Link to={href}>{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* 사업자/법적 고지 — 전자상거래법 제13조 필수 기재사항 */}
          <div className="footer-company-info">
            <dl>
              <dt>상호</dt><dd>소프트캣</dd>
              <dt>대표</dt><dd>박찬엽</dd>
              <dt>사업자등록번호</dt><dd>292-56-00756</dd>
              <dt>통신판매업 신고번호</dt><dd>제 2025-고양덕양구-0992호</dd>
              <dt>주소</dt><dd>경기도 고양시 덕양구 원흥3로 16, 904호</dd>
              <dt>고객센터</dt>
              <dd>
                <a href="tel:01044147579">010-4414-7579</a>
                <span className="footer-hours"> · 평일 09:00 ~ 18:00 (주말·공휴일 휴무)</span>
              </dd>
              <dt>이메일</dt><dd><a href="mailto:oracle7579@gmail.com">oracle7579@gmail.com</a></dd>
              <dt>개인정보 보호책임자</dt><dd>박찬엽 (oracle7579@gmail.com)</dd>
            </dl>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 센드잇. All rights reserved.</p>
            <div className="footer-badges">
              <span><i className="ri-shield-check-line"/> SSL 보안</span>
              <span><i className="ri-instagram-line"/> Instagram API 연동</span>
              <span><i className="ri-lock-line"/> GDPR 준수</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatCard({ value, suffix, label }) {
  return (
    <div className="stat-card">
      <span className="stat-number">{value}</span>
      <span className="stat-suffix">{suffix}</span>
      <div className="stat-desc">{label}</div>
    </div>
  )
}
