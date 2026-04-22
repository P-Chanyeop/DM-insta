import { useLocation, Link } from 'react-router-dom'

export default function LegalPage() {
  const location = useLocation()
  const path = location.pathname

  const pageType = path === '/terms' ? 'terms'
                 : path === '/privacy' ? 'privacy'
                 : path === '/refund' ? 'refund'
                 : 'terms'

  const title = pageType === 'terms' ? '이용약관'
              : pageType === 'privacy' ? '개인정보 처리방침'
              : '환불 및 취소 정책'

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '3rem 1.5rem',
      fontFamily: 'inherit',
      color: 'var(--fg, #1a1a1a)',
    }}>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--primary, #6366f1)',
          textDecoration: 'none',
          marginBottom: '2rem',
          fontSize: '0.9rem',
        }}
      >
        <i className="ri-arrow-left-line" /> 홈으로 돌아가기
      </Link>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{title}</h1>
      <p style={{ color: 'var(--muted, #666)', marginBottom: '2rem' }}>
        최종 수정일: 2026년 4월 22일
      </p>

      {pageType === 'terms' && <TermsContent />}
      {pageType === 'privacy' && <PrivacyContent />}
      {pageType === 'refund' && <RefundContent />}

      <div style={{ borderTop: '1px solid #eee', marginTop: '3rem', paddingTop: '1.5rem', color: 'var(--muted, #888)', fontSize: '0.85rem' }}>
        <p>센드잇 (SendIt) | 소프트캣 | 사업자등록번호 292-56-00756</p>
        <p>통신판매업 신고번호 제 2025-고양덕양구-0992호</p>
        <p>고객센터: oracle7579@gmail.com / 010-4414-7579</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/terms" style={{ color: 'var(--primary, #6366f1)' }}>이용약관</Link>
          <Link to="/privacy" style={{ color: 'var(--primary, #6366f1)' }}>개인정보 처리방침</Link>
          <Link to="/refund" style={{ color: 'var(--primary, #6366f1)' }}>환불정책</Link>
        </div>
      </div>
    </div>
  )
}

function TermsContent() {
  return (
    <div style={{ lineHeight: 1.8 }}>
      <Section title="제 1조 (목적)">
        본 약관은 소프트캣(이하 "회사")이 운영하는 센드잇(SendIt, 이하 "서비스")의
        이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
      </Section>

      <Section title="제 2조 (정의)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>"서비스"란 센드잇이 제공하는 Instagram DM 자동 발송, 댓글 자동 응답, 키워드 자동 응답, 팔로워 관리, 브로드캐스트, 성장 도구 등 소셜 미디어 자동화 기능 일체를 의미합니다.</li>
          <li>"이용자"란 본 약관에 따라 서비스에 가입하여 서비스를 이용하는 자를 의미합니다.</li>
          <li>"콘텐츠"란 이용자가 서비스를 통해 생성, 전송하는 메시지, 이미지, 링크 등을 의미합니다.</li>
          <li>"유료 서비스"란 Starter, Pro, Business 등 월 구독 요금을 지불하고 이용하는 서비스를 의미합니다.</li>
        </ol>
      </Section>

      <Section title="제 3조 (서비스 가입 및 이용)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>서비스 이용을 위해 Instagram 비즈니스 또는 크리에이터 계정이 필요합니다.</li>
          <li>이용자는 정확한 정보를 제공하고, 변경 시 즉시 수정해야 합니다.</li>
          <li>계정은 본인만 사용할 수 있으며, 타인에게 양도할 수 없습니다.</li>
        </ol>
      </Section>

      <Section title="제 4조 (이용자의 의무)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>이용자는 Instagram/Meta의 플랫폼 정책 및 커뮤니티 가이드라인을 준수해야 합니다.</li>
          <li>스팸, 사기, 피싱, 불법 행위, 혐오 발언 등에 서비스를 사용할 수 없습니다.</li>
          <li>타인의 권리를 침해하거나 불쾌감을 주는 콘텐츠를 발송할 수 없습니다.</li>
          <li>위 사항을 위반할 경우 서비스 이용이 제한되거나 계정이 삭제될 수 있습니다.</li>
        </ol>
      </Section>

      <Section title="제 5조 (유료 서비스 및 정기결제)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>서비스는 무료 플랜(Free)과 유료 플랜(Starter, Pro, Business)을 제공합니다.</li>
          <li>유료 플랜 요금 (VAT 포함):
            <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
              <li>Starter: 월 19,900원</li>
              <li>Pro: 월 49,900원</li>
              <li>Business: 월 149,900원</li>
            </ul>
          </li>
          <li>유료 서비스는 <strong>월 단위 정기결제</strong>로 제공되며, 최초 결제일 기준 매월 동일한 날짜에 등록된 결제수단(신용/체크카드)으로 자동 청구됩니다.</li>
          <li>결제 대행: <strong>토스페이먼츠(주)</strong> — 신용카드 및 체크카드 정기결제.</li>
          <li>이용자는 언제든지 <strong>대시보드 &gt; 설정 &gt; 요금제</strong>에서 구독을 해지할 수 있습니다.</li>
          <li>해지 시 현재 결제 주기 종료 시점까지 유료 기능을 이용할 수 있으며, 이후 Free 플랜으로 자동 전환되고 다음 결제일부터는 과금되지 않습니다.</li>
          <li>결제 수단 변경이 필요한 경우 설정 페이지에서 구독을 해지한 후 새 카드로 다시 가입하시면 됩니다.</li>
          <li>요금 변경 시 시행일 최소 30일 전에 이메일 및 서비스 내 공지를 통해 안내합니다.</li>
        </ol>
      </Section>

      <Section title="제 6조 (환불)">
        <p style={{ margin: '0.3rem 0' }}>
          환불 정책은 별도의 <Link to="/refund" style={{ color: 'var(--primary, #6366f1)' }}>환불 및 취소 정책</Link> 페이지를 따르며,
          「전자상거래 등에서의 소비자보호에 관한 법률」을 준수합니다.
        </p>
      </Section>

      <Section title="제 7조 (서비스 변경 및 중단)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>회사는 서비스 개선을 위해 기능을 변경하거나 추가할 수 있습니다.</li>
          <li>Instagram API 정책 변경, 서버 점검 등으로 서비스가 일시 중단될 수 있습니다.</li>
          <li>서비스 변경 시 사전 공지하며, 긴급한 경우 사후 공지할 수 있습니다.</li>
        </ol>
      </Section>

      <Section title="제 8조 (면책)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>Instagram/Meta API 변경, 장애 등 외부 요인으로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.</li>
          <li>이용자가 발송한 콘텐츠로 인해 발생하는 분쟁에 대해 회사는 책임을 지지 않습니다.</li>
          <li>이용자의 계정 관리 소홀로 인한 피해에 대해 회사는 책임을 지지 않습니다.</li>
        </ol>
      </Section>

      <Section title="제 9조 (지적재산권)">
        서비스에 포함된 소프트웨어, 디자인, 로고, 콘텐츠 등의 지적재산권은 회사에 귀속됩니다.
        이용자가 서비스를 통해 생성한 콘텐츠의 권리는 이용자에게 있습니다.
      </Section>

      <Section title="제 10조 (계정 탈퇴)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>이용자는 설정 페이지에서 언제든지 계정을 탈퇴할 수 있습니다.</li>
          <li>탈퇴 시 모든 데이터는 즉시 삭제되며, 복구할 수 없습니다.</li>
          <li>유료 구독 중 탈퇴 시 남은 기간에 대한 환불은 제공되지 않습니다 (별도 환불 정책 참조).</li>
        </ol>
      </Section>

      <Section title="제 11조 (분쟁 해결)">
        본 약관에 관한 분쟁은 대한민국 법률에 따르며, 관할 법원은 회사 소재지 관할 법원(의정부지방법원 고양지원)으로 합니다.
      </Section>

      <Section title="사업자 정보">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>상호: 소프트캣</li>
          <li>대표자: 박찬엽</li>
          <li>사업자등록번호: 292-56-00756</li>
          <li>통신판매업 신고번호: 제 2025-고양덕양구-0992호</li>
          <li>주소: 경기도 고양시 덕양구 원흥3로 16 904호</li>
          <li>이메일: oracle7579@gmail.com / 전화: 010-4414-7579</li>
        </ul>
      </Section>
    </div>
  )
}

function PrivacyContent() {
  return (
    <div style={{ lineHeight: 1.8 }}>
      <Section title="1. 수집하는 개인정보">
        <p style={{ margin: '0.3rem 0', fontWeight: 600 }}>가. 회원가입 시</p>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>이메일 주소, 이름, 비밀번호 (이메일 가입 시)</li>
          <li>Instagram 사용자명, 프로필 사진 (Instagram 로그인 시)</li>
          <li>약관 동의 기록 (이용약관, 개인정보처리방침, 마케팅 수신 동의 여부 및 동의 시각)</li>
        </ul>
        <p style={{ margin: '0.3rem 0', fontWeight: 600 }}>나. Instagram 계정 연동 시</p>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>Instagram 사용자 ID, 사용자명, 프로필 사진 URL, 팔로워 수</li>
          <li>Instagram 액세스 토큰 (암호화 저장)</li>
        </ul>
        <p style={{ margin: '0.3rem 0', fontWeight: 600 }}>다. 유료 결제 시</p>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>결제 수단 정보 (카드번호, 유효기간 등은 토스페이먼츠(주)에서 직접 수집/보관하며, 회사는 저장하지 않음)</li>
          <li>결제 이력, 청구 금액, 결제일, 빌링키 식별자</li>
        </ul>
        <p style={{ margin: '0.3rem 0', fontWeight: 600 }}>라. 서비스 이용 시 자동 수집</p>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>서비스 이용 기록, 접속 로그, IP 주소</li>
          <li>DM 발송 기록 (수신자 ID, 발송 시각, 발송 상태)</li>
        </ul>
      </Section>

      <Section title="2. 개인정보의 이용 목적">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>서비스 제공 및 계정 관리</li>
          <li>Instagram DM 자동화 기능 제공 (메시지 발송, 댓글 응답, 키워드 응답)</li>
          <li>유료 서비스 결제 처리 및 구독 관리</li>
          <li>서비스 개선 및 이용 통계 분석</li>
          <li>고객 지원 및 공지사항 전달</li>
          <li>마케팅 정보 수신에 동의한 경우, 이벤트/프로모션/신규 기능 안내</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 보유 및 파기">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>회원 탈퇴 시 즉시 파기합니다.</li>
          <li>Instagram 연동 해제 시 해당 Instagram 토큰 및 계정 정보를 즉시 삭제합니다.</li>
          <li>관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관 후 파기합니다:
            <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
              <li>전자상거래법: 계약/결제 기록 5년, 소비자 불만·분쟁 처리 기록 3년, 대금 결제·재화 공급 기록 5년</li>
              <li>통신비밀보호법: 접속 로그 3개월</li>
            </ul>
          </li>
        </ul>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.</li>
          <li>단, 다음의 경우 예외로 합니다:
            <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
              <li><strong>Meta Platforms, Inc. (Instagram)</strong>
                <ul style={{ paddingLeft: '1rem', margin: '0.2rem 0' }}>
                  <li>제공 목적: Instagram DM 자동화 기능 제공</li>
                  <li>제공 항목: Instagram 사용자 ID, 메시지 내용</li>
                  <li>보유 기간: Instagram 연동 해제 시까지</li>
                </ul>
              </li>
              <li><strong>토스페이먼츠(주)</strong>
                <ul style={{ paddingLeft: '1rem', margin: '0.2rem 0' }}>
                  <li>제공 목적: 유료 서비스 결제 및 환불 처리</li>
                  <li>제공 항목: 이름, 이메일, 결제 정보</li>
                  <li>보유 기간: 전자상거래법에 따라 5년 (계약·결제 기록)</li>
                </ul>
              </li>
              <li>법률에 따른 요청이 있는 경우</li>
            </ul>
          </li>
        </ul>
      </Section>

      <Section title="5. 개인정보의 안전성 확보 조치">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>비밀번호 암호화 저장 (BCrypt)</li>
          <li>Instagram 액세스 토큰 암호화 저장 (AES-256)</li>
          <li>모든 통신 SSL/TLS 암호화</li>
          <li>결제 정보는 토스페이먼츠가 PCI-DSS 인증 환경에서 보관하며, 회사 서버에는 저장하지 않음</li>
          <li>접근 권한 관리 및 로그 기록</li>
          <li>정기적 보안 점검</li>
        </ul>
      </Section>

      <Section title="6. 이용자의 권리">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다.</li>
          <li>설정 페이지에서 Instagram 연동을 해제할 수 있습니다.</li>
          <li>설정 페이지의 알림 설정에서 마케팅 정보 수신 동의를 언제든지 철회할 수 있습니다.</li>
          <li>계정 탈퇴를 통해 모든 개인정보 삭제를 요청할 수 있습니다.</li>
          <li>개인정보 관련 문의: oracle7579@gmail.com</li>
        </ul>
      </Section>

      <Section title="7. Instagram/Meta 데이터 사용">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>서비스는 Meta Platform 정책을 준수하여 Instagram 데이터를 처리합니다.</li>
          <li>Instagram에서 수집한 데이터는 서비스 제공 목적으로만 사용됩니다.</li>
          <li>이용자가 Instagram 연동을 해제하면 관련 데이터를 즉시 삭제합니다.</li>
          <li>Instagram 데이터를 광고, 마케팅 목적으로 판매하거나 공유하지 않습니다.</li>
        </ul>
      </Section>

      <Section title="8. 데이터 삭제 요청">
        이용자는 다음 방법으로 데이터 삭제를 요청할 수 있습니다:
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>설정 페이지에서 계정 탈퇴</li>
          <li>이메일 문의: oracle7579@gmail.com</li>
        </ul>
        삭제 요청 접수 후 5영업일 이내에 처리됩니다.
      </Section>

      <Section title="9. 개인정보 보호책임자">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>성명: 박찬엽</li>
          <li>이메일: oracle7579@gmail.com</li>
          <li>전화: 010-4414-7579</li>
        </ul>
      </Section>

      <Section title="10. 개인정보 처리방침 변경">
        본 방침이 변경되는 경우 시행일 7일 전부터 서비스 내 공지사항을 통해 안내합니다.
      </Section>
    </div>
  )
}

function RefundContent() {
  return (
    <div style={{ lineHeight: 1.8 }}>
      <Section title="1. 기본 원칙">
        <p>
          센드잇(SendIt)은 「전자상거래 등에서의 소비자보호에 관한 법률」(이하 "전자상거래법")을
          준수하여 환불 및 청약 철회 요청을 처리합니다. 본 정책은 유료 구독 서비스(Starter, Pro, Business)에
          적용됩니다.
        </p>
      </Section>

      <Section title="2. 청약 철회 및 전액 환불">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li><strong>결제일로부터 7일 이내</strong>이고 <strong>유료 기능을 전혀 사용하지 않은 경우</strong>, 전자상거래법 제17조에 따라 청약 철회 및 전액 환불이 가능합니다.</li>
          <li>"유료 기능 사용"의 기준:
            <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
              <li>유료 플랜에서만 제공되는 플로우/자동화/브로드캐스트/시퀀스 등을 생성·실행한 경우</li>
              <li>유료 플랜 할당량(쿼터)을 1건이라도 소진한 경우</li>
            </ul>
          </li>
          <li>환불 요청 방법: <strong>oracle7579@gmail.com</strong> 또는 <strong>010-4414-7579</strong>로 연락 (회원 ID, 결제일, 환불 사유 명시).</li>
          <li>환불 처리 기간: 요청 접수 후 영업일 기준 3~5일 이내 처리.
            카드 결제의 경우 카드사 정책에 따라 실제 환불 반영까지 추가 3~7일이 소요될 수 있습니다.</li>
        </ol>
      </Section>

      <Section title="3. 환불 제한">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>결제일로부터 7일이 경과한 경우, 이용 일수와 무관하게 환불이 제공되지 않습니다.</li>
          <li>결제일로부터 7일 이내라도 유료 기능을 사용한 경우, 전자상거래법 제17조 제2항에 따라 환불이 제한될 수 있습니다 (소프트웨어 서비스의 특성상 사용 즉시 복제 가치가 현저히 감소).</li>
          <li>구독 해지 후 남은 결제 주기에 대한 일할 환불은 제공되지 않으며, 결제 주기 종료 시점까지 유료 기능을 정상 이용하실 수 있습니다.</li>
          <li>이용자의 약관 위반(스팸, 사기, Instagram 정책 위반 등)으로 서비스 이용이 정지된 경우 환불이 제공되지 않습니다.</li>
        </ol>
      </Section>

      <Section title="4. 구독 해지 방법">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>대시보드 로그인 후 <strong>설정(Settings) &gt; 요금제(Billing)</strong> 탭으로 이동합니다.</li>
          <li><strong>"구독 해지"</strong> 버튼을 클릭합니다.</li>
          <li>해지 확인 후, 현재 결제 주기가 끝날 때까지 유료 기능을 계속 이용할 수 있습니다.</li>
          <li>결제 주기 종료 시점에 Free 플랜으로 자동 전환되며, <strong>다음 결제일부터 자동 결제가 중단</strong>됩니다.</li>
          <li>해지 후에도 계정은 유지되므로 필요 시 다시 유료 플랜으로 업그레이드할 수 있습니다.</li>
        </ol>
        <p style={{ margin: '0.5rem 0', color: 'var(--muted, #666)' }}>
          대시보드 접속이 어려운 경우 <strong>oracle7579@gmail.com</strong>으로 해지 요청을 보내주시면 대신 처리해 드립니다.
        </p>
      </Section>

      <Section title="5. 결제 오류 및 이중 결제">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>시스템 오류 또는 중복 결제가 발생한 경우, 확인 즉시 전액 환불해 드립니다.</li>
          <li>결제 오류 의심 시 결제 내역 스크린샷과 함께 oracle7579@gmail.com으로 연락주세요.</li>
          <li>확인 후 영업일 기준 3일 이내에 처리합니다.</li>
        </ol>
      </Section>

      <Section title="6. 결제 대행사">
        <p>
          모든 결제는 <strong>토스페이먼츠(주)</strong>를 통해 처리됩니다. 카드 정보는 토스페이먼츠가 PCI-DSS 인증 환경에서
          직접 보관하며, 센드잇 서버에는 저장되지 않습니다.
        </p>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>토스페이먼츠 고객센터: 1544-7772</li>
        </ul>
      </Section>

      <Section title="7. 소비자 분쟁 해결">
        <p>
          환불 관련 분쟁 발생 시 <strong>공정거래위원회 고시 소비자분쟁해결기준</strong>을 준용합니다.
          회사와의 협의로 해결되지 않는 경우 아래 기관의 도움을 받을 수 있습니다:
        </p>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>소비자분쟁조정위원회: 1372 (www.ccn.go.kr)</li>
          <li>한국소비자원: 043-880-5500 (www.kca.go.kr)</li>
          <li>전자거래분쟁조정위원회: 1588-5714 (www.ecmc.or.kr)</li>
        </ul>
      </Section>

      <Section title="8. 연락처">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>상호: 소프트캣 (센드잇)</li>
          <li>대표자: 박찬엽</li>
          <li>사업자등록번호: 292-56-00756</li>
          <li>통신판매업 신고번호: 제 2025-고양덕양구-0992호</li>
          <li>주소: 경기도 고양시 덕양구 원흥3로 16 904호</li>
          <li>이메일: oracle7579@gmail.com</li>
          <li>전화: 010-4414-7579</li>
          <li>운영 시간: 평일 10:00 ~ 18:00 (주말/공휴일 휴무, 이메일 문의는 24시간 접수)</li>
        </ul>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h3>
      <div style={{ color: 'var(--muted, #444)', margin: 0 }}>{children}</div>
    </div>
  )
}
