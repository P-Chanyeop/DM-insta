import { useNavigate } from 'react-router-dom'

const GUIDE_SECTIONS = [
  {
    icon: 'ri-flow-chart',
    title: '플로우',
    desc: '댓글이나 DM 키워드에 자동으로 응답하는 자동화 흐름을 만들어보세요. 조건 분기, 지연, 태그 부여 등 다양한 노드를 조합할 수 있습니다.',
    path: '/app/flows',
    color: '#6366f1',
  },
  {
    icon: 'ri-broadcast-line',
    title: '브로드캐스트',
    desc: '연락처 목록에 일괄 DM을 발송합니다. 세그먼트별로 타겟팅하여 높은 전환율을 달성하세요.',
    path: '/app/broadcast',
    color: '#f59e0b',
  },
  {
    icon: 'ri-time-line',
    title: '시퀀스',
    desc: '시간차를 두고 자동으로 DM을 발송하는 드립 캠페인을 설정합니다. 온보딩, 재방문 유도 등에 활용하세요.',
    path: '/app/sequences',
    color: '#10b981',
  },
  {
    icon: 'ri-chat-3-line',
    title: '라이브챗',
    desc: 'Instagram DM을 실시간으로 확인하고 대화하세요. 빠른 답장 템플릿과 자동 배정 기능을 지원합니다.',
    path: '/app/livechat',
    color: '#3b82f6',
  },
  {
    icon: 'ri-contacts-book-2-line',
    title: '연락처 관리',
    desc: 'DM을 주고받은 고객 데이터를 자동으로 수집하고, 태그와 세그먼트로 분류하여 관리합니다.',
    path: '/app/contacts',
    color: '#8b5cf6',
  },
  {
    icon: 'ri-seedling-line',
    title: '성장 도구',
    desc: 'Instagram 계정 성장을 돕는 도구 모음입니다. 댓글 자동화, 스토리 반응 트리거 등을 활용하세요.',
    path: '/app/growth',
    color: '#ec4899',
  },
  {
    icon: 'ri-line-chart-line',
    title: '분석',
    desc: 'DM 발송량, 열림률, 클릭률 등 자동화 성과를 한눈에 확인하세요. 기간별 비교도 가능합니다.',
    path: '/app/analytics',
    color: '#14b8a6',
  },
  {
    icon: 'ri-file-copy-2-line',
    title: '템플릿',
    desc: '미리 만들어진 자동화 템플릿을 활용하면 몇 번의 클릭만으로 플로우를 시작할 수 있습니다.',
    path: '/app/templates',
    color: '#f97316',
  },
]

export default function GuidePage() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '0' }}>
      <div className="page-header">
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>센드잇 사용 가이드</h1>
        <p style={{ color: '#64748b', marginTop: 8, marginBottom: 0, fontSize: '0.95rem' }}>
          센드잇의 주요 기능을 빠르게 살펴보고, 각 기능 페이지로 바로 이동하세요.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
        marginTop: '24px',
      }}>
        {GUIDE_SECTIONS.map((section) => (
          <div
            key={section.title}
            style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'box-shadow 0.2s, transform 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'none'
            }}
            onClick={() => navigate(section.path)}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              background: `${section.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <i className={section.icon} style={{ fontSize: '1.3rem', color: section.color }} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>{section.title}</h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              {section.desc}
            </p>
            <button
              style={{
                marginTop: 'auto',
                paddingTop: '12px',
                background: 'none',
                border: 'none',
                color: section.color,
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                padding: '0',
              }}
              onClick={(e) => { e.stopPropagation(); navigate(section.path) }}
            >
              시작하기 <i className="ri-arrow-right-line" style={{ marginLeft: 4 }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
