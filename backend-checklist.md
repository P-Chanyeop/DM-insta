# 백엔드 구현 체크리스트

> 현재 상태: **API 스켈레톤 완성 (~50%)**, 실제 동작 로직 미구현
> 기술 스택: Spring Boot 3.4.4 / Java 21 / H2(개발) + PostgreSQL(운영) / JWT 인증

---

## Phase 1: 기본 동작 (프론트엔드 연동 가능)

### 1-1. 치명적 버그 수정
- [ ] **DashboardService 누락 필드**: `totalMessagesSent`, `avgOpenRate`, `avgClickRate` 항상 0 반환 → Message/Flow 데이터에서 집계하도록 수정
- [ ] **글로벌 예외 처리기 없음**: `@ControllerAdvice` 추가. 현재 RuntimeException이 500으로 그대로 나감
  - `ResourceNotFoundException` → 404
  - `BadRequestException` → 400
  - `DuplicateEmailException` → 409
  - 기타 → 500 + 한국어 에러 메시지
- [ ] **DTO 유효성 검증 누락**: AuthDto만 `@Valid` 있고 나머지 DTO에 검증 없음
  - FlowDto.CreateRequest: `name` @NotBlank, `triggerType` @NotBlank
  - BroadcastDto.CreateRequest: `name` @NotBlank, `messageContent` @NotBlank
  - AutomationDto.CreateRequest: `name` @NotBlank, `type` @NotBlank
  - ContactDto.UpdateRequest: `tags` 길이 제한
  - SequenceDto.CreateRequest: `name` @NotBlank
- [ ] **JWT 시크릿 하드코딩**: application.yml에 시크릿 키가 직접 노출됨 → 환경변수(`${JWT_SECRET}`)로 변경

### 1-2. 프론트엔드 ↔ 백엔드 연동 테스트
- [ ] **프론트엔드 API Base URL 확인**: `VITE_API_BASE_URL=http://localhost:8080/api`
- [ ] **CORS 설정 확인**: localhost:5173 허용 여부 재확인
- [ ] **회원가입 → 로그인 → 토큰 발급 → 보호 API 호출** 전체 흐름 수동 테스트
- [ ] **Flow CRUD 전체 흐름 테스트**: 생성 → 목록 → 수정 → 토글 → 삭제
- [ ] **FlowDto.Response에 `flowData` 필드 확인**: 프론트에서 JSON.parse(flowData) 하므로 문자열로 반환해야 함

### 1-3. 데이터베이스 전환 (H2 → PostgreSQL)
- [ ] PostgreSQL 설치 및 DB 생성 (`instabot_db`)
- [ ] `application.yml`에 PostgreSQL 프로필 설정
- [ ] Flyway 또는 Liquibase 마이그레이션 도입 (ddl-auto:update는 운영에서 위험)
- [ ] 초기 스키마 마이그레이션 SQL 작성

---

## Phase 2: 핵심 비즈니스 로직

### 2-1. Instagram API 연동
- [ ] **Facebook/Instagram 앱 등록**: Meta Developer Console에서 앱 생성
- [ ] **Instagram Graph API 연동 서비스** 생성 (`InstagramApiService`)
  - [ ] OAuth 2.0 인증 플로우 (Facebook Login → Instagram 권한 요청)
  - [ ] Access Token 발급 및 저장 (`InstagramAccount` 엔티티 활용)
  - [ ] Long-lived Token 교환 (60일 유효)
  - [ ] Token 자동 갱신 스케줄러
- [ ] **Instagram Messaging API** 연동
  - [ ] DM 보내기: `POST /{ig-user-id}/messages`
  - [ ] 메시지 타입: 텍스트, 버튼(Quick Reply), 링크(Generic Template)
  - [ ] Ice Breaker 설정 API
  - [ ] Welcome Message 설정 API
- [ ] **Instagram Webhook** 수신 서버 구축
  - [ ] Webhook 검증 엔드포인트: `GET /api/webhook` (challenge 응답)
  - [ ] 이벤트 수신: `POST /api/webhook`
  - [ ] 구독 이벤트: `messages`, `messaging_postbacks`, `comments`
  - [ ] 이벤트 파싱 및 핸들러 분배

### 2-2. 자동화 플로우 실행 엔진
- [ ] **FlowExecutionService** 생성 — 플로우의 각 단계를 순서대로 실행
  - [ ] 트리거 매칭: 키워드 포함/정확히 일치/모든 댓글
  - [ ] 제외 키워드 필터링
  - [ ] 게시물 타겟 필터링 (모든 게시물/다음/특정)
- [ ] **오프닝 DM 발송**
  - [ ] 버튼(Quick Reply) 포함 메시지 전송
  - [ ] 버튼 탭 이벤트(postback) 수신 → 다음 단계 트리거
  - [ ] 24시간 대화창 오픈 확인
- [ ] **공개 댓글 답장**
  - [ ] Instagram Graph API로 댓글 자동 답장: `POST /{comment-id}/replies`
  - [ ] 복수 답장 등록 시 랜덤 선택
- [ ] **팔로우 확인**
  - [ ] Instagram API로 팔로우 상태 조회
  - [ ] 미팔로우 시 안내 메시지 발송
  - [ ] 팔로우 후 재요청 시 다음 단계 진행
- [ ] **이메일 수집**
  - [ ] 이메일 요청 메시지 발송
  - [ ] 사용자 응답에서 이메일 추출 (정규식 매칭)
  - [ ] Contact 엔티티에 이메일 저장
- [ ] **메인 DM (링크 포함) 발송**
  - [ ] Generic Template으로 링크 버튼 포함 메시지 전송
  - [ ] 최대 3개 링크 버튼
- [ ] **팔로업 메시지**
  - [ ] 지연 발송 스케줄러 (분/시간/일 단위)
  - [ ] Spring Scheduler 또는 Quartz Job 활용
  - [ ] 발송 완료/실패 상태 추적

### 2-3. 자동화 트리거 리스너
- [ ] **댓글 트리거**: Webhook으로 댓글 수신 → 키워드 매칭 → 플로우 실행
- [ ] **DM 키워드 트리거**: Webhook으로 DM 수신 → 키워드 매칭 → 플로우 실행
- [ ] **스토리 멘션 트리거**: Webhook으로 멘션 수신 → 플로우 실행
- [ ] **스토리 답장 트리거**: Webhook으로 스토리 답장 수신 → 플로우 실행
- [ ] **환영 메시지 트리거**: 최초 DM 감지 → 환영 플로우 실행
- [ ] **중복 실행 방지**: 동일 사용자에 대해 같은 플로우가 중복 실행되지 않도록 처리

### 2-4. 대화(Conversation) 관리
- [ ] **Webhook 메시지 수신 시 Conversation 자동 생성/업데이트**
- [ ] **Message 엔티티에 수신/발신 메시지 저장**
- [ ] **Conversation 상태 관리**: OPEN → CLOSED → SNOOZED
- [ ] **WebSocket으로 실시간 메시지 푸시** (라이브챗 페이지용)
  - [ ] `/topic/conversations/{userId}` 채널로 새 메시지 알림
  - [ ] `/topic/messages/{conversationId}` 채널로 메시지 스트림

---

## Phase 3: 부가 기능

### 3-1. 브로드캐스트 발송
- [ ] **즉시 발송**: 생성 시 `scheduledAt` 없으면 즉시 발송 시작
  - [ ] 대상 세그먼트 필터링 (ALL/VIP/NEW/ACTIVE)
  - [ ] Contact 목록 조회 → 순차 DM 발송
  - [ ] 발송 진행률 추적 (sentCount 실시간 업데이트)
  - [ ] Instagram API Rate Limit 준수 (200 calls/hour)
- [ ] **예약 발송**: `scheduledAt` 시간에 자동 시작
  - [ ] Spring @Scheduled 또는 Quartz Job
  - [ ] 상태 전이: SCHEDULED → SENDING → SENT
- [ ] **발송 취소**: SCHEDULED 상태에서만 취소 가능
- [ ] **발송 통계**: openCount, clickCount 추적 (링크 클릭 추적 URL 필요)

### 3-2. 시퀀스 실행
- [ ] **시퀀스 등록 시 대상 Contact 매핑**
- [ ] **Step별 지연시간(delayMinutes) 후 메시지 발송**
- [ ] **진행 상태 추적**: enrolled / inProgress / completed
- [ ] **조건 분기 Step 지원** (type: CONDITION)
- [ ] **태그 부여 Step 지원** (type: TAG)

### 3-3. 분석/통계
- [ ] **DashboardService 완성**
  - [ ] `totalMessagesSent`: Message 테이블에서 OUTBOUND 카운트
  - [ ] `avgOpenRate`: 모든 Flow의 openRate 평균
  - [ ] `avgClickRate`: 링크 클릭률 계산
- [ ] **AnalyticsService** 생성 (기간별 통계)
  - [ ] 일별 메시지 발송 수
  - [ ] 일별 신규 구독자 수
  - [ ] 플로우별 성과 (발송/열림/클릭)
  - [ ] 기간 필터: 7d / 30d / 90d
- [ ] **링크 클릭 추적**: 링크를 리다이렉트 URL로 래핑 → 클릭 카운트 → 원본 URL 리다이렉트

### 3-4. 그로스 툴
- [ ] **Ref Link 생성**: 고유 URL → 클릭 시 DM 자동화 시작
- [ ] **QR 코드 생성**: Ref Link 기반 QR 코드 이미지 생성
- [ ] **Website Widget**: 삽입용 HTML/JS 코드 생성
- [ ] **JSON API**: 외부 시스템에서 자동화 트리거용 API

### 3-5. 템플릿 시스템
- [ ] **기본 템플릿 시드 데이터** 생성 (쇼핑몰, 예약, 이벤트, 리드수집, 고객지원)
- [ ] **"사용하기" 시 Flow 자동 생성**: 템플릿의 flowData를 복사해서 새 Flow 생성
- [ ] **사용 횟수/평점 집계**

### 3-6. 연동(Integration)
- [ ] **Instagram 연동**: OAuth 플로우 + 계정 정보 동기화
- [ ] **Webhook 연동**: 외부 URL로 이벤트 POST 전송
- [ ] **Shopify 연동** (선택): 주문 이벤트 → 자동 DM
- [ ] **Google Sheets 연동** (선택): 수집된 이메일/데이터 자동 기록

---

## Phase 4: 안정성 & 운영

### 4-1. 테스트
- [ ] **단위 테스트**
  - [ ] AuthService (회원가입/로그인/토큰생성)
  - [ ] FlowService (CRUD/토글/타입파싱)
  - [ ] AutomationService (CRUD/키워드매칭)
  - [ ] FlowExecutionService (플로우 실행 로직)
  - [ ] DashboardService (통계 집계)
- [ ] **통합 테스트**
  - [ ] AuthController (회원가입 → 로그인 → 토큰검증)
  - [ ] FlowController (전체 CRUD 흐름)
  - [ ] 인증 필터 (유효/만료/없는 토큰)
- [ ] **Instagram API 모킹 테스트**
  - [ ] WireMock으로 Instagram API 응답 모킹
  - [ ] Webhook 수신 → 플로우 실행 E2E 테스트

### 4-2. 보안
- [ ] JWT Secret → 환경변수로 이동
- [ ] DB 비밀번호 → 환경변수로 이동
- [ ] Instagram Access Token 암호화 저장 (AES-256)
- [ ] API Rate Limiting 적용 (Spring Bucket4j 또는 커스텀 필터)
- [ ] WebSocket 인증 필터 추가 (현재 모든 origin 허용 중)
- [ ] Input Sanitization (XSS 방지)
- [ ] HTTPS 설정 (운영 환경)

### 4-3. 인프라 & 배포
- [ ] Docker 설정 (`Dockerfile`, `docker-compose.yml`)
  - [ ] Backend (Spring Boot)
  - [ ] PostgreSQL
  - [ ] Redis (선택: 캐싱/Rate Limit/세션)
- [ ] 환경별 프로필 분리 (`application-dev.yml`, `application-prod.yml`)
- [ ] 로깅 설정 (Logback + 파일 출력)
- [ ] 헬스체크 엔드포인트 (`/actuator/health`)
- [ ] CI/CD 파이프라인 (GitHub Actions)
- [ ] 모니터링 (Prometheus + Grafana 또는 최소한 에러 알림)

### 4-4. 성능
- [ ] 대량 발송 시 비동기 처리 (`@Async` + ThreadPoolExecutor)
- [ ] Instagram API Rate Limit 핸들링 (429 응답 시 재시도 큐)
- [ ] DB 인덱스 최적화 (userId + createdAt 복합 인덱스 등)
- [ ] 응답 캐싱 (Dashboard 통계 등 변경 빈도 낮은 데이터)

---

## 현재 백엔드 완성도

| 영역 | 상태 | 완성도 |
|------|------|--------|
| API 컨트롤러 (10개) | 전체 엔드포인트 구현 완료 | 90% |
| 엔티티/데이터 모델 (14개) | 전체 완성, 관계 매핑 완료 | 90% |
| 리포지토리 (13개) | 기본 쿼리 완성 | 90% |
| 서비스 비즈니스 로직 | CRUD 완성, 실행 로직 없음 | 50% |
| JWT 인증 | 동작하지만 보안 개선 필요 | 70% |
| DTO 검증 | AuthDto만 검증, 나머지 없음 | 20% |
| Instagram API 연동 | 엔티티만 있고 연동 없음 | 0% |
| 자동화 실행 엔진 | 미구현 | 0% |
| 테스트 | 없음 | 0% |
| 배포/인프라 | 없음 | 0% |

---

## 우선순위 요약

| 순서 | 내용 | 예상 기간 |
|------|------|-----------|
| **Phase 1** | 버그 수정 + 프론트 연동 + DB 전환 | 1~2일 |
| **Phase 2** | Instagram API + 플로우 실행 엔진 + 트리거 | 2~3주 |
| **Phase 3** | 브로드캐스트 + 시퀀스 + 통계 + 부가기능 | 2~3주 |
| **Phase 4** | 테스트 + 보안 + 배포 + 성능 | 1~2주 |

**→ 프론트 연동만: Phase 1 (1~2일)**
**→ 실제 DM 자동화: Phase 1+2 (2~3주)**
**→ 전체 완성: Phase 1~4 (1~2개월)**
