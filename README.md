# 센드잇 (SendIt)

Instagram DM 자동화 플랫폼 by 소프트캣

## 주요 기능

- 키워드 기반 자동 DM 응답
- 플로우 빌더 (댓글 -> DM 자동화)
- 브로드캐스트 & 시퀀스
- 연락처 관리
- 라이브 채팅
- 분석 대시보드
- 팀 멤버 관리 (OWNER / ADMIN / MEMBER / VIEWER)
- Stripe 결제 (FREE / PRO / ENTERPRISE)

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Spring Boot 3.4.4, Java 21, MySQL 8 |
| Frontend | React 19, Vite 5 |
| 인증 | JWT + 이메일 인증 |
| 결제 | Stripe (구독 / 웹훅) |
| 실시간 | WebSocket (STOMP + SockJS) |
| 마이그레이션 | Flyway |
| 테스트 | JUnit 5, Vitest |
| 배포 | Docker & Docker Compose |

## 빠른 시작

### 사전 요구사항

- Docker & Docker Compose
- (개발용) JDK 21+, Node.js 20+

### Docker로 실행

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 각 항목을 실제 값으로 설정

# 2. 컨테이너 실행
docker compose up -d

# 3. 접속
# Frontend: http://localhost
# Backend API: http://localhost:8080
```

### 개발 환경

#### 백엔드

```bash
cd backend
./gradlew bootRun
# H2 인메모리 DB 사용 (dev 프로필)
# http://localhost:8080
```

#### 프론트엔드

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### 테스트

```bash
# 백엔드
cd backend && ./gradlew test

# 프론트엔드
cd frontend && npm test
```

## 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 비밀번호 | (필수) |
| `MYSQL_DATABASE` | 데이터베이스 이름 | `sendit` |
| `MYSQL_USER` | MySQL 사용자 | `sendit` |
| `MYSQL_PASSWORD` | MySQL 비밀번호 | (필수) |
| `JWT_SECRET` | JWT 서명 키 (256bit 이상) | (필수) |
| `INSTAGRAM_APP_ID` | Instagram App ID | (필수) |
| `INSTAGRAM_APP_SECRET` | Instagram App Secret | (필수) |
| `INSTAGRAM_OAUTH_REDIRECT_URI` | OAuth 콜백 URL | `http://localhost:8080/api/auth/instagram/callback` |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | 웹훅 검증 토큰 | (필수) |
| `STRIPE_SECRET_KEY` | Stripe Secret Key | (필수) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key | (필수) |
| `STRIPE_WEBHOOK_SECRET` | Stripe 웹훅 시크릿 | (필수) |
| `STRIPE_PRICE_PRO` | Pro 플랜 Price ID | (필수) |
| `STRIPE_PRICE_ENTERPRISE` | Enterprise 플랜 Price ID | (필수) |
| `MAIL_HOST` | SMTP 호스트 | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP 포트 | `587` |
| `MAIL_USERNAME` | SMTP 사용자 | (필수) |
| `MAIL_PASSWORD` | SMTP 비밀번호 (앱 비밀번호) | (필수) |
| `APP_BASE_URL` | 프론트엔드 URL | `http://localhost:5173` |
| `CORS_ALLOWED_ORIGINS` | CORS 허용 도메인 | `http://localhost:5173,http://localhost:3000` |
| `ENCRYPTION_SECRET` | AES-256 암호화 키 | (필수) |

## 프로젝트 구조

```
sendit/
├── backend/
│   └── src/main/
│       ├── java/com/instabot/backend/
│       │   ├── config/          # Security, WebSocket, CORS 설정
│       │   ├── controller/      # REST API 컨트롤러
│       │   ├── dto/             # 요청/응답 DTO
│       │   ├── entity/          # JPA 엔티티
│       │   ├── repository/      # Spring Data JPA
│       │   ├── service/         # 비즈니스 로직
│       │   └── exception/       # 예외 처리
│       └── resources/
│           ├── db/migration/    # Flyway 마이그레이션
│           └── application*.yml # 환경별 설정
├── frontend/
│   └── src/
│       ├── api/                 # API 클라이언트
│       ├── components/          # React 컴포넌트
│       ├── layouts/             # 레이아웃
│       ├── pages/               # 페이지 컴포넌트
│       └── styles/              # CSS 스타일
└── docker-compose.yml
```

## API 엔드포인트

| 그룹 | 경로 | 설명 |
|------|------|------|
| 인증 | `/api/auth/**` | 회원가입, 로그인, 이메일 인증 |
| 사용자 | `/api/users/**` | 프로필 관리 |
| 자동화 | `/api/automations/**` | 키워드 자동 응답 |
| 플로우 | `/api/flows/**` | 플로우 빌더 |
| 브로드캐스트 | `/api/broadcasts/**` | 대량 메시지 |
| 시퀀스 | `/api/sequences/**` | 시퀀스 메시지 |
| 연락처 | `/api/contacts/**` | 연락처 관리 |
| 대화 | `/api/conversations/**` | 라이브 채팅 |
| 대시보드 | `/api/dashboard/**` | 대시보드 데이터 |
| 분석 | `/api/analytics/**` | 분석 리포트 |
| 결제 | `/api/billing/**` | 구독 관리 |
| 팀 | `/api/teams/**` | 팀 멤버 관리 |
| 템플릿 | `/api/templates/**` | 메시지 템플릿 |
| 연동 | `/api/integrations/**` | 외부 서비스 연동 |
| Instagram | `/api/auth/instagram/**` | Instagram OAuth |
| 웹훅 | `/api/webhooks/**` | Instagram 웹훅 |
| Stripe 웹훅 | `/api/stripe/webhook` | Stripe 웹훅 |

## 배포

### Docker Compose (권장)

```bash
# 1. 서버에 프로젝트 클론
git clone <repo-url>
cd sendit

# 2. 환경변수 설정
cp .env.example .env
vi .env  # 운영 환경 값 설정

# 3. 빌드 및 실행
docker compose up -d --build

# 4. 로그 확인
docker compose logs -f

# 5. 중지
docker compose down
```

### 운영 프로필

운영 환경에서는 `SPRING_PROFILES_ACTIVE=prod`로 설정하면:
- Flyway 마이그레이션 자동 실행
- JPA ddl-auto: validate (스키마 직접 변경 방지)
- SQL 로그 비활성화
- 응답 압축 활성화
- Actuator health/info만 노출

## 라이선스

Private - 소프트캣
