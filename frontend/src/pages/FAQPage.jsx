import { useState, useMemo } from 'react'

const CATEGORIES = ['전체', '시작하기', '기능', '결제', '기타']

const FAQ_DATA = [
  {
    category: '시작하기',
    question: '센드잇이란 무엇인가요?',
    answer: '센드잇은 Instagram DM 자동화 SaaS입니다. 댓글·DM 키워드에 자동 응답하는 플로우, 일괄 DM 발송(브로드캐스트), 시간차 발송(시퀀스), 실시간 채팅(라이브챗) 등 Instagram 마케팅에 필요한 모든 기능을 제공합니다.',
  },
  {
    category: '시작하기',
    question: 'Instagram 계정 연결은 어떻게 하나요?',
    answer: '설정 > 연동 메뉴에서 "Instagram 연결" 버튼을 클릭하세요. Facebook 비즈니스 페이지와 연결된 Instagram Professional 계정(비즈니스 또는 크리에이터)이 필요합니다. 안내에 따라 Facebook 로그인 후 권한을 승인하면 자동으로 연결됩니다.',
  },
  {
    category: '기능',
    question: '플로우는 어떻게 만드나요?',
    answer: '자동화 플로우 메뉴에서 "새 플로우 만들기" 버튼을 클릭합니다. 트리거(댓글 키워드, DM 키워드, 스토리 반응 등)를 선택하고, 드래그앤드롭 빌더에서 메시지 전송, 조건 분기, 지연 등 노드를 연결하여 자동화 흐름을 완성하세요.',
  },
  {
    category: '기능',
    question: '브로드캐스트와 시퀀스의 차이는 무엇인가요?',
    answer: '브로드캐스트는 선택한 연락처에 한 번에 일괄 DM을 발송하는 기능입니다. 시퀀스는 미리 설정한 시간 간격(예: 1일 후, 3일 후)에 맞춰 자동으로 연속 DM을 보내는 드립 캠페인 기능입니다.',
  },
  {
    category: '기능',
    question: 'DM 발송 한도는 어떻게 되나요?',
    answer: '플랜별 월간 DM 발송 한도는 다음과 같습니다:\n• FREE: 300건/월\n• STARTER: 3,000건/월\n• PRO: 30,000건/월\n• BUSINESS: 무제한\n한도를 초과하면 다음 결제 주기까지 발송이 일시 중단됩니다. 더 많은 발송이 필요하면 플랜 업그레이드를 권장합니다.',
  },
  {
    category: '기능',
    question: '팀원을 초대하려면 어떤 플랜이 필요하나요?',
    answer: 'PRO 플랜 이상에서 팀원 초대 기능을 사용할 수 있습니다. PRO 플랜은 최대 3명, BUSINESS 플랜은 무제한 팀원 초대가 가능합니다. 설정 > 팀 메뉴에서 이메일로 초대하세요.',
  },
  {
    category: '기능',
    question: '읽음 확인은 어떻게 작동하나요?',
    answer: 'Instagram API를 통해 상대방이 DM을 읽었는지 확인할 수 있습니다. 라이브챗 화면에서 메시지 옆에 읽음 표시가 나타나며, 브로드캐스트/시퀀스 분석에서도 열림률(읽음률)을 확인할 수 있습니다.',
  },
  {
    category: '기능',
    question: '연락처는 어떻게 수집되나요?',
    answer: '다음 경우에 연락처가 자동으로 추가됩니다:\n• DM을 보내온 사용자\n• 플로우 트리거에 반응한 사용자 (댓글, 스토리 반응 등)\n• 성장 도구를 통해 유입된 사용자\n수동으로 CSV 파일을 업로드하여 일괄 추가할 수도 있습니다.',
  },
  {
    category: '결제',
    question: '결제는 어떤 수단을 지원하나요?',
    answer: 'Paddle 결제 시스템을 통해 다양한 결제 수단을 지원합니다:\n• 카카오페이\n• 네이버페이\n• 신용카드/체크카드 (Visa, Mastercard, 국내 카드)\n• PayPal\n월간/연간 구독 방식이며, 연간 구독 시 20% 할인이 적용됩니다.',
  },
  {
    category: '기타',
    question: '서비스를 해지하면 데이터는 어떻게 되나요?',
    answer: '구독을 해지하면 현재 결제 주기가 끝날 때까지 서비스를 계속 이용할 수 있습니다. 이후 계정은 FREE 플랜으로 전환되며, 기존 데이터(플로우, 연락처 등)는 30일간 보존됩니다. 30일 이내에 재구독하면 모든 데이터가 복원됩니다.',
  },
  {
    category: '시작하기',
    question: '무료 플랜으로 어떤 기능을 사용할 수 있나요?',
    answer: 'FREE 플랜에서는 월 300건 DM 발송, 플로우 3개 생성, 연락처 100명 관리, 라이브챗 기본 기능을 사용할 수 있습니다. 브로드캐스트와 시퀀스는 STARTER 플랜부터 이용 가능합니다.',
  },
  {
    category: '기타',
    question: '고객 지원은 어떻게 받을 수 있나요?',
    answer: '다음 채널을 통해 지원을 받을 수 있습니다:\n• 이메일: support@sendit.io.kr\n• 인앱 1:1 문의 (도움말 > 1:1 문의)\n• 평일 10:00~18:00 운영 (주말/공휴일 제외)\nPRO 이상 플랜은 우선 응답 지원을 받습니다.',
  },
]

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [openIndex, setOpenIndex] = useState(null)

  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
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

  return (
    <div style={{ padding: '0' }}>
      <div className="page-header">
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>자주 묻는 질문 (FAQ)</h1>
        <p style={{ color: '#64748b', marginTop: 8, marginBottom: 0, fontSize: '0.95rem' }}>
          센드잇 이용에 대해 자주 묻는 질문을 모았습니다.
        </p>
      </div>

      {/* 검색 */}
      <div style={{ marginTop: '20px', position: 'relative' }}>
        <i className="ri-search-line" style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: '#94a3b8', fontSize: '1.1rem',
        }} />
        <input
          type="text"
          placeholder="질문을 검색하세요..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null) }}
          style={{
            width: '100%',
            padding: '12px 14px 12px 42px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '0.92rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setOpenIndex(null) }}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: activeCategory === cat ? '1px solid #6366f1' : '1px solid #e2e8f0',
              background: activeCategory === cat ? '#6366f1' : '#fff',
              color: activeCategory === cat ? '#fff' : '#475569',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 아코디언 */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredFAQs.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
            검색 결과가 없습니다.
          </p>
        )}
        {filteredFAQs.map((item, idx) => {
          const isOpen = openIndex === idx
          return (
            <div
              key={idx}
              style={{
                background: '#fff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => toggleItem(idx)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '0.93rem', fontWeight: 500, color: '#1e293b' }}>
                  {item.question}
                </span>
                <i
                  className={isOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}
                  style={{ fontSize: '1.2rem', color: '#94a3b8', flexShrink: 0 }}
                />
              </button>
              {isOpen && (
                <div style={{
                  padding: '0 20px 16px',
                  fontSize: '0.88rem',
                  color: '#475569',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '12px',
                }}>
                  {item.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
