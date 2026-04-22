import { useState, useMemo } from 'react'

const CATEGORIES = [
  { id: '전체', icon: 'ri-apps-line', color: '#6366f1' },
  { id: '시작하기', icon: 'ri-rocket-line', color: '#3b82f6' },
  { id: '기능', icon: 'ri-settings-3-line', color: '#10b981' },
  { id: '결제', icon: 'ri-bank-card-line', color: '#f59e0b' },
  { id: '기타', icon: 'ri-question-line', color: '#8b5cf6' },
]

const FAQ_DATA = [
  {
    category: '시작하기',
    icon: 'ri-questionnaire-line',
    question: '센드잇이란 무엇인가요?',
    answer: '센드잇은 Instagram DM 자동화 SaaS입니다. 댓글·DM 키워드에 자동 응답하는 플로우, 일괄 DM 발송(브로드캐스트), 시간차 발송(시퀀스), 실시간 채팅(라이브챗) 등 Instagram 마케팅에 필요한 모든 기능을 제공합니다.',
  },
  {
    category: '시작하기',
    icon: 'ri-instagram-line',
    question: 'Instagram 계정 연결은 어떻게 하나요?',
    answer: '설정 > 연동 메뉴에서 "Instagram 연결" 버튼을 클릭하세요. Facebook 비즈니스 페이지와 연결된 Instagram Professional 계정(비즈니스 또는 크리에이터)이 필요합니다. 안내에 따라 Facebook 로그인 후 권한을 승인하면 자동으로 연결됩니다.',
  },
  {
    category: '시작하기',
    icon: 'ri-gift-line',
    question: '무료 플랜으로 어떤 기능을 사용할 수 있나요?',
    answer: 'FREE 플랜에서는 월 300건 DM 발송, 플로우 3개 생성, 연락처 100명 관리, 라이브챗 기본 기능을 사용할 수 있습니다. 브로드캐스트와 시퀀스는 STARTER 플랜부터 이용 가능합니다.',
  },
  {
    category: '기능',
    icon: 'ri-flow-chart',
    question: '플로우는 어떻게 만드나요?',
    answer: '자동화 플로우 메뉴에서 "새 플로우 만들기" 버튼을 클릭합니다. 트리거(댓글 키워드, DM 키워드, 스토리 반응 등)를 선택하고, 드래그앤드롭 빌더에서 메시지 전송, 조건 분기, 지연 등 노드를 연결하여 자동화 흐름을 완성하세요.',
  },
  {
    category: '기능',
    icon: 'ri-broadcast-line',
    question: '브로드캐스트와 시퀀스의 차이는 무엇인가요?',
    answer: '브로드캐스트는 선택한 연락처에 한 번에 일괄 DM을 발송하는 기능입니다. 시퀀스는 미리 설정한 시간 간격(예: 1일 후, 3일 후)에 맞춰 자동으로 연속 DM을 보내는 드립 캠페인 기능입니다.',
  },
  {
    category: '기능',
    icon: 'ri-speed-line',
    question: 'DM 발송 한도는 어떻게 되나요?',
    answer: '플랜별 월간 DM 발송 한도는 다음과 같습니다:\n• FREE: 300건/월\n• STARTER: 3,000건/월\n• PRO: 30,000건/월\n• BUSINESS: 무제한\n한도를 초과하면 다음 결제 주기까지 발송이 일시 중단됩니다.',
  },
  {
    category: '기능',
    icon: 'ri-team-line',
    question: '팀원을 초대하려면 어떤 플랜이 필요하나요?',
    answer: 'PRO 플랜 이상에서 팀원 초대 기능을 사용할 수 있습니다. PRO 플랜은 최대 3명, BUSINESS 플랜은 무제한 팀원 초대가 가능합니다. 설정 > 팀 메뉴에서 이메일로 초대하세요.',
  },
  {
    category: '기능',
    icon: 'ri-check-double-line',
    question: '읽음 확인은 어떻게 작동하나요?',
    answer: 'Instagram API를 통해 상대방이 DM을 읽었는지 확인할 수 있습니다. 라이브챗 화면에서 메시지 옆에 읽음 표시가 나타나며, 브로드캐스트/시퀀스 분석에서도 열림률(읽음률)을 확인할 수 있습니다.',
  },
  {
    category: '기능',
    icon: 'ri-user-add-line',
    question: '연락처는 어떻게 수집되나요?',
    answer: '다음 경우에 연락처가 자동으로 추가됩니다:\n• DM을 보내온 사용자\n• 플로우 트리거에 반응한 사용자 (댓글, 스토리 반응 등)\n• 성장 도구를 통해 유입된 사용자\n수동으로 CSV 파일을 업로드하여 일괄 추가할 수도 있습니다.',
  },
  {
    category: '결제',
    icon: 'ri-bank-card-line',
    question: '결제는 어떤 수단을 지원하나요?',
    answer: '토스페이먼츠를 통해 국내 신용/체크카드로 결제할 수 있습니다.\n• 신용/체크카드 (Visa, Mastercard, 국내 카드)\n월간 정기결제 방식이며, 최초 결제 시 등록된 카드로 매월 자동 청구됩니다. 구독 해지는 설정 메뉴에서 언제든 가능하며, 현재 결제 주기 종료일 이후 FREE 플랜으로 전환됩니다.',
  },
  {
    category: '결제',
    icon: 'ri-exchange-line',
    question: '플랜 업그레이드/다운그레이드는 어떻게 하나요?',
    answer: '설정 > 구독 메뉴에서 원하는 플랜으로 변경할 수 있습니다. 업그레이드는 즉시 적용되며, 남은 기간에 대한 차액이 계산됩니다. 다운그레이드는 현재 결제 주기가 끝난 후 적용됩니다.',
  },
  {
    category: '기타',
    icon: 'ri-delete-bin-line',
    question: '서비스를 해지하면 데이터는 어떻게 되나요?',
    answer: '구독을 해지하면 현재 결제 주기가 끝날 때까지 서비스를 계속 이용할 수 있습니다. 이후 계정은 FREE 플랜으로 전환되며, 기존 데이터(플로우, 연락처 등)는 30일간 보존됩니다. 30일 이내에 재구독하면 모든 데이터가 복원됩니다.',
  },
  {
    category: '기타',
    icon: 'ri-customer-service-2-line',
    question: '고객 지원은 어떻게 받을 수 있나요?',
    answer: '다음 채널을 통해 지원을 받을 수 있습니다:\n• 인앱 1:1 문의 (도움말 > 1:1 문의)\n• 이메일: support@sendit.io.kr\n• 평일 10:00~18:00 운영 (주말/공휴일 제외)\nPRO 이상 플랜은 우선 응답 지원을 받습니다.',
  },
]

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [openIndex, setOpenIndex] = useState(null)

  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter(item => {
      const matchCategory = activeCategory === '전체' || item.category === activeCategory
      const matchSearch = !searchQuery ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [activeCategory, searchQuery])

  const toggleItem = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  const catCounts = useMemo(() => {
    const counts = {}
    FAQ_DATA.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1
    })
    counts['전체'] = FAQ_DATA.length
    return counts
  }, [])

  return (
    <div style={{ padding: 0 }}>
      <div className="page-header">
        <div>
          <h2>자주 묻는 질문 (FAQ)</h2>
          <p>센드잇 이용에 대해 궁금한 점을 찾아보세요.</p>
        </div>
      </div>

      {/* 검색 */}
      <div style={{
        position: 'relative', maxWidth: 480, marginBottom: 20,
        background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
      }}>
        <i className="ri-search-line" style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: '#94a3b8', fontSize: 18,
        }} />
        <input
          type="text"
          placeholder="질문을 검색하세요..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null) }}
          style={{
            width: '100%', padding: '12px 14px 12px 42px',
            border: 'none', background: 'transparent',
            fontSize: 14, color: '#1e293b', outline: 'none', borderRadius: 12,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 카테고리 카드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10, marginBottom: 24,
      }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setOpenIndex(null) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                border: isActive ? `2px solid ${cat.color}` : '1px solid #e2e8f0',
                background: isActive ? `${cat.color}08` : '#fff',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = '#cbd5e1' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = '#e2e8f0' }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: isActive ? `${cat.color}15` : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={cat.icon} style={{ fontSize: 18, color: isActive ? cat.color : '#94a3b8' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? cat.color : '#475569' }}>
                {cat.id}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {catCounts[cat.id] || 0}개
              </span>
            </button>
          )
        })}
      </div>

      {/* FAQ 카드 리스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredFAQs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <i className="ri-search-line" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.5 }} />
            <p style={{ fontSize: 15, margin: 0 }}>검색 결과가 없습니다.</p>
          </div>
        )}
        {filteredFAQs.map((item, idx) => {
          const isOpen = openIndex === idx
          const catInfo = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0]
          return (
            <div
              key={idx}
              style={{
                background: '#fff', borderRadius: 14,
                border: isOpen ? `1px solid ${catInfo.color}30` : '1px solid #e2e8f0',
                overflow: 'hidden',
                transition: 'all 0.2s',
                boxShadow: isOpen ? `0 4px 16px ${catInfo.color}10` : 'none',
              }}
            >
              <button
                onClick={() => toggleItem(idx)}
                style={{
                  width: '100%', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: isOpen ? `${catInfo.color}12` : '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <i className={item.icon || 'ri-question-line'} style={{
                    fontSize: 18, color: isOpen ? catInfo.color : '#94a3b8',
                    transition: 'color 0.2s',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1e293b', display: 'block' }}>
                    {item.question}
                  </span>
                  <span style={{
                    fontSize: 11, color: catInfo.color, fontWeight: 500,
                    background: `${catInfo.color}10`, padding: '2px 8px', borderRadius: 4,
                    display: 'inline-block', marginTop: 4,
                  }}>
                    {item.category}
                  </span>
                </div>
                <i
                  className={isOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}
                  style={{ fontSize: 20, color: '#94a3b8', flexShrink: 0 }}
                />
              </button>
              {isOpen && (
                <div style={{
                  padding: '0 20px 20px 72px',
                  fontSize: 14, color: '#475569', lineHeight: 1.75,
                  whiteSpace: 'pre-line',
                }}>
                  <div style={{
                    background: '#f8fafc', borderRadius: 10, padding: '14px 18px',
                    border: '1px solid #f1f5f9',
                  }}>
                    {item.answer}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
