import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const GUIDE_SECTIONS = [
  {
    icon: 'ri-instagram-line',
    title: 'Instagram 계정 연결',
    desc: 'Instagram 비즈니스 계정을 센드잇에 연결하여 자동화를 시작하세요.',
    color: '#E1306C',
    path: '/app/settings',
    steps: [
      { title: '설정 페이지로 이동', desc: '좌측 사이드바에서 "설정" 메뉴를 클릭합니다.', icon: 'ri-settings-3-line' },
      { title: '연동 탭 선택', desc: '상단 탭에서 "연동" 탭을 클릭합니다.', icon: 'ri-link' },
      { title: 'Instagram 연결 클릭', desc: '"Instagram 연결" 버튼을 클릭하면 Facebook 로그인 화면이 나타납니다.', icon: 'ri-instagram-line' },
      { title: 'Facebook 로그인 및 권한 승인', desc: 'Facebook 계정으로 로그인 후, Instagram 비즈니스 계정 접근 권한을 승인합니다.', icon: 'ri-shield-check-line' },
      { title: '연결 완료!', desc: '연결이 완료되면 계정 정보가 표시됩니다. 이제 자동화를 시작할 수 있습니다!', icon: 'ri-check-double-line' },
    ],
  },
  {
    icon: 'ri-flow-chart',
    title: '자동화 플로우 만들기',
    desc: '댓글이나 DM 키워드에 자동으로 응답하는 플로우를 만들어보세요.',
    color: '#6366f1',
    path: '/app/flows',
    steps: [
      { title: '플로우 메뉴로 이동', desc: '좌측 사이드바에서 "자동화 플로우" 메뉴를 클릭합니다.', icon: 'ri-flow-chart' },
      { title: '새 플로우 만들기', desc: '우측 상단의 "새 플로우" 버튼을 클릭합니다. 또는 템플릿에서 시작할 수도 있습니다.', icon: 'ri-add-line' },
      { title: '트리거 설정', desc: '어떤 상황에서 플로우가 시작될지 선택합니다. 댓글 키워드, DM 키워드, 스토리 반응 등을 설정하세요.', icon: 'ri-flashlight-line' },
      { title: '메시지 노드 추가', desc: '드래그앤드롭으로 메시지, 조건 분기, 지연 등 노드를 추가하고 연결합니다.', icon: 'ri-chat-1-line' },
      { title: '플로우 활성화', desc: '모든 설정이 끝나면 "활성화" 버튼을 눌러 플로우를 시작합니다!', icon: 'ri-play-circle-line' },
    ],
  },
  {
    icon: 'ri-broadcast-line',
    title: '브로드캐스트 발송',
    desc: '연락처에 일괄 DM을 발송하여 프로모션, 공지사항을 전달하세요.',
    color: '#f59e0b',
    path: '/app/broadcast',
    steps: [
      { title: '브로드캐스트 메뉴 이동', desc: '좌측 사이드바에서 "브로드캐스트" 메뉴를 클릭합니다.', icon: 'ri-broadcast-line' },
      { title: '새 브로드캐스트 만들기', desc: '"새 브로드캐스트" 버튼을 클릭합니다.', icon: 'ri-add-line' },
      { title: '수신 대상 선택', desc: '전체 연락처 또는 특정 태그/세그먼트로 필터링하여 대상을 선택합니다.', icon: 'ri-group-line' },
      { title: '메시지 작성', desc: '발송할 메시지 내용을 작성합니다. 텍스트, 이미지, 버튼을 포함할 수 있습니다.', icon: 'ri-edit-2-line' },
      { title: '발송 시작', desc: '"지금 발송" 또는 예약 시간을 설정하여 발송합니다.', icon: 'ri-send-plane-line' },
    ],
  },
  {
    icon: 'ri-time-line',
    title: '시퀀스 설정',
    desc: '시간차를 두고 자동으로 연속 DM을 보내는 드립 캠페인을 설정합니다.',
    color: '#10b981',
    path: '/app/sequences',
    steps: [
      { title: '시퀀스 메뉴 이동', desc: '좌측 사이드바에서 "시퀀스" 메뉴를 클릭합니다.', icon: 'ri-time-line' },
      { title: '새 시퀀스 만들기', desc: '"새 시퀀스" 버튼을 클릭합니다.', icon: 'ri-add-line' },
      { title: '단계 추가', desc: '각 단계마다 보낼 메시지와 발송 간격(예: 1일 후, 3일 후)을 설정합니다.', icon: 'ri-list-ordered-2' },
      { title: '조건 분기 설정', desc: '특정 태그 보유 여부, 활성 상태 등에 따라 분기 조건을 설정할 수 있습니다.', icon: 'ri-git-branch-line' },
      { title: '시퀀스 활성화', desc: '설정을 완료하고 활성화하면 자동으로 실행됩니다!', icon: 'ri-play-circle-line' },
    ],
  },
  {
    icon: 'ri-chat-3-line',
    title: '라이브챗 사용법',
    desc: 'Instagram DM을 실시간으로 확인하고 대화하세요.',
    color: '#3b82f6',
    path: '/app/livechat',
    steps: [
      { title: '라이브챗 메뉴 이동', desc: '좌측 사이드바에서 "라이브챗" 메뉴를 클릭합니다.', icon: 'ri-chat-3-line' },
      { title: '대화 목록 확인', desc: '좌측에 대화 목록이 표시됩니다. 검색으로 특정 대화를 찾을 수 있습니다.', icon: 'ri-list-check-3' },
      { title: '메시지 보내기', desc: '대화를 선택한 후, 하단 입력창에 메시지를 작성하고 전송합니다.', icon: 'ri-send-plane-line' },
      { title: '이미지/카드 전송', desc: '첨부 버튼을 눌러 이미지나 카드 형태의 메시지도 보낼 수 있습니다.', icon: 'ri-image-line' },
      { title: '읽음 확인', desc: '보낸 메시지 옆에 "읽음" 표시로 상대방이 읽었는지 확인할 수 있습니다.', icon: 'ri-check-double-line' },
    ],
  },
  {
    icon: 'ri-contacts-book-2-line',
    title: '연락처 관리',
    desc: 'DM을 주고받은 고객 데이터를 태그와 세그먼트로 분류하여 관리합니다.',
    color: '#8b5cf6',
    path: '/app/contacts',
    steps: [
      { title: '연락처 메뉴 이동', desc: '좌측 사이드바에서 "연락처 관리" 메뉴를 클릭합니다.', icon: 'ri-contacts-book-2-line' },
      { title: '연락처 목록 확인', desc: '자동 수집된 연락처 목록이 표시됩니다. 검색과 필터를 사용할 수 있습니다.', icon: 'ri-search-line' },
      { title: '상세 정보 보기', desc: '연락처를 클릭하면 대화 이력, 태그, 메모 등 상세 정보를 확인할 수 있습니다.', icon: 'ri-user-line' },
      { title: '태그 관리', desc: '연락처에 태그를 추가하여 "VIP", "신규고객" 등으로 분류하세요.', icon: 'ri-price-tag-3-line' },
      { title: '세그먼트 활용', desc: '태그 기반으로 세그먼트를 만들어 브로드캐스트 타겟팅에 활용합니다.', icon: 'ri-filter-3-line' },
    ],
  },
  {
    icon: 'ri-line-chart-line',
    title: '분석 및 리포트',
    desc: 'DM 발송량, 열림률, 클릭률 등 자동화 성과를 한눈에 확인하세요.',
    color: '#14b8a6',
    path: '/app/analytics',
    steps: [
      { title: '분석 메뉴 이동', desc: '좌측 사이드바에서 "분석" 메뉴를 클릭합니다.', icon: 'ri-line-chart-line' },
      { title: '대시보드 확인', desc: '전체 발송량, 열림률, 클릭률 등 주요 지표를 한눈에 확인합니다.', icon: 'ri-dashboard-3-line' },
      { title: '기간별 비교', desc: '날짜 선택기로 특정 기간의 성과를 비교 분석할 수 있습니다.', icon: 'ri-calendar-2-line' },
      { title: '플로우별 성과', desc: '각 플로우의 발송/열림/클릭 성과를 개별적으로 확인합니다.', icon: 'ri-bar-chart-2-line' },
    ],
  },
  {
    icon: 'ri-file-copy-2-line',
    title: '템플릿 활용하기',
    desc: '미리 만들어진 자동화 템플릿으로 몇 번의 클릭만으로 시작하세요.',
    color: '#f97316',
    path: '/app/templates',
    steps: [
      { title: '템플릿 메뉴 이동', desc: '좌측 사이드바에서 "템플릿" 메뉴를 클릭합니다.', icon: 'ri-file-copy-2-line' },
      { title: '카테고리 탐색', desc: '쇼핑몰, 예약/서비스, 이벤트, 리드수집, 고객지원 카테고리 중 선택합니다.', icon: 'ri-folder-open-line' },
      { title: '템플릿 선택', desc: '원하는 템플릿의 "사용하기" 버튼을 클릭합니다.', icon: 'ri-cursor-line' },
      { title: '커스터마이징', desc: '플로우 빌더에서 메시지 내용, 키워드 등을 내 비즈니스에 맞게 수정합니다.', icon: 'ri-edit-2-line' },
      { title: '활성화', desc: '수정을 완료하고 플로우를 활성화하면 바로 작동합니다!', icon: 'ri-play-circle-line' },
    ],
  },
]

export default function GuidePage() {
  const navigate = useNavigate()
  const [selectedGuide, setSelectedGuide] = useState(null)

  return (
    <div style={{ padding: 0 }}>
      <div className="page-header">
        <div>
          <h2>센드잇 사용 가이드</h2>
          <p>각 기능을 클릭하면 단계별 사용법을 확인할 수 있습니다.</p>
        </div>
      </div>

      {/* 상세 가이드 뷰 */}
      {selectedGuide && (
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: 0, marginBottom: 24, overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '28px 32px 20px',
            background: `linear-gradient(135deg, ${selectedGuide.color}10, ${selectedGuide.color}05)`,
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${selectedGuide.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={selectedGuide.icon} style={{ fontSize: 26, color: selectedGuide.color }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{selectedGuide.title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{selectedGuide.desc}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedGuide(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 8,
                borderRadius: 8, color: '#94a3b8', fontSize: 20,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <i className="ri-close-line" />
            </button>
          </div>

          {/* 단계별 가이드 */}
          <div style={{ padding: '24px 32px 28px' }}>
            <div style={{ position: 'relative' }}>
              {selectedGuide.steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 20, marginBottom: idx < selectedGuide.steps.length - 1 ? 0 : 0 }}>
                  {/* 타임라인 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: idx === selectedGuide.steps.length - 1 ? selectedGuide.color : `${selectedGuide.color}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${selectedGuide.color}30`,
                      flexShrink: 0,
                    }}>
                      {idx === selectedGuide.steps.length - 1 ? (
                        <i className="ri-check-line" style={{ fontSize: 20, color: '#fff' }} />
                      ) : (
                        <span style={{ fontSize: 15, fontWeight: 700, color: selectedGuide.color }}>{idx + 1}</span>
                      )}
                    </div>
                    {idx < selectedGuide.steps.length - 1 && (
                      <div style={{
                        width: 2, flex: 1, minHeight: 24,
                        background: `linear-gradient(to bottom, ${selectedGuide.color}30, ${selectedGuide.color}10)`,
                      }} />
                    )}
                  </div>

                  {/* 내용 */}
                  <div style={{
                    flex: 1, paddingBottom: idx < selectedGuide.steps.length - 1 ? 20 : 0,
                    paddingTop: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <i className={step.icon} style={{ fontSize: 16, color: selectedGuide.color }} />
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{step.title}</h4>
                    </div>
                    <p style={{
                      margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.65,
                      background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                      border: '1px solid #f1f5f9',
                    }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 바로가기 버튼 */}
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button
                className="btn-primary"
                onClick={() => navigate(selectedGuide.path)}
                style={{ borderRadius: 10, padding: '10px 20px', fontSize: 14 }}
              >
                <i className={selectedGuide.icon} style={{ marginRight: 6 }} />
                {selectedGuide.title} 페이지로 이동
              </button>
              <button
                onClick={() => setSelectedGuide(null)}
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 10,
                  padding: '10px 20px', fontSize: 14, color: '#475569',
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 가이드 카드 그리드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 16,
      }}>
        {GUIDE_SECTIONS.map((section) => {
          const isSelected = selectedGuide?.title === section.title
          return (
            <div
              key={section.title}
              style={{
                background: isSelected ? `${section.color}08` : '#fff',
                borderRadius: 14,
                border: isSelected ? `2px solid ${section.color}40` : '1px solid #e2e8f0',
                overflow: 'hidden',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'none'
              }}
              onClick={() => setSelectedGuide(section)}
            >
              {/* 카드 상단 비주얼 */}
              <div style={{
                padding: '20px 20px 16px',
                background: `linear-gradient(135deg, ${section.color}08, ${section.color}03)`,
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${section.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <i className={section.icon} style={{ fontSize: 24, color: section.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{section.title}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    {section.steps.length}단계
                  </p>
                </div>
                <i className="ri-arrow-right-s-line" style={{ fontSize: 20, color: '#cbd5e1' }} />
              </div>

              {/* 카드 본문 */}
              <div style={{ padding: '14px 20px 16px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  {section.desc}
                </p>
                {/* 단계 미리보기 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {section.steps.slice(0, 3).map((step, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 12, color: '#94a3b8',
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: `${section.color}12`, color: section.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                  {section.steps.length > 3 && (
                    <span style={{ fontSize: 11, color: section.color, fontWeight: 500, marginLeft: 26 }}>
                      +{section.steps.length - 3}단계 더 보기
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
