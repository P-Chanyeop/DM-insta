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
        최종 수정일: 2025년 1월 1일
      </p>

      {isTerms ? <TermsContent /> : <PrivacyContent />}
    </div>
  )
}

function TermsContent() {
  return (
    <div style={{ lineHeight: 1.8 }}>
      <Section title="제 1조 (목적)">
        본 약관은 센드잇(Sendit)(이하 "서비스")이 제공하는 Instagram DM 자동화 서비스의 이용과
        관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
      </Section>

      <Section title="제 2조 (정의)">
        "서비스"란 센드잇이 제공하는 Instagram DM 자동 발송, 댓글 자동 응답, 팔로워 관리 등
        소셜 미디어 자동화 기능 일체를 의미합니다.
        "이용자"란 본 약관에 따라 서비스를 이용하는 자를 의미합니다.
      </Section>

      <Section title="제 3조 (서비스 이용)">
        이용자는 Instagram/Meta의 정책을 준수하여 서비스를 이용해야 합니다.
        스팸, 사기, 불법 행위에 서비스를 사용할 수 없습니다.
        서비스는 Instagram API 정책 변경에 따라 기능이 변경될 수 있습니다.
      </Section>

      <Section title="제 4조 (개인정보 보호)">
        서비스는 이용자의 개인정보를 개인정보 처리방침에 따라 처리합니다.
        Instagram 계정 연동 시 필요한 최소한의 권한만 요청합니다.
      </Section>

      <Section title="제 5조 (면책)">
        서비스는 Instagram API 변경, 장애 등 외부 요인으로 인한 서비스 중단에 대해
        책임을 지지 않습니다.
      </Section>
    </div>
  )
}

function PrivacyContent() {
  return (
    <div style={{ lineHeight: 1.8 }}>
      <Section title="1. 수집하는 개인정보">
        이메일 주소, 이름 (회원가입 시),
        Instagram 계정 정보 (연동 시: 사용자명, 프로필 사진, 팔로워 수),
        서비스 이용 기록 및 접속 로그
      </Section>

      <Section title="2. 개인정보의 이용 목적">
        서비스 제공 및 운영,
        Instagram DM 자동화 기능 제공,
        서비스 개선 및 통계 분석
      </Section>

      <Section title="3. 개인정보의 보유 및 이용 기간">
        회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.
        관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
        단, Instagram API 연동을 위해 Meta Platform에 필요한 정보가 전달됩니다.
      </Section>

      <Section title="5. 개인정보의 안전성 확보 조치">
        비밀번호 암호화 저장 (BCrypt),
        Instagram 토큰 암호화 저장 (AES),
        SSL/TLS 통신 암호화,
        접근 권한 관리 및 로그 기록
      </Section>

      <Section title="6. 이용자의 권리">
        이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다.
        설정 페이지에서 Instagram 연결을 해제할 수 있습니다.
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: 'var(--muted, #444)', margin: 0 }}>{children}</p>
    </div>
  )
}
