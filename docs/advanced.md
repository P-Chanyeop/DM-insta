# 센드잇(SendIt) — 차별화 전략 및 기능 설계서

> 작성일: 2026-04-14  
> 목적: 경쟁사가 따라오기 어려운 차별점 도출 + 구현 설계

---

## 목차

1. [경쟁 환경 요약](#1-경쟁-환경-요약)
2. [현재 제품 진단](#2-현재-제품-진단)
3. [차별화 전략 (8가지)](#3-차별화-전략)
4. [기능별 상세 설계](#4-기능별-상세-설계)
5. [가격 전략](#5-가격-전략)
6. [스티키니스(이탈 방지) 설계](#6-스티키니스-설계)
7. [실행 로드맵](#7-실행-로드맵)

---

## 1. 경쟁 환경 요약

### 글로벌

| 플랫폼 | 가격 | 과금 방식 | 한국어 | 한국 결제 | 채널 수 |
|--------|------|----------|--------|----------|--------|
| ManyChat | $15~/월 | 컨택 수 | X | X | 7개 |
| Chatfuel | $20~/월 | 대화 수 | X | X | 3개 |
| MobileMonkey | $9.95~/월 | 컨택 수 | X | X | 4개 |

### 한국

| 플랫폼 | 가격 | 핵심 강점 | 핵심 약점 |
|--------|------|----------|----------|
| 소셜비즈 (NHN DATA) | 5,000원~/월 | Meta 공식 파트너, 저렴 | 기능 얕음, 공동구매 미지원 |
| 와이어디 | 베타 무료 | 공동구매 올인원 | DM 자동화 depth 부족, 미검증 |
| 키티챗 | 500 DM 무료 | 1분 설정, AI 답변 | 기능 단순, 플로우 빌더 없음 |
| 그램온 | 유료 | 대량 DM | 비공식 API, 계정 정지 위험 |

### ManyChat 핵심 약점 (센드잇 기회)

1. **과금 폭탄**: 스팸 봇도 컨택 카운트. 1,000→10,000명 시 $15→$145 급등. 사전 경고 없음
2. **한국어 완전 미지원**: UI/커뮤니티/학습자료 전부 영어
3. **한국 생태계 단절**: 스마트스토어, 카카오톡, 네이버페이 연동 없음
4. **불안정**: Meta API 업데이트 시 자동화 중단 사례 빈발. "Follow to DM" 대규모 장애
5. **고객 지원 부재**: 이메일만, 3~4주 미응답 보고 다수
6. **분석 기초적**: 외부 도구 없이는 심층 분석 불가

### 한국 인스타 셀러 핵심 페인포인트

1. **DM 수작업 지옥**: 주문접수/입금확인/배송안내를 모두 수동 DM으로 처리
2. **공동구매 관리 카오스**: 참여자 명단을 엑셀/수기로 관리, 오류 빈발
3. **24시간 응대 불가**: 놓치는 DM = 매출 손실
4. **플랫폼 파편화**: 인스타(관심) → 스마트스토어(결제) → 카카오톡(CS). 데이터 분리
5. **반복 질문 소진**: 가격/사이즈/배송일정 같은 FAQ에 시간 낭비
6. **자동화 무지**: 비즈니스 인사이트/자동화 기능의 존재 자체를 모르는 셀러 다수

---

## 2. 현재 제품 진단

### 완성도 매트릭스

| 기능 | 완성도 | 핵심 부족분 |
|------|--------|-----------|
| Flow Builder | 35% | 고급 노드 없음 (랜덤/API/복합 조건) |
| 메시지 타입 | 40% | 캐러셀/이미지/리치미디어 미지원 |
| Analytics | 25% | 노드별 분석, 퍼널, A/B 없음 |
| Templates | 50% | 유저 생성/공유 불가 |
| AI 연동 | 0% | 전혀 없음 |
| Billing | 60% | 플랜별 기능 제한 미적용 |
| 연락처 관리 | 50% | 스코어링/고급 세그먼트 없음 |
| 개인화(변수) | 0% | {이름}, {키워드} 등 변수 시스템 없음 |
| 멀티 계정 | 5% | 스키마만 존재, UI 없음 |
| Sequences | 40% | 빌더 UI 없음, 편집 불가 |

### 가장 시급한 기본기 (없으면 "제품"이 아닌 것들)

1. **메시지 변수**: {이름}, {키워드} — 모든 경쟁사가 지원하는 기본 기능
2. **플랜별 기능 제한**: 무료/유료 구분이 실제로 작동해야 과금 가능
3. **노드별 분석**: 플로우 최적화의 기본. 어디서 이탈하는지 모르면 개선 불가
4. **캐러셀 메시지**: Instagram API가 지원하는 Generic Template. 상품 카탈로그 필수
5. **고급 조건 분기**: 팔로워 여부 외에 태그/커스텀필드/시간 조건 필요

---

## 3. 차별화 전략

> 원칙: ManyChat을 따라가지 않는다. 한국 인스타 셀러가 "이건 나를 위해 만든 거다"라고 느끼게 한다.

### 차별점 1: 공동구매 풀사이클 자동화

**왜 하드투카피인가:**  
어떤 경쟁사도 공동구매 전체 과정을 DM 자동화로 해결하지 못함. 와이어디는 커머스 올인원이지만 DM depth가 얕고, ManyChat은 한국 공동구매 개념 자체가 없음. 이 기능을 제대로 구현하면 한국 셀러에게 "이거 없으면 공동구매 못함" 수준의 락인이 발생.

**자동화 플로우:**
```
[공구 오픈 알림] → [댓글 "신청"] → [DM: 상품 캐러셀]
  → [Quick Reply: 옵션 선택] → [수량 입력]
  → [결제 링크 DM 발송 (셀러의 스마트스토어/토스 송금 링크)]
  → [배송 시작 → 운송장 DM]
  → [배송 완료 → 리뷰 요청 DM]
  → [7일 후 → 재구매 유도 DM]
```

**필요 구현:**
- 공동구매 전용 플로우 템플릿
- 셀러의 결제 링크를 버튼으로 자동 삽입 (API 연동 아님, 링크만)
- 참여자 관리 대시보드 (신청자 목록/상태 추적)
- 재고 카운터 (자동 마감)

**설계 디테일:**

```
// 공동구매 템플릿에서 사용하는 노드 조합
MessageNode (결제 유도)
├─ text: "{이름}님, 주문이 확인되었습니다! 아래 링크에서 결제해주세요."
├─ buttons: [{ title: "결제하기", url: 셀러 결제 링크, trackClicks: true }]
└─ 결제 링크는 셀러가 Settings에서 한 번 등록 → 자동 삽입

새 노드 타입: InventoryNode
├─ maxQuantity: number
├─ currentCount: (자동 추적)
├─ onSoldOut: → 마감 DM ("죄송합니다, 마감되었습니다")
└─ onAvailable: → 결제 유도 DM 진행
```

---

### 차별점 2: 결제 유도 자동화 (현실적 접근)

**방향:**  
처음부터 결제 API 직접 연동은 하지 않는다. 대신 셀러가 이미 사용 중인 결제 수단의 **링크를 DM에 자동 삽입**하는 것부터 시작.

**Phase 1 (지금):**
- 셀러가 등록한 결제 링크(스마트스토어/카카오톡 스토어/토스 송금)를 메시지 노드에 버튼으로 삽입
- 링크 클릭 추적 (몇 명이 결제 페이지로 이동했는지)

**Phase 3+ (사업 성장 후):**
- 카카오페이/네이버페이/토스 API 직접 연동 (사업자 심사 필요)
- 결제 완료 콜백 → 자동 확인 DM
- DM 내에서 결제까지 원스톱 경험

**설계 디테일 (Phase 1):**

```
// 메시지 노드의 버튼에 결제 링크 삽입 (기존 기능 확장)
MessageNode.buttons
├─ type: 'web_url'
├─ title: "결제하기" / "스마트스토어에서 구매" / "토스로 송금"
├─ url: 셀러가 직접 입력한 결제 페이지 URL
└─ trackClicks: true (클릭 수 추적)

// 링크 클릭 추적
GET /api/analytics/links/{linkId}/clicks → { count, contactIds }
```

---

### 차별점 3: 스마트 Comment-to-DM + 바이럴 공개 답글

**왜 하드투카피인가:**  
현재 업계 표준은 "댓글 키워드 → DM만 발송". 센드잇은 공개 답글 + DM을 동시에 보내고, 답글을 3개 이상 변형으로 랜덤화하여 스팸 플래그를 방지하면서 알고리즘 부스팅 효과를 만듦.

**동작 원리:**
```
사용자 댓글: "가격 알려주세요"
  ↓
[공개 답글] "@사용자 DM으로 상세 정보 보내드렸어요! 😊"
  (3~5개 변형 중 랜덤 선택)
  ↓
[DM] "안녕하세요 {이름}님! 요청하신 가격 정보입니다..."
  ↓
[부가 효과] 공개 답글이 다른 사용자의 댓글 참여를 유도 → 바이럴 루프
```

**답글 변형 풀 (유저 커스터마이징 가능):**
```json
{
  "replyVariants": [
    "@{name} DM 보내드렸어요! 확인해주세요 ✨",
    "@{name} 네! 자세한 내용 DM으로 전달드렸습니다 💌",
    "@{name} DM 확인 부탁드려요! 😊",
    "@{name} 요청하신 정보 DM으로 보내드렸어요 🎁",
    "@{name} 지금 DM 확인해보세요! 💬"
  ]
}
```

**설계:**

```
CommentReplyNode 확장
├─ replyVariants: string[] (최소 3개 권장)
├─ enablePublicReply: boolean (기본 true)
├─ enableDM: boolean (기본 true)
├─ replyDelay: number (초, 즉시 답글은 봇 의심)
├─ personalizeReply: boolean ({name} 변수 사용)
└─ viralMetrics: { publicReplyCount, dmSentCount, engagementBoost }
```

---

### 차별점 4: AI 한국어 대화 엔진

**왜 하드투카피인가:**  
ManyChat의 AI Intent는 영어 최적화. 한국어 자연어 이해(NLU)는 조사/어미 변화가 복잡하여 영어 모델을 그대로 쓰면 성능이 떨어짐. 한국어 특화 프롬프트 엔지니어링 + 브랜드 톤 커스터마이징이 차별점.

**3단계 AI:**

```
Level 1: FAQ 자동 응답 (규칙 기반)
├─ 키워드 매칭으로 사전 등록된 답변 반환
├─ 예: "배송" → "배송은 결제 후 2-3일 소요됩니다"
└─ 비용: 0원 (API 호출 없음)

Level 2: 스마트 응답 (GPT 기반)
├─ 사용자 질문의 의도 파악 후 적절한 플로우로 라우팅
├─ 브랜드 톤 설정: 친근함/전문적/캐주얼 + 이모지 사용 여부
├─ 컨텍스트 유지: 이전 대화 내용 참고
└─ 비용: 토큰 기반 (Pro 플랜 포함)

Level 3: 세일즈 어시스턴트 (향후)
├─ 상품 추천, 크로스셀/업셀
├─ 구매 이력 기반 개인화
└─ 장바구니 포기 리커버리
```

**설계:**

```
새 노드 타입: AIResponseNode
├─ mode: 'faq' | 'smart' | 'sales'
├─ brandTone: { formality: 1-5, emoji: boolean, style: string }
├─ knowledgeBase: string[] (FAQ 항목, 상품 정보)
├─ fallbackAction: 'human_handoff' | 'retry' | 'default_message'
├─ maxTokens: number (비용 제어)
└─ contextWindow: number (이전 메시지 참고 수)

// 백엔드
AIService
├─ generateResponse(message, context, brandTone, knowledgeBase)
├─ classifyIntent(message) → 'purchase' | 'faq' | 'complaint' | ...
├─ shouldHandoff(conversation) → boolean (AI 한계 감지)
└─ getUsage(userId, period) → { tokensUsed, cost }
```

---

### 차별점 5: Recurring Notification (24시간 창 극복)

**왜 하드투카피인가:**  
Instagram의 24시간 메시징 윈도우는 모든 자동화 플랫폼의 근본적 제약. Meta의 Recurring Notification API를 활용하면 옵트인 사용자에게 24시간 외에도 마케팅 메시지를 보낼 수 있음. 대부분의 한국 경쟁사가 이 API를 활용하지 않고 있음.

**동작:**
```
[사용자 첫 DM 수신 시]
  → "새 상품 소식을 받아보시겠어요?" (옵트인 버튼)
  → 사용자 승인
  → 토픽별 구독 관리 (신상품/할인/공동구매)
  → 24시간 외에도 일 1회 마케팅 메시지 발송 가능
```

**제한사항:**
- 7일간 최대 10개 토픽, 일일 5개 토픽
- 사용자 명시적 옵트인 필수
- Meta가 향후 유료화 예정 (현재 무료 시범)

**설계:**

```
새 노드 타입: OptInNode
├─ topic: string (예: "new_products", "sale", "groupbuy")
├─ message: string (옵트인 요청 메시지)
├─ frequency: 'daily' | 'weekly' | 'monthly'
└─ onOptIn: → 구독 확인 DM

RecurringNotificationService
├─ requestOptIn(contactId, topic)
├─ sendNotification(topic, message) // 24시간 외 발송
├─ getSubscribers(topic) → Contact[]
├─ unsubscribe(contactId, topic)
└─ getQuota() → { used, remaining, resetAt }
```

---

### 차별점 6: DM 내 상품 카탈로그 (Generic Template/Carousel)

**왜 하드투카피인가:**  
Instagram API의 Generic Template을 제대로 활용하면 DM을 "미니 쇼핑몰"로 만들 수 있음. 2~10개 카드를 캐러셀로 보여주고 각 카드에 이미지+제목+가격+구매버튼 배치. 한국 경쟁사 중 캐러셀을 제대로 구현한 곳이 없음.

**사용 시나리오:**
```
사용자: "신상품 뭐 있어요?"
  ↓
[캐러셀 DM]
┌─────────┬─────────┬─────────┐
│ 상품 A  │ 상품 B  │ 상품 C  │
│ [이미지]│ [이미지]│ [이미지]│
│ 29,900원│ 39,900원│ 19,900원│
│ [구매]  │ [구매]  │ [구매]  │
└─────────┴─────────┴─────────┘
  ↓
사용자가 "구매" 탭 → 해당 상품 결제 플로우 진입
```

**설계:**

```
메시지 타입 확장: CAROUSEL
├─ cards: Array (2~10개)
│   ├─ imageUrl: string
│   ├─ title: string (80자 제한)
│   ├─ subtitle: string (80자 제한)
│   └─ buttons: Array (최대 3개)
│       ├─ type: 'web_url' | 'postback'
│       ├─ title: string
│       └─ url/payload: string
└─ 렌더링: Instagram 네이티브 캐러셀 (좌우 스와이프)

// FlowBuilder UI
CarouselEditor
├─ 카드 추가/삭제/순서변경 (드래그)
├─ 이미지 업로드/URL 입력
├─ 버튼별 액션 설정 (URL 이동 / 플로우 분기)
└─ 미리보기 (폰 프리뷰에 캐러셀 렌더링)
```

---

### 차별점 7: 노드별 실시간 분석 + 퍼널 시각화

**왜 하드투카피인가:**  
ManyChat조차 분석이 기초적이라는 불만이 많음. 센드잇이 노드 단위 전환율/이탈율을 시각화하면, 데이터 기반 최적화를 할 수 있는 유일한 한국 플랫폼이 됨. 이 데이터가 쌓이면 이탈 비용이 극도로 높아짐 (스티키니스).

**시각화:**
```
[트리거: 댓글 키워드]     도달: 1,000
        │                    │
        ▼                    ▼
[오프닝 DM]              발송: 980 (98%)
        │                    │
        ▼                    ▼
[Quick Reply 선택]       응답: 620 (63%) ← 이탈 37%
        │                    │
        ▼                    ▼
[결제 링크]              클릭: 310 (50%)
        │                    │
        ▼                    ▼
[결제 완료]              전환: 186 (60%)
                             │
                     전체 전환율: 18.6%
```

**설계:**

```
// 노드 실행 추적
NodeExecution (새 엔티티)
├─ flowId, nodeId, contactId
├─ executedAt: timestamp
├─ action: 'entered' | 'completed' | 'dropped'
├─ metadata: JSON (버튼 클릭, 응답 내용 등)
└─ duration: milliseconds (노드 내 체류 시간)

// Analytics API 확장
GET /api/analytics/flows/{flowId}/funnel
→ 응답: 노드별 { reached, completed, dropRate, avgDuration }

GET /api/analytics/flows/{flowId}/nodes/{nodeId}
→ 응답: { executions, completionRate, avgResponseTime, topResponses }

// 프론트엔드
FlowAnalyticsOverlay
├─ React Flow 노드 위에 반투명 오버레이
├─ 각 노드: 도달 수, 전환율, 이탈율 배지
├─ 엣지(연결선): 통과율 퍼센트 표시
├─ 색상 코딩: 녹색(>70%) / 노랑(30-70%) / 빨강(<30%)
└─ 클릭 시 해당 노드 상세 분석 패널
```

---

### 차별점 8: Ice Breaker + Persistent Menu 자동 설정

**왜 하드투카피인가:**  
Instagram API의 Ice Breaker(DM 첫 진입 시 FAQ 버튼 4개)와 Persistent Menu(상시 메뉴)를 한국 경쟁사 거의 대부분이 활용하지 않음. 센드잇에서 원클릭으로 설정할 수 있게 하면 "설정만 했는데 DM이 알아서 돌아간다"는 경험 제공.

**Ice Breaker 예시:**
```
DM 창 최초 진입 시 자동 표시:
┌────────────────────────┐
│ 💰 가격 문의           │
│ 📦 배송 정보           │
│ 🛒 공동구매 참여방법    │
│ 💬 상담원 연결          │
└────────────────────────┘
각 버튼 탭 → 해당 자동화 플로우 실행
```

**Persistent Menu 예시:**
```
DM 대화 내 항시 메뉴 (≡ 아이콘):
├─ 주문 조회
├─ FAQ
├─ 상담원 연결
└─ 이벤트/공동구매
```

**설계:**

```
// Settings 페이지 내 "DM 설정" 탭 추가
IceBreakerConfig
├─ enabled: boolean
├─ items: Array (최대 4개)
│   ├─ question: string (표시 텍스트)
│   └─ linkedFlowId: string (실행할 플로우)
└─ 미리보기: 실제 DM 창 모습 시뮬레이션

PersistentMenuConfig
├─ enabled: boolean
├─ items: Array (계층 가능)
│   ├─ title: string
│   ├─ type: 'postback' | 'web_url'
│   └─ payload/url: string
└─ 설정 시 Instagram API 자동 호출

// 백엔드
POST /api/instagram/ice-breakers  → Meta API 호출
POST /api/instagram/persistent-menu → Meta API 호출
```

---

## 4. 기능별 상세 설계

### 4-1. 메시지 변수 시스템

모든 메시지 노드에서 변수를 사용할 수 있어야 함. 가장 기본적인 기능이지만 현재 미구현.

**지원 변수:**

| 변수 | 설명 | 예시 값 |
|------|------|--------|
| `{이름}` / `{name}` | 사용자 이름 | "김민수" |
| `{username}` | 인스타 아이디 | "@minsu_kim" |
| `{키워드}` / `{keyword}` | 트리거한 키워드 | "신청" |
| `{날짜}` / `{date}` | 오늘 날짜 | "4월 14일" |
| `{상품명}` | 현재 플로우의 상품 | "봄 신상 원피스" |
| `{가격}` | 상품 가격 | "29,900원" |
| `{custom.필드명}` | 커스텀 필드 | 사용자 정의 |

**구현:**

```javascript
// 프론트엔드: 메시지 에디터에 변수 삽입 버튼
// 백엔드: FlowExecutionService에서 메시지 발송 직전에 치환

function interpolateVariables(template, contact, context) {
  return template
    .replace(/\{이름\}|\{name\}/g, contact.name || '고객')
    .replace(/\{username\}/g, contact.username || '')
    .replace(/\{키워드\}|\{keyword\}/g, context.triggerKeyword || '')
    .replace(/\{날짜\}|\{date\}/g, formatKoreanDate(new Date()))
    .replace(/\{custom\.(\w+)\}/g, (_, field) => contact.customFields?.[field] || '')
}
```

**UI 설계:**
- 메시지 텍스트 영역 상단에 `{ }` 버튼
- 클릭 시 변수 목록 드롭다운
- 변수는 파란색 태그 칩으로 표시 (삭제 가능)
- 폰 프리뷰에서 변수가 예시값으로 렌더링

---

### 4-2. 고급 조건 분기 노드

현재 ConditionNode는 followCheck/emailCheck 2가지만 지원. 실용적인 자동화를 위해 확장 필요.

**추가 조건 타입:**

| 조건 | 설명 | 분기 |
|------|------|------|
| `tagCheck` | 특정 태그 보유 여부 | 있음 / 없음 |
| `customFieldCheck` | 커스텀 필드 값 비교 | 일치 / 불일치 |
| `messageContains` | 사용자 응답에 키워드 포함 | 포함 / 미포함 |
| `timeCheck` | 현재 시간 범위 | 범위 내 / 외 |
| `randomSplit` | 트래픽 랜덤 분할 | A / B (비율 지정) |
| `purchaseHistory` | 구매 이력 여부 | 있음 / 없음 |

**설계:**

```
ConditionNode 확장
├─ conditionType: 기존 + 위 6가지
├─ operator: 'equals' | 'contains' | 'greaterThan' | 'between' | ...
├─ value: any
├─ branches: Array
│   ├─ label: string ("Yes" / "No" 또는 커스텀)
│   └─ targetNodeId: string
└─ defaultBranch: targetNodeId (모든 조건 불일치 시)
```

---

### 4-3. 플로우 빌더 새 노드 타입 목록

| 노드 | 아이콘 | 색상 | 용도 |
|------|--------|------|------|
| **RandomizerNode** | ri-shuffle-line | #F59E0B | A/B 테스트, 랜덤 메시지 |
| **PaymentNode** | ri-bank-card-line | #10B981 | 결제 링크 생성/콜백 |
| **InventoryNode** | ri-stack-line | #8B5CF6 | 재고 확인/차감 |
| **AIResponseNode** | ri-robot-line | #06B6D4 | AI 자동 응답 |
| **OptInNode** | ri-notification-3-line | #EC4899 | Recurring Notification 옵트인 |
| **CarouselNode** | ri-gallery-line | #F97316 | 캐러셀 메시지 발송 |
| **WebhookNode** | ri-link | #6366F1 | 외부 API 호출 |
| **TagNode** | ri-price-tag-3-line | #14B8A6 | 태그 추가/제거 |
| **SetFieldNode** | ri-edit-box-line | #64748B | 커스텀 필드 값 설정 |
| **GoToFlowNode** | ri-external-link-line | #A855F7 | 다른 플로우로 이동 |

---

### 4-4. 업종별 온보딩 + 추천 템플릿

**온보딩 플로우 (Instagram 연결 직후):**
```
Step 1: "어떤 비즈니스를 운영하세요?"
  ┌─ 의류/패션
  ├─ 뷰티/화장품
  ├─ F&B (카페/음식)
  ├─ 교육/코칭
  ├─ PT/헬스
  ├─ 공동구매 셀러
  └─ 기타

Step 2: "가장 먼저 자동화하고 싶은 건?" (업종별 다른 옵션)
  [공동구매 셀러 선택 시]
  ┌─ 댓글 "신청" → DM 자동 발송
  ├─ 가격/배송 FAQ 자동 응답
  ├─ 스토리 멘션 자동 감사 DM
  └─ 공동구매 풀사이클 자동화

Step 3: 선택한 템플릿 자동 적용 → 플로우 빌더로 이동
  "이 자동화가 바로 동작합니다. 수정이 필요하면 노드를 클릭하세요!"
```

---

## 5. 가격 전략

### 경쟁사 비교 기반 포지셔닝

```
키티챗  ←──── 센드잇 ────→  소셜비즈 ────→ ManyChat
(심플)     (깊은 자동화      (기본 자동화     (글로벌
           + 한국 특화)       저렴)           고가)
```

### 추천 가격표

| 플랜 | 월 가격 (VAT 별도) | DM 발송 | 플로우 | 계정 | 핵심 기능 |
|------|-------------------|---------|--------|------|----------|
| **Free** | 0원 | 300건/월 | 1개 | 1개 | 기본 Comment-to-DM, Ice Breaker |
| **Starter** | 19,900원 | 3,000건/월 | 5개 | 1개 | + 캐러셀, Quick Reply, FAQ 자동응답 |
| **Pro** | 49,900원 | 15,000건/월 | 무제한 | 3개 | + AI 응답, Recurring Notification, 노드 분석, 공동구매 자동화 |
| **Agency** | 149,900원 | 무제한 | 무제한 | 10개 | + 멀티 계정 대시보드, 팀 권한, API, 우선 지원 |

**과금 원칙:**
- **메시지 수 기반** (컨택 수 아님) — ManyChat 최대 불만 해소
- 초과 시 자동 차단이 아닌 경고 + 업그레이드 유도
- 연간 결제 20% 할인
- 세금계산서 자동 발행

---

## 6. 스티키니스 설계

### 데이터 락인 (시간이 갈수록 이탈 비용 증가)

| 축적 데이터 | 이탈 시 손실 | 대체 비용 |
|-----------|------------|----------|
| 자동화 플로우 (노드/엣지/설정) | 재구축 수 시간~수일 | 매우 높음 |
| 고객 대화 히스토리 | 맥락 상실, CS 품질 하락 | 복구 불가 |
| 노드별 분석 데이터 | 최적화 인사이트 손실 | 재수집에 수 주 |
| 커스텀 필드/세그먼트 | 고객 분류 체계 재구축 | 높음 |
| AI 학습 데이터 (FAQ, 브랜드 톤) | 재학습 필요 | 중간 |
| 결제 연동 설정 | 재설정 + 재심사 | 높음 |

### 워크플로우 통합 깊이

센드잇이 한국 결제(네이버페이/카카오페이/토스) + 커머스(스마트스토어) + 메시징(카카오톡)과 깊이 연동되면, 이 연동 자체가 전환 비용이 됨. 셀러의 운영 프로세스가 센드잇에 종속.

### 팀 협업

- 멀티 유저 접근 → 팀 전체가 사용 → 개인이 이탈 결정 불가
- 역할별 권한 (뷰어/편집/관리자) → 조직 구조에 녹아듦
- 대화 할당/메모 → 팀 커뮤니케이션 허브화

---

## 7. 실행 로드맵

### Phase 1: 기본기 완성 (1~2주)

> "쓸 수 있는 제품" — 없으면 제품이라 부를 수 없는 것들

| # | 작업 | 파일 | 난이도 |
|---|------|------|--------|
| 1 | 메시지 변수 시스템 `{이름}`, `{키워드}` | FlowExecutionService, NodeEditor | 낮음 |
| 2 | Empty State 전체 페이지 적용 | 모든 *Page.jsx | 낮음 |
| 3 | 로딩/스켈레톤 UI 통일 | 공통 컴포넌트 | 낮음 |
| 4 | Toast 알림 강화 (성공/에러/경고) | Toast 컴포넌트 | 낮음 |
| 5 | 플랜별 기능 제한 적용 (quota enforcement) | 백엔드 서비스 | 중간 |
| 6 | Billing 페이지 실제 Stripe 연동 완성 | BillingService | 중간 |

### Phase 2: 차별화 (2~4주)

> "쓰고 싶은 제품" — 경쟁사 대비 명확한 우위

| # | 작업 | 차별점 # | 난이도 |
|---|------|---------|--------|
| 7 | 스마트 Comment-to-DM + 바이럴 답글 | #3 | 중간 |
| 8 | 캐러셀 메시지 노드 | #6 | 중간 |
| 9 | 고급 조건 분기 (태그/필드/시간/랜덤) | 기본기 | 중간 |
| 10 | 업종별 온보딩 + 추천 템플릿 | UX | 중간 |
| 11 | AI 한국어 응답 풀버전 (대화 컨텍스트 유지, 한국어 특화 프롬프트, 상품 DB 연동) | #4 | 높음 |
| 12 | Ice Breaker + Persistent Menu 설정 | #8 | 중간 |
| 13 | 노드별 분석 + 퍼널 시각화 | #7 | 높음 |

### Phase 3: 킬러 피처 (1~2개월)

> "경쟁사를 이기는 제품" — 이것 때문에 센드잇을 선택

| # | 작업 | 차별점 # | 난이도 |
|---|------|---------|--------|
| 14 | 공동구매 풀사이클 자동화 | #1 | 높음 |
| 15 | Recurring Notification | #5 | 중간 |
| 16 | 멀티 계정 관리 (에이전시 모드) | 확장 | 높음 |
| 17 | A/B 테스트 프레임워크 | 최적화 | 중간 |
| ~~18~~ | ~~한국 결제 3사 API 직접 연동~~ | ~~#2~~ | ~~보류 (사업 성장 후)~~ |
| 19 | 카카오톡 채널 연동 (알림톡/친구톡 자동화) | IG+카카오 통합 | 높음 |

### Phase 4: 배포 준비 & 프로덕션

> "출시할 수 있는 제품" — 안정성, 보안, 운영 인프라

| # | 작업 | 카테고리 | 난이도 |
|---|------|---------|--------|
| 20 | Phase 1~3 전체 기능 재검토 및 버그 수정 | QA | 중간 |
| 21 | 에러 핸들링 통일 (글로벌 예외 처리, API 에러 응답 표준화) | 안정성 | 중간 |
| 22 | 환경 변수 정리 (application.yml 프로필 분리: dev/staging/prod) | 인프라 | 낮음 |
| 23 | Docker Compose 구성 (Spring Boot + PostgreSQL + Redis) | 인프라 | 중간 |
| 24 | CI/CD 파이프라인 (GitHub Actions: 빌드 → 테스트 → 배포) | DevOps | 중간 |
| 25 | SSL/HTTPS + 도메인 설정 (Let's Encrypt or Cloudflare) | 보안 | 낮음 |
| 26 | Rate Limiting + CORS 정책 강화 | 보안 | 낮음 |
| 27 | 데이터베이스 마이그레이션 전략 (Flyway/Liquibase) | 인프라 | 중간 |
| 28 | 로깅/모니터링 (Structured logging + Sentry or 유사 서비스) | 운영 | 중간 |
| 29 | 프론트엔드 빌드 최적화 (코드 스플리팅, 번들 사이즈 축소) | 성능 | 중간 |
| 30 | 프로덕션 배포 (AWS/GCP/NCP + Nginx 리버스 프록시) | 배포 | 높음 |

---

## 부록: Instagram API 기능 활용 체크리스트

| API 기능 | 현재 활용 | 계획 |
|---------|----------|------|
| Text Messages | O | 유지 |
| Image Messages | O (제한적) | 강화 |
| Generic Template (Carousel) | X | Phase 2 |
| Quick Replies | X | Phase 2 |
| Ice Breakers | X | Phase 2 |
| Persistent Menu | X | Phase 2 |
| Private Replies (Comment→DM) | O | 강화 (바이럴 답글) |
| Story Mention/Reply | O | 유지 |
| One-Time Notification | X | Phase 3 |
| Recurring Notification | X | Phase 3 |
| HUMAN_AGENT tag (7일 창) | X | Phase 2 |
| Handover Protocol | X | Phase 3 |
