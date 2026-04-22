import { useLocation, Link } from 'react-router-dom'

export default function LegalPage() {
  const location = useLocation()
  const isTerms = location.pathname === '/terms'

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

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        {isTerms ? '이용약관' : '개인정보 처리방침'}
      </h1>
      <p style={{ color: 'var(--muted, #666)', marginBottom: '2rem' }}>
        최종 수정일: 2026년 4월 19일
      </p>

      {isTerms ? <TermsContent /> : <PrivacyContent />}

      <div style={{ borderTop: '1px solid #eee', marginTop: '3rem', paddingTop: '1.5rem', color: 'var(--muted, #888)', fontSize: '0.85rem' }}>
        <p>센드잇 (SendIt) | 문의: oracle7579@gmail.com</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <Link to="/terms" style={{ color: 'var(--primary, #6366f1)' }}>이용약관</Link>
          <Link to="/privacy" style={{ color: 'var(--primary, #6366f1)' }}>개인정보 처리방침</Link>
        </div>
      </div>
    </div>
  )
}

function TermsContent() {
  return (
    <div style={{ lineHeight: 1.8 }}>
      <Section title="제 1조 (목적)">
        본 약관은 센드잇(SendIt, 이하 "회사")이 제공하는 Instagram DM 자동화 서비스(이하 "서비스")의
        이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
      </Section>

      <Section title="제 2조 (정의)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>"서비스"란 센드잇이 제공하는 Instagram DM 자동 발송, 댓글 자동 응답, 키워드 자동 응답, 팔로워 관리, 브로드캐스트, 성장 도구 등 소셜 미디어 자동화 기능 일체를 의미합니다.</li>
          <li>"이용자"란 본 약관에 따라 서비스에 가입하여 서비스를 이용하는 자를 의미합니다.</li>
          <li>"콘텐츠"란 이용자가 서비스를 통해 생성, 전송하는 메시지, 이미지, 링크 등을 의미합니다.</li>
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

      <Section title="제 5조 (서비스 요금 및 결제)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>서비스는 무료 플랜(Free)과 유료 플랜(Starter, Pro, Business)을 제공합니다.</li>
          <li>결제는 Portone(다날 PG)을 통해 처리되며, 등록된 신용카드로 매월 자동 청구됩니다.</li>
          <li>구독 해지 시 현재 결제 주기 종료까지 서비스를 이용할 수 있으며, 이후 Free 플랜으로 전환됩니다.</li>
          <li>환불은 결제일로부터 7일 이내에 서비스를 사용하지 않은 경우에 한해 「전자상거래법」에 따라 청구 가능합니다.</li>
        </ol>
      </Section>

      <Section title="제 6조 (서비스 변경 및 중단)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>회사는 서비스 개선을 위해 기능을 변경하거나 추가할 수 있습니다.</li>
          <li>Instagram API 정책 변경, 서버 점검 등으로 서비스가 일시 중단될 수 있습니다.</li>
          <li>서비스 변경 시 사전 공지하며, 긴급한 경우 사후 공지할 수 있습니다.</li>
        </ol>
      </Section>

      <Section title="제 7조 (면책)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>Instagram/Meta API 변경, 장애 등 외부 요인으로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.</li>
          <li>이용자가 발송한 콘텐츠로 인해 발생하는 분쟁에 대해 회사는 책임을 지지 않습니다.</li>
          <li>이용자의 계정 관리 소홀로 인한 피해에 대해 회사는 책임을 지지 않습니다.</li>
        </ol>
      </Section>

      <Section title="제 8조 (지적재산권)">
        서비스에 포함된 소프트웨어, 디자인, 로고, 콘텐츠 등의 지적재산권은 회사에 귀속됩니다.
        이용자가 서비스를 통해 생성한 콘텐츠의 권리는 이용자에게 있습니다.
      </Section>

      <Section title="제 9조 (계정 탈퇴)">
        <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li>이용자는 설정 페이지에서 언제든지 계정을 탈퇴할 수 있습니다.</li>
          <li>탈퇴 시 모든 데이터는 즉시 삭제되며, 복구할 수 없습니다.</li>
          <li>유료 구독 중 탈퇴 시 남은 기간에 대한 환불은 제공되지 않습니다.</li>
        </ol>
      </Section>

      <Section title="제 10조 (분쟁 해결)">
        본 약관에 관한 분쟁은 대한민국 법률에 따르며, 관할 법원은 회사 소재지 관할 법원으로 합니다.
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
          <li>이메일 주소, 이름 (이메일 가입 시)</li>
          <li>Instagram 사용자명, 프로필 사진 (Instagram 로그인 시)</li>
        </ul>
        <p style={{ margin: '0.3rem 0', fontWeight: 600 }}>나. Instagram 계정 연동 시</p>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>Instagram 사용자 ID, 사용자명, 프로필 사진 URL, 팔로워 수</li>
          <li>Instagram 액세스 토큰 (암호화 저장)</li>
        </ul>
        <p style={{ margin: '0.3rem 0', fontWeight: 600 }}>다. 서비스 이용 시 자동 수집</p>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>서비스 이용 기록, 접속 로그, IP 주소</li>
          <li>DM 발송 기록 (수신자 ID, 발송 시각, 발송 상태)</li>
        </ul>
      </Section>

      <Section title="2. 개인정보의 이용 목적">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>서비스 제공 및 계정 관리</li>
          <li>Instagram DM 자동화 기능 제공 (메시지 발송, 댓글 응답, 키워드 응답)</li>
          <li>서비스 개선 및 이용 통계 분석</li>
          <li>고객 지원 및 공지사항 전달</li>
          <li>결제 처리 및 구독 관리</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 보유 및 파기">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>회원 탈퇴 시 즉시 파기합니다.</li>
          <li>Instagram 연동 해제 시 해당 Instagram 토큰 및 계정 정보를 즉시 삭제합니다.</li>
          <li>관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관 후 파기합니다.</li>
          <li>- 전자상거래법: 계약/결제 기록 5년, 소비자 불만 기록 3년</li>
          <li>- 통신비밀보호법: 접속 로그 3개월</li>
        </ul>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.</li>
          <li>단, 다음의 경우 예외로 합니다:
            <ul style={{ paddingLeft: '1rem', margin: '0.3rem 0' }}>
              <li>Meta/Instagram: 서비스 제공을 위한 API 연동 (Instagram 사용자 ID, 메시지 내용)</li>
              <li>Portone(아임포트) / 다날: 결제 처리 (이메일 주소, 결제 정보)</li>
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
          <li>접근 권한 관리 및 로그 기록</li>
          <li>정기적 보안 점검</li>
        </ul>
      </Section>

      <Section title="6. 이용자의 권리">
        <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
          <li>이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다.</li>
          <li>설정 페이지에서 Instagram 연동을 해제할 수 있습니다.</li>
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

      <Section title="9. 개인정보 처리방침 변경">
        본 방침이 변경되는 경우 시행일 7일 전부터 서비스 내 공지사항을 통해 안내합니다.
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
