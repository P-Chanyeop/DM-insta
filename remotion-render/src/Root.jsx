import { Composition } from "remotion";
import { GuideImage } from "./GuideImage";
import { TemplateThumb } from "./TemplateThumb";
import { DemoFlow } from "./DemoFlow";

const GUIDE_PAGES = [
  { id: "settings", title: "Instagram 계정 연결", subtitle: "설정 > 계정 연결", color: "#E1306C", icon: "IG", elements: ["계정 연결", "메시징 설정", "프로필", "팀 멤버", "알림"], highlight: "@softcat_official 연결됨" },
  { id: "flows", title: "자동화 플로우", subtitle: "DM 자동 응답 시나리오", color: "#6366f1", icon: "FL", elements: ["새 자동화 만들기", "키워드 트리거", "댓글 트리거"], highlight: "드래그앤드롭 빌더" },
  { id: "broadcast", title: "브로드캐스팅", subtitle: "대량 DM 발송", color: "#f59e0b", icon: "BC", elements: ["수신 대상 선택", "메시지 작성", "예약 발송"], highlight: "+ 새 브로드캐스트" },
  { id: "sequences", title: "시퀀스 (드립)", subtitle: "자동 연속 메시지", color: "#10b981", icon: "SQ", elements: ["Day 1: 환영 메시지", "Day 3: 할인 쿠폰", "Day 7: 리마인더"], highlight: "시간차 자동 발송" },
  { id: "livechat", title: "라이브 채팅", subtitle: "실시간 DM 대화", color: "#3b82f6", icon: "CH", elements: ["대화 목록", "메시지 전송", "이미지 첨부"], highlight: "실시간 수신/발신" },
  { id: "contacts", title: "연락처 관리", subtitle: "고객 데이터 관리", color: "#8b5cf6", icon: "CT", elements: ["전체", "VIP", "신규", "비활성"], highlight: "태그 & 세그먼트" },
  { id: "analytics", title: "분석 & 통계", subtitle: "성과 대시보드", color: "#14b8a6", icon: "AN", elements: ["총 발송", "열림률", "클릭률", "전환율"], highlight: "성과 추이 차트" },
  { id: "templates", title: "템플릿 갤러리", subtitle: "검증된 자동화 템플릿", color: "#f97316", icon: "TP", elements: ["쇼핑몰", "이벤트", "리드수집", "고객지원"], highlight: "클릭 한 번으로 시작" },
];

const TEMPLATES = [
  { id: "shopping", name: "쇼핑몰 상품 안내", category: "쇼핑몰", colors: ["#FF6B9D", "#C44AFF"], icon: "🛍️", desc: "댓글 키워드 → 상품 DM" },
  { id: "booking", name: "예약 안내 자동응답", category: "예약/서비스", colors: ["#4ECDC4", "#44B09E"], icon: "📅", desc: "예약 키워드 → 시간 안내" },
  { id: "event", name: "이벤트/프로모션", category: "이벤트", colors: ["#F093FB", "#F5576C"], icon: "🎁", desc: "댓글 참여 → 이벤트 DM" },
  { id: "lead", name: "리드 수집 (이메일)", category: "리드수집", colors: ["#667EEA", "#764BA2"], icon: "📧", desc: "이메일 수집 자동화" },
  { id: "support", name: "고객 지원 자동응답", category: "고객지원", colors: ["#43E97B", "#38F9D7"], icon: "🎧", desc: "FAQ 키워드 자동 응답" },
  { id: "groupbuy", name: "공동구매 자동화", category: "쇼핑몰", colors: ["#EF4444", "#F97316"], icon: "🛒", desc: "신청 → 옵션 → 결제 → 배송" },
];

export const RemotionRoot = () => {
  return (
    <>
      {GUIDE_PAGES.map((page) => (
        <Composition
          key={`guide-${page.id}`}
          id={`guide-${page.id}`}
          component={GuideImage}
          durationInFrames={1}
          fps={1}
          width={800}
          height={480}
          defaultProps={page}
        />
      ))}
      {TEMPLATES.map((tmpl) => (
        <Composition
          key={`tmpl-${tmpl.id}`}
          id={`tmpl-${tmpl.id}`}
          component={TemplateThumb}
          durationInFrames={1}
          fps={1}
          width={600}
          height={400}
          defaultProps={tmpl}
        />
      ))}
      {/* 랜딩 페이지 "데모 보기" 모달용 15초 루프 GIF */}
      <Composition
        id="DemoFlow"
        component={DemoFlow}
        durationInFrames={360}
        fps={24}
        width={1080}
        height={675}
      />
    </>
  );
};
