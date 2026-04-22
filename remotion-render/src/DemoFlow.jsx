import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Img } from "remotion";

// ─────────────────────────────────────────────────────────────
// 데모 GIF — 15초 루프 (24fps, 360 frames)
//
// Scene 1 (0~72f,   0~3s)  : 고객 DM 수신 ("가격 문의드려요 🙏")
// Scene 2 (72~144f, 3~6s)  : 플로우 빌더 노드 순차 실행
// Scene 3 (144~216f,6~9s)  : 자동 응답 + 카탈로그 전송
// Scene 4 (216~288f,9~12s) : 대시보드 카운터 증가 (+218 → +219)
// Scene 5 (288~360f,12~15s): 센드잇 로고 + CTA (다음 루프로 seamless)
// ─────────────────────────────────────────────────────────────

const COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  purple: "#8B5CF6",
  bgGray: "#F1F5F9",
  bubbleGray: "#F8FAFC",
  text: "#0F172A",
  textMuted: "#64748B",
  green: "#10B981",
  border: "#E2E8F0",
};

// 공통: Phone 프레임
const PhoneFrame = ({ children, scale = 1, rotate = 0 }) => (
  <div
    style={{
      width: 360,
      height: 640,
      background: "#0F172A",
      borderRadius: 44,
      padding: 10,
      boxShadow: "0 40px 80px -20px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.08) inset",
      transform: `scale(${scale}) rotate(${rotate}deg)`,
      transformOrigin: "center",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#fff",
        borderRadius: 36,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  </div>
);

// 공통: 인스타 DM 헤더
const DmHeader = () => (
  <div
    style={{
      padding: "36px 18px 14px",
      borderBottom: `1px solid ${COLORS.border}`,
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#F472B6,#A855F7,#3B82F6)",
      }}
    />
    <div style={{ flex: 1, lineHeight: 1.2 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>customer_sj</div>
      <div style={{ fontSize: 12, color: COLORS.textMuted }}>Active now</div>
    </div>
    <div style={{ fontSize: 20, color: COLORS.textMuted }}>⋯</div>
  </div>
);

// ─── Scene 1: 고객 DM 수신 ───
const Scene1 = () => {
  const frame = useCurrentFrame();
  // 0~20f: 타이핑 인디케이터
  // 20~48f: 메시지 타이핑 애니메이션
  // 48~72f: 메시지 완성 + 시간 표시
  const typingOpacity = interpolate(frame, [0, 6, 20, 24], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const msgText = "가격 문의드려요 🙏";
  const charsShown = Math.floor(interpolate(frame, [24, 48], [0, msgText.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const bubbleOpacity = interpolate(frame, [24, 30], [0, 1], { extrapolateRight: "clamp" });
  const timeOpacity = interpolate(frame, [48, 56], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#EFF6FF 0%,#F8FAFC 100%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 60, fontSize: 16, color: COLORS.textMuted, fontWeight: 600 }}>
        💬 실시간 인스타그램 DM
      </div>
      <PhoneFrame>
        <DmHeader />
        <div style={{ flex: 1, padding: "20px 14px", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}>
          {/* 타이핑 인디케이터 */}
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              gap: 5,
              padding: "12px 16px",
              background: COLORS.bubbleGray,
              borderRadius: 18,
              borderBottomLeftRadius: 6,
              opacity: typingOpacity,
              transform: `translateY(${(1 - typingOpacity) * 8}px)`,
            }}
          >
            {[0, 1, 2].map((i) => {
              const dotY = Math.sin((frame - i * 3) * 0.5) * 3;
              return <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.textMuted, display: "inline-block", transform: `translateY(${dotY}px)` }} />;
            })}
          </div>
          {/* 실제 메시지 */}
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "75%",
              padding: "12px 16px",
              background: COLORS.bubbleGray,
              color: COLORS.text,
              borderRadius: 18,
              borderBottomLeftRadius: 6,
              fontSize: 15,
              fontWeight: 500,
              opacity: bubbleOpacity,
              transform: `translateY(${(1 - bubbleOpacity) * 8}px)`,
            }}
          >
            {msgText.slice(0, charsShown)}
            <span style={{ opacity: charsShown < msgText.length ? 1 : 0, marginLeft: 2 }}>|</span>
          </div>
          <div style={{ alignSelf: "flex-start", fontSize: 11, color: COLORS.textMuted, marginLeft: 4, opacity: timeOpacity }}>방금</div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
};

// ─── Scene 2: 플로우 빌더 노드 순차 실행 ───
const Scene2 = () => {
  const frame = useCurrentFrame(); // 0~72
  const enterProgress = spring({ frame, fps: 24, config: { damping: 14 } });

  // 4개 노드 순차 활성화
  const nodes = [
    { id: "trigger", label: "DM 수신", icon: "📩", color: "#3B82F6", activeAt: 8 },
    { id: "keyword", label: "키워드 매칭\n'가격'", icon: "🔎", color: "#8B5CF6", activeAt: 22 },
    { id: "action", label: "자동 응답", icon: "✉️", color: "#EC4899", activeAt: 36 },
    { id: "followup", label: "카탈로그 전송", icon: "📎", color: "#10B981", activeAt: 50 },
  ];

  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)", alignItems: "center", justifyContent: "center", padding: 60 }}>
      {/* 배경 그리드 */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "32px 32px", opacity: 0.6 }} />

      <div style={{ position: "absolute", top: 50, fontSize: 16, color: "#94A3B8", fontWeight: 600, opacity: enterProgress }}>
        ⚡ 센드잇 플로우 빌더
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative", transform: `scale(${enterProgress})` }}>
        {nodes.map((node, i) => {
          const active = frame >= node.activeAt;
          const activePulse = active ? spring({ frame: frame - node.activeAt, fps: 24, config: { damping: 8 } }) : 0;
          const glowSize = active ? 30 + Math.sin(frame * 0.15) * 8 : 0;
          return (
            <div key={node.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* 노드 */}
              <div
                style={{
                  width: 130,
                  height: 130,
                  borderRadius: 20,
                  background: active ? `linear-gradient(135deg, ${node.color}, ${node.color}dd)` : "rgba(255,255,255,0.06)",
                  border: active ? `2px solid ${node.color}` : "2px solid rgba(255,255,255,0.12)",
                  boxShadow: active ? `0 0 ${glowSize}px ${node.color}88, 0 8px 30px ${node.color}44` : "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transform: `scale(${0.9 + activePulse * 0.1})`,
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 34 }}>{node.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.25 }}>{node.label}</div>
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 900,
                      boxShadow: "0 4px 12px rgba(16,185,129,0.5)",
                      transform: `scale(${activePulse})`,
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>
              {/* 엣지 */}
              {i < nodes.length - 1 && (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: 24, height: 3, background: frame >= nodes[i + 1].activeAt - 4 ? node.color : "rgba(255,255,255,0.15)", borderRadius: 2, transition: "background 0.3s" }} />
                  <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `10px solid ${frame >= nodes[i + 1].activeAt - 4 ? node.color : "rgba(255,255,255,0.15)"}` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", bottom: 60, fontSize: 14, color: "#64748B", fontWeight: 500, opacity: interpolate(frame, [50, 60], [0, 1], { extrapolateRight: "clamp" }) }}>
        📍 키워드 매칭 0.4초 → 자동 응답 발송 완료
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3: 자동 응답 발송 + 카탈로그 ───
const Scene3 = () => {
  const frame = useCurrentFrame(); // 0~72
  const reply1Opacity = interpolate(frame, [4, 14], [0, 1], { extrapolateRight: "clamp" });
  const reply1Y = interpolate(frame, [4, 14], [12, 0], { extrapolateRight: "clamp" });
  const autoChipOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const catalogOpacity = interpolate(frame, [22, 34], [0, 1], { extrapolateRight: "clamp" });
  const catalogY = interpolate(frame, [22, 34], [12, 0], { extrapolateRight: "clamp" });
  const custReplyOpacity = interpolate(frame, [50, 60], [0, 1], { extrapolateRight: "clamp" });
  const custReplyY = interpolate(frame, [50, 60], [12, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#EFF6FF 0%,#F8FAFC 100%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 60, fontSize: 16, color: COLORS.textMuted, fontWeight: 600 }}>
        🤖 자동 응답 + 카탈로그 전송
      </div>
      <PhoneFrame>
        <DmHeader />
        <div style={{ flex: 1, padding: "16px 14px", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}>
          {/* 고객 원 메시지 (Scene 1 잔상) */}
          <div style={{ alignSelf: "flex-start", maxWidth: "75%", padding: "10px 14px", background: COLORS.bubbleGray, color: COLORS.text, borderRadius: 18, borderBottomLeftRadius: 6, fontSize: 14 }}>
            가격 문의드려요 🙏
          </div>
          {/* 자동 응답 칩 */}
          <div
            style={{
              alignSelf: "center",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              background: "rgba(37,99,235,0.1)",
              color: COLORS.primaryDark,
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 100,
              opacity: autoChipOpacity,
            }}
          >
            🤖 센드잇이 자동 응답
          </div>
          {/* 응답 1 */}
          <div
            style={{
              alignSelf: "flex-end",
              maxWidth: "78%",
              padding: "12px 16px",
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
              color: "#fff",
              borderRadius: 18,
              borderBottomRightRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              boxShadow: "0 4px 14px -4px rgba(37,99,235,0.5)",
              opacity: reply1Opacity,
              transform: `translateY(${reply1Y}px)`,
            }}
          >
            반갑습니다! 가격표 전달드릴게요 ✨
          </div>
          {/* 카탈로그 카드 */}
          <div
            style={{
              alignSelf: "flex-end",
              maxWidth: "82%",
              padding: 10,
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
              borderRadius: 18,
              borderBottomRightRadius: 6,
              boxShadow: "0 4px 14px -4px rgba(37,99,235,0.5)",
              opacity: catalogOpacity,
              transform: `translateY(${catalogY}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.14)", borderRadius: 12, color: "#fff" }}>
              <div style={{ fontSize: 24 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>2026 상품 카탈로그</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>PDF · 지금 받기</div>
              </div>
            </div>
          </div>
          {/* 고객 답장 */}
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "70%",
              padding: "10px 14px",
              background: COLORS.bubbleGray,
              color: COLORS.text,
              borderRadius: 18,
              borderBottomLeftRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              opacity: custReplyOpacity,
              transform: `translateY(${custReplyY}px)`,
            }}
          >
            와 감사합니다! 😊
          </div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
};

// ─── Scene 4: 대시보드 카운터 증가 ───
const Scene4 = () => {
  const frame = useCurrentFrame(); // 0~72
  const enterProgress = spring({ frame, fps: 24, config: { damping: 14 } });
  // 카운터 218 → 219 (22~36f)
  const counter = Math.floor(interpolate(frame, [22, 36], [218, 219], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const pulseScale = frame >= 30 && frame <= 46 ? 1 + Math.sin((frame - 30) * 0.4) * 0.08 : 1;
  const chipOpacity = interpolate(frame, [30, 42], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg,#F8FAFC 0%,#EFF6FF 100%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 50, fontSize: 16, color: COLORS.textMuted, fontWeight: 600, opacity: enterProgress }}>
        📊 실시간 대시보드
      </div>

      <div style={{ display: "flex", gap: 24, transform: `scale(${0.9 + enterProgress * 0.1})`, opacity: enterProgress }}>
        {/* 카드 1: 오늘 응답 수 (메인) */}
        <div
          style={{
            width: 280,
            padding: 28,
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 20px 60px -20px rgba(37,99,235,0.25), 0 0 0 1px rgba(37,99,235,0.08)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#F59E0B,#F97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚡</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>오늘 응답 수</div>
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, color: COLORS.text, lineHeight: 1, transform: `scale(${pulseScale})`, transformOrigin: "left center" }}>
            {counter}
          </div>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: "rgba(16,185,129,0.12)",
                color: COLORS.green,
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 100,
                opacity: chipOpacity,
                transform: `translateY(${(1 - chipOpacity) * 6}px)`,
              }}
            >
              ↑ +1 방금
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>vs 어제 대비 +32%</div>
          </div>
        </div>
        {/* 카드 2: 평균 응답시간 */}
        <div
          style={{
            width: 220,
            padding: 24,
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 20px 60px -20px rgba(15,23,42,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#8B5CF6,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⏱️</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>평균 응답시간</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: COLORS.text, lineHeight: 1 }}>0.4s</div>
          <div style={{ fontSize: 11, color: COLORS.green, marginTop: 10, fontWeight: 600 }}>수동 대비 1,200× 빠름</div>
        </div>
        {/* 카드 3: 만족도 */}
        <div
          style={{
            width: 220,
            padding: 24,
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 20px 60px -20px rgba(15,23,42,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#EC4899,#F43F5E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💖</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>응답 만족도</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: COLORS.text, lineHeight: 1 }}>98.4%</div>
          <div style={{ fontSize: 11, color: COLORS.green, marginTop: 10, fontWeight: 600 }}>이번주 +2.1%p</div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 50, fontSize: 14, color: COLORS.textMuted, fontWeight: 500, opacity: interpolate(frame, [46, 58], [0, 1], { extrapolateRight: "clamp" }) }}>
        고객이 질문하는 순간, 센드잇은 이미 답했습니다.
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 5: 로고 + CTA (seamless loop으로 Scene1과 이어짐) ───
const Scene5 = () => {
  const frame = useCurrentFrame(); // 0~72
  const { durationInFrames } = useVideoConfig();
  const logoProgress = spring({ frame, fps: 24, config: { damping: 12 } });
  const headlineOpacity = interpolate(frame, [14, 28], [0, 1], { extrapolateRight: "clamp" });
  const headlineY = interpolate(frame, [14, 28], [16, 0], { extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [30, 44], [0, 1], { extrapolateRight: "clamp" });
  const ctaY = interpolate(frame, [30, 44], [16, 0], { extrapolateRight: "clamp" });
  // 마지막 8프레임에서 페이드아웃 (Scene1 fade-in과 연결)
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg,#1E3A8A 0%,#1D4ED8 45%,#2563EB 100%)", alignItems: "center", justifyContent: "center", opacity: fadeOut }}>
      {/* 배경 광채 */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 60%)", filter: "blur(40px)" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, position: "relative" }}>
        <Img
          src={staticFile("sendit-logo.png")}
          style={{
            width: 120,
            height: 120,
            transform: `scale(${logoProgress}) rotate(${(1 - logoProgress) * -20}deg)`,
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))",
          }}
        />
        <div style={{ textAlign: "center", opacity: headlineOpacity, transform: `translateY(${headlineY}px)` }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            센드잇과 함께
          </div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.2, background: "linear-gradient(135deg,#93C5FD,#C4B5FD,#F0ABFC)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            5분 만에 시작하세요
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 28px",
            background: "#fff",
            color: COLORS.primaryDark,
            fontSize: 17,
            fontWeight: 800,
            borderRadius: 14,
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.4)",
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
          }}
        >
          🚀 무료로 시작하기 →
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── 메인 Composition ───
export const DemoFlow = () => {
  return (
    <AbsoluteFill style={{ background: "#fff", fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif" }}>
      <Sequence from={0} durationInFrames={72}><Scene1 /></Sequence>
      <Sequence from={72} durationInFrames={72}><Scene2 /></Sequence>
      <Sequence from={144} durationInFrames={72}><Scene3 /></Sequence>
      <Sequence from={216} durationInFrames={72}><Scene4 /></Sequence>
      <Sequence from={288} durationInFrames={72}><Scene5 /></Sequence>
    </AbsoluteFill>
  );
};
