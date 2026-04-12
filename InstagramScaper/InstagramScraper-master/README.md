# 🚀 인플루언서허브 (InfluencerHub)

> AI 기반 인스타그램 인플루언서 발굴 및 분석 플랫폼

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.java.net/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-success.svg)]()

## 📋 프로젝트 개요

**인플루언서허브**는 인스타그램 데이터 분석을 통해 최적의 인플루언서를 발굴하고, 브랜드와 인플루언서를 효과적으로 연결하는 SaaS 플랫폼입니다.

### 🎯 핵심 가치
- **데이터 기반 인사이트**: AI 분석을 통한 정확한 인플루언서 평가
- **실시간 트렌드 분석**: 급상승 인플루언서 조기 발굴
- **ROI 최적화**: 마케팅 투자 대비 최대 효과 보장
- **원스톱 솔루션**: 발굴부터 매칭까지 통합 서비스

## 🛠 기술 스택

### 백엔드
- **Java 17** - 최신 LTS 버전으로 안정성과 성능 보장
- **Spring Boot 3.5.4** - 현대적인 웹 애플리케이션 프레임워크
- **Spring Security** - 강력한 인증 및 보안 시스템
- **Spring Data JPA** - 효율적인 데이터 접근 계층
- **MySQL** - 안정적인 관계형 데이터베이스
- **Redis** - 고성능 캐싱 및 세션 관리

### 프론트엔드
- **Thymeleaf** - 서버사이드 템플릿 엔진
- **Bootstrap 5** - 반응형 UI 프레임워크
- **Chart.js** - 데이터 시각화
- **JavaScript ES6+** - 모던 클라이언트 사이드 개발

### 인프라
- **Docker** - 컨테이너화 및 배포
- **AWS EC2** - 클라우드 서버 호스팅
- **AWS RDS** - 관리형 데이터베이스
- **AWS S3** - 파일 저장 및 CDN

## 🚀 주요 기능

### 🔍 인플루언서 발굴
- **지능형 검색**: 카테고리, 팔로워 수, 참여율 기반 필터링
- **트렌드 분석**: 실시간 급상승 인플루언서 탐지
- **경쟁사 분석**: 타 브랜드 협업 인플루언서 분석

### 📊 데이터 분석
- **참여율 분석**: 좋아요, 댓글, 공유 비율 계산
- **오디언스 분석**: 팔로워 연령대, 성별, 지역 분포
- **콘텐츠 분석**: 해시태그 트렌드 및 게시물 성과

### 💼 비즈니스 도구
- **매칭 시스템**: AI 기반 브랜드-인플루언서 매칭
- **ROI 예측**: 협업 성과 사전 시뮬레이션
- **캠페인 관리**: 프로젝트 진행 상황 추적

## 💰 수익 모델

### 구독 기반 SaaS
| 플랜 | 가격 | 기능 |
|------|------|------|
| **베이직** | 월 29,000원 | 100개 인플루언서 검색, 기본 분석 |
| **프로** | 월 99,000원 | 1,000개 검색, 고급 분석, 매칭 추천 |
| **엔터프라이즈** | 월 299,000원 | 무제한 검색, API 접근, 전담 지원 |

### 추가 수익원
- **매칭 수수료**: 성공적인 협업 성사 시 10% 수수료
- **프리미엄 리포트**: 상세 인사이트 분석 보고서 판매
- **컨설팅 서비스**: 인플루언서 마케팅 전략 컨설팅

## 📋 요구사항 분석

### 🎯 핵심 비즈니스 목표
- **인플루언서 발굴 자동화**: 수동 검색에서 AI 기반 자동 발굴로 전환
- **데이터 기반 의사결정**: 직감이 아닌 객관적 지표 기반 인플루언서 선택
- **매칭 효율성 극대화**: 브랜드 특성에 맞는 최적 인플루언서 매칭
- **수익 창출**: SaaS 구독 모델과 매칭 수수료를 통한 지속 가능한 수익 구조

### 🔍 주요 기능 요구사항

#### 사용자 관리
- 이메일/소셜 로그인 (구글, 카카오)
- 역할 기반 접근 제어 (RBAC)
- 구독 플랜별 기능 제한

#### 데이터 수집 및 분석
- 인스타그램 프로필 정보 스크래핑 (30초/프로필)
- 게시물 데이터 수집 (좋아요, 댓글, 해시태그)
- 참여율 계산 및 팔로워 품질 분석
- 우선순위 기반 스케줄링 (PREMIUM → HIGH → MEDIUM → LOW)

#### 검색 및 필터링
- 카테고리별 검색 (뷰티, 패션, 음식 등)
- 팔로워 수, 참여율, 지역별 필터
- AI 추천 점수 기반 정렬

#### 분석 및 리포트
- 인플루언서 성장 추이 분석
- 오디언스 분석 (연령, 성별, 지역)
- ROI 예측 시뮬레이션

### ⚡ 성능 요구사항
- **응답 시간**: 페이지 로딩 3초, 검색 2초, API 500ms 이내
- **동시 사용자**: 1,000명 지원
- **가용성**: 99.9% 업타임 보장
- **데이터 처리**: 시간당 10,000개 프로필 처리

### 🔒 보안 요구사항
- HTTPS 강제 적용 및 JWT 토큰 인증
- 개인정보 암호화 저장 및 GDPR 준수
- API Rate Limiting 및 SQL Injection 방지

## 🏗 시스템 설계

### 🎯 아키텍처 결정사항
- **전체 구조**: 모놀리식 아키텍처 (MVP 빠른 개발)
- **레이어 구조**: 4-Layer 도메인 중심 아키텍처
- **패키지 구조**: Domain-First 패키지 구성
- **데이터베이스**: 단일 MySQL 데이터베이스
- **Entity 설계**: Rich Domain Model (객체지향적 접근)

### 🔐 인증/인가 시스템
- **인증 방식**: JWT 토큰 기반 인증
- **확장성**: 웹 서비스 + API 제공 대응
- **보안**: Access Token + Refresh Token 구조
- **저장**: HttpOnly 쿠키 (XSS 방지)

### 🚀 스크래핑 엔진 아키텍처
- **처리 방식**: Optimistic UI + 큐 기반 스크래핑
- **사용자 경험**: 즉시 플레이스홀더 응답 → 실시간 업데이트
- **실시간 통신**: Server-Sent Events (SSE)
- **캐싱 전략**: 스마트 캐싱 (데이터 신선도 기반)

### 📊 기술적 구현 전략
- **비동기 처리**: Redis 큐 + Spring @Async
- **우선순위 스케줄링**: PREMIUM → HIGH → MEDIUM → LOW
- **에러 처리**: 글로벌 예외 처리 + 재시도 로직
- **모니터링**: 실시간 작업 상태 추적

## 📅 개발 로드맵

### 1단계: MVP (4주)
- [x] 프로젝트 설정 및 기본 구조
- [x] 요구사항 분석 완료
- [x] 시스템 설계 및 아키텍처 완료
- [x] 의존성 설정 및 H2 데이터베이스 구성
- [x] Domain-First 패키지 구조 생성
- [x] User Entity 및 구독 플랜 시스템 구현
- [x] User Entity 포괄적 테스트 작성 (27개 테스트)
- [ ] Influencer Entity 구현
- [ ] 사용자 인증 시스템 (JWT)
- [ ] 인플루언서 검색 기능
- [ ] 기본 대시보드

### 2단계: 고급 기능 (4주)
- [ ] 데이터 스크래핑 엔진
- [ ] 고급 분석 도구
- [ ] 결제 시스템 통합
- [ ] 모바일 반응형 UI

### 3단계: 확장 (4주)
- [ ] AI 매칭 알고리즘
- [ ] 실시간 알림 시스템
- [ ] API 서비스 제공
- [ ] 다국어 지원

## 🏗 프로젝트 구조

```
src/
├── main/
│   ├── java/com/softcat/instagramscraper/
│   │   ├── config/          # 설정 클래스
│   │   ├── controller/      # REST API 컨트롤러
│   │   ├── service/         # 비즈니스 로직
│   │   ├── repository/      # 데이터 접근 계층
│   │   ├── entity/          # JPA 엔티티
│   │   ├── dto/             # 데이터 전송 객체
│   │   ├── security/        # 보안 설정
│   │   └── scraper/         # 스크래핑 엔진
│   └── resources/
│       ├── templates/       # Thymeleaf 템플릿
│       ├── static/          # 정적 리소스
│       └── application.yml  # 애플리케이션 설정
└── test/                    # 테스트 코드
```

## 🚦 시작하기

### 필수 요구사항
- Java 17 이상
- MySQL 8.0 이상
- Redis 6.0 이상
- Gradle 7.0 이상

### 로컬 개발 환경 설정

1. **저장소 클론**
```bash
git clone https://github.com/your-username/InstagramScraper.git
cd InstagramScraper
```

2. **데이터베이스 설정**
```bash
# MySQL 데이터베이스 생성
mysql -u root -p
CREATE DATABASE influencer_hub;
```

3. **애플리케이션 실행**
```bash
./gradlew bootRun
```

4. **브라우저에서 확인**
```
http://localhost:8080
```

## 🧪 테스트

```bash
# 전체 테스트 실행
./gradlew test

# User 테스트만 실행
./gradlew test --tests "com.softcat.instagramscraper.user.entity.UserTest"

# 특정 테스트 메서드만 실행
./gradlew test --tests "UserTest.비밀번호_암호화_성공"
```

### 📊 현재 테스트 현황
- ✅ **User Entity**: 27개 테스트 (100% 통과)
  - 사용자 생성 테스트 (3개)
  - 비밀번호 관리 테스트 (4개)
  - 검색 기능 테스트 (4개)
  - 구독 플랜 관리 (3개)
  - 계정 상태 관리 (3개)
  - JWT 토큰 관리 (5개)
  - 권한 확인 (2개)
  - 엣지 케이스 (3개)

### 🏗 현재 구현 현황
- ✅ **Domain-First 패키지 구조**: 비즈니스 도메인별 모듈화
- ✅ **User 도메인 완료**: Rich Domain Model 패턴 적용
  - User Entity (비즈니스 로직 포함)
  - SubscriptionPlanConfig Entity (동적 플랜 관리)
  - UserRole, SubscriptionPlan Enum
  - 포괄적인 Unit Test (27개)
- ✅ **기술 스택 설정**: Spring Boot 3.5.4, Java 17, H2 Database
- ✅ **의존성 구성**: Security, JPA, Redis, JWT, Selenium, OpenAPI
- 🔄 **다음 단계**: Influencer Entity 구현 예정

## 📈 성능 지표

### 목표 KPI
- **월간 활성 사용자**: 1,000명 (3개월 내)
- **사용자 유지율**: 70% (1개월)
- **평균 세션 시간**: 15분
- **구독 전환율**: 5%

### 기술적 목표
- **응답 시간**: 평균 200ms 이하
- **가용성**: 99.9% 업타임
- **동시 사용자**: 1,000명 지원

## 🔒 보안 및 개인정보보호

- **HTTPS 강제 적용**: 모든 통신 암호화
- **JWT 토큰 인증**: 안전한 사용자 세션 관리
- **GDPR 준수**: 유럽 개인정보보호법 완전 준수
- **데이터 익명화**: 개인 식별 정보 보호

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 연락처

- **개발팀**: softcat@dev
- **비즈니스 문의**: oracle7579@gmail.com
- **기술 지원**: oracle7579@gmail.com

## 🙏 감사의 말

- [Spring Boot](https://spring.io/projects/spring-boot) - 강력한 Java 프레임워크
- [Bootstrap](https://getbootstrap.com/) - 아름다운 UI 컴포넌트
- [Chart.js](https://www.chartjs.org/) - 데이터 시각화 라이브러리

---

⭐ **이 프로젝트가 도움이 되셨다면 Star를 눌러주세요!**

*Made with ❤️ by the Softcat Team*
