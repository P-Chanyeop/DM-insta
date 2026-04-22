import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Img,
  Easing,
} from "remotion";

// ─────────────────────────────────────────────────────────────
// 프로페셔널 데모 영상 — 15초 루프 (30fps, 450 frames)
// MP4(h264)로 렌더 후 <video autoplay loop muted> 로 재생.
//
// 전체 구조:
//   Scene 1 (0~90f,   0~3s)  : DM 수신 + 고객 타이핑 + 메시지 도착
//   Scene 2 (90~180f, 3~6s)  : 플로우 빌더 노드 순차 활성화 + 파티클 흐름
//   Scene 3 (180~270f,6~9s)  : 자동 응답 발송 + 카탈로그 카드 + 고객 답장
//   Scene 4 (270~360f,9~12s) : 대시보드 카운터 증가 + 스파클
//   Scene 5 (360~450f,12~15s): 로고 리빌 + CTA (seamless loop 으로 Scene1 과 이어짐)
// ─────────────────────────────────────────────────────────────

const COLORS = {
  primary: "#2563EB",
  primaryLight: "#3B82F6",
  primaryDark: "#1D4ED8",
  purple: "#8B5CF6",
  pink: "#EC4899",
  bgGray: "#F1F5F9",
  bubbleGray: "#F1F5F9",
  text: "#0F172A",
  textMuted: "#64748B",
  green: "#10B981",
  border: "#E2E8F0",
};

// 이징 단축
const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);
const smoothSpring = (frame, fps, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.6, stiffness: 120 } });

// ─── 공통: 배경 오브 + 파티클 ───
const BgOrbs = ({ palette = "blue" }) => {
  const frame = useCurrentFrame();
  const colors = {
    blue: ["#3B82F6", "#8B5CF6", "#06B6D4"],
    dark: ["#60A5FA", "#A78BFA", "#22D3EE"],
    light: ["#93C5FD", "#C4B5FD", "#67E8F9"],
  }[palette];
  return (
    <>
      {[0, 1, 2].map((i) => {
        const x = 30 + i * 35 + Math.sin(frame * 0.012 + i * 2) * 12;
        const y = 40 + i * 20 + Math.cos(frame * 0.015 + i * 1.5) * 10;
        const size = 380 + i * 60;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: "50%",
              background: colors[i],
              opacity: 0.18,
              filter: "blur(90px)",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

// ─── 공통: Phone 프레임 ───
const PhoneFrame = ({ children, scale = 1, rotate = 0, translateY = 0 }) => (
  <div
    style={{
      width: 380,
      height: 680,
      background: "#0F172A",
      borderRadius: 48,
      padding: 10,
      boxShadow:
        "0 50px 100px -20px rgba(15,23,42,0.45), 0 30px 60px -30px rgba(15,23,42,0.6), 0 0 0 2px rgba(255,255,255,0.06) inset",
      transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
      transformOrigin: "center",
      position: "relative",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#fff",
        borderRadius: 40,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  </div>
);

// ─── 공통: 인스타 DM 헤더 ───
const DmHeader = ({ showTyping = false }) => (
  <div
    style={{
      padding: "34px 18px 14px",
      borderBottom: `1px solid ${COLORS.border}`,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "#fff",
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#F472B6,#A855F7,#3B82F6)",
        boxShadow: "0 0 0 2px #fff, 0 0 0 3px #E2E8F0",
      }}
    />
    <div style={{ flex: 1, lineHeight: 1.2 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>customer_sj</div>
      <div style={{ fontSize: 12, color: showTyping ? COLORS.primary : COLORS.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
        {showTyping && <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green, display: "inline-block" }} />}
        {showTyping ? "입력 중..." : "Active now"}
      </div>
    </div>
    <div style={{ fontSize: 20, color: COLORS.textMuted }}>⋯</div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Scene 1 — DM 수신
// ─────────────────────────────────────────────────────────────
const Scene1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 폰 등장 애니메이션 (스프링)
  const phoneIn = smoothSpring(frame, fps, 0);
  // 상단 레이블 페이드
  const labelOpacity = interpolate(frame, [6, 18], [0, 1], { extrapolateRight: "clamp", easing: easeOut });

  // 타이핑 인디케이터: 6~28f
  const typingIn = interpolate(frame, [6, 14], [0, 1], { extrapolateRight: "clamp", easing: easeOut });
  const typingOut = interpolate(frame, [26, 32], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const typingOpacity = typingIn * typingOut;

  // 실제 메시지 등장
  const msgText = "안녕하세요! 상품 가격 문의드려요 🙏";
  const msgStart = 34;
  const msgEnd = 70;
  const charsShown = Math.floor(
    interpolate(frame, [msgStart, msgEnd], [0, msgText.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const bubbleIn = smoothSpring(frame, fps, msgStart - 4);
  const timeOpacity = interpolate(frame, [70, 80], [0, 1], { extrapolateRight: "clamp" });

  // 알림 배지
  const notifPop = smoothSpring(frame, fps, 34);

  // Scene 페이드 (다음 씬과 크로스페이드)
  const sceneFade = interpolate(frame, [80, 89], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg,#EFF6FF 0%,#F8FAFC 100%)",
        alignItems: "center",
        justifyContent: "center",
        opacity: sceneFade,
      }}
    >
      <BgOrbs palette="light" />
      <div
        style={{
          position: "absolute",
          top: 70,
          fontSize: 14,
          color: COLORS.textMuted,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: labelOpacity,
        }}
      >
        💬  새로운 인스타그램 DM
      </div>

      <PhoneFrame scale={0.6 + phoneIn * 0.4} translateY={(1 - phoneIn) * 40}>
        <DmHeader showTyping={typingOpacity > 0.3 && frame < 34} />
        <div
          style={{
            flex: 1,
            padding: "20px 16px",
            background: "linear-gradient(180deg,#fff 0%,#F8FAFC 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          {/* 타이핑 인디케이터 */}
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              gap: 5,
              padding: "14px 18px",
              background: COLORS.bubbleGray,
              borderRadius: 22,
              borderBottomLeftRadius: 6,
              opacity: typingOpacity,
              transform: `translateY(${(1 - typingIn) * 10}px)`,
              boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            }}
          >
            {[0, 1, 2].map((i) => {
              const phase = (frame * 0.22 + i * 0.6) % (Math.PI * 2);
              const dotY = Math.max(0, Math.sin(phase)) * -5;
              const dotOpacity = 0.3 + Math.max(0, Math.sin(phase)) * 0.7;
              return (
                <span
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: COLORS.textMuted,
                    display: "inline-block",
                    transform: `translateY(${dotY}px)`,
                    opacity: dotOpacity,
                  }}
                />
              );
            })}
          </div>

          {/* 실제 메시지 버블 */}
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "80%",
              padding: "13px 18px",
              background: "#fff",
              color: COLORS.text,
              borderRadius: 22,
              borderBottomLeftRadius: 6,
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.5,
              opacity: bubbleIn,
              transform: `translateY(${(1 - bubbleIn) * 16}px) scale(${0.9 + bubbleIn * 0.1})`,
              transformOrigin: "left bottom",
              boxShadow: "0 4px 14px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.04)",
              minHeight: 24,
            }}
          >
            {msgText.slice(0, charsShown)}
            {charsShown < msgText.length && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 16,
                  background: COLORS.primary,
                  marginLeft: 2,
                  verticalAlign: "-3px",
                  opacity: Math.floor(frame / 3) % 2,
                }}
              />
            )}
          </div>

          <div
            style={{
              alignSelf: "flex-start",
              fontSize: 11,
              color: COLORS.textMuted,
              marginLeft: 6,
              opacity: timeOpacity,
              letterSpacing: "0.02em",
            }}
          >
            방금 · 읽지 않음
          </div>
        </div>
      </PhoneFrame>

      {/* 알림 배지 */}
      <div
        style={{
          position: "absolute",
          top: "22%",
          right: "22%",
          padding: "10px 18px",
          background: "rgba(239, 68, 68, 0.95)",
          color: "#fff",
          borderRadius: 100,
          fontSize: 13,
          fontWeight: 800,
          boxShadow: "0 10px 30px -5px rgba(239,68,68,0.5)",
          transform: `scale(${notifPop}) rotate(${(1 - notifPop) * 8}deg)`,
          opacity: Math.min(1, notifPop) * sceneFade,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>🔔</span>
        <span>새 DM 1건</span>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Scene 2 — 플로우 빌더 노드 순차 실행 + 파티클 흐름
// ─────────────────────────────────────────────────────────────
const Scene2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = smoothSpring(frame, fps, 0);
  const labelOpacity = interpolate(frame, [4, 14], [0, 1], { extrapolateRight: "clamp", easing: easeOut });

  const nodes = [
    { id: "trigger", label: "DM 수신 감지", icon: "📩", color: "#60A5FA", glow: "rgba(96,165,250,", activeAt: 10 },
    { id: "keyword", label: "키워드 매칭\n'가격'", icon: "🔍", color: "#A78BFA", glow: "rgba(167,139,250,", activeAt: 28 },
    { id: "action", label: "AI 응답 생성", icon: "✨", color: "#F472B6", glow: "rgba(244,114,182,", activeAt: 46 },
    { id: "followup", label: "카탈로그 전송", icon: "📎", color: "#34D399", glow: "rgba(52,211,153,", activeAt: 64 },
  ];

  const sceneFade = interpolate(frame, [80, 89], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // 파티클(엣지를 타고 흐르는 빛)
  const flowParticles = [];
  nodes.forEach((node, i) => {
    if (i === nodes.length - 1) return;
    const nextNode = nodes[i + 1];
    const activeStart = node.activeAt + 2;
    const activeEnd = nextNode.activeAt + 2;
    if (frame >= activeStart && frame <= activeEnd + 4) {
      for (let p = 0; p < 3; p++) {
        const particleFrame = frame - activeStart - p * 3;
        if (particleFrame < 0 || particleFrame > activeEnd - activeStart + 4) continue;
        const prog = particleFrame / (activeEnd - activeStart);
        flowParticles.push({ nodeIdx: i, progress: Math.min(1, prog), color: node.color });
      }
    }
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg,#0B1220 0%,#0F172A 50%,#1E293B 100%)",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        opacity: sceneFade,
      }}
    >
      {/* 그리드 패턴 + 패럴랙스 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(96,165,250,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,0.08) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
          backgroundPosition: `${frame * 0.3}px ${frame * 0.2}px`,
          maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 40%, transparent 80%)",
        }}
      />
      {/* 오브 */}
      <BgOrbs palette="dark" />

      <div
        style={{
          position: "absolute",
          top: 60,
          fontSize: 14,
          color: "#93C5FD",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          opacity: labelOpacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#60A5FA", boxShadow: "0 0 16px #60A5FA, 0 0 0 4px rgba(96,165,250,0.2)" }} />
        센드잇 자동화 엔진 실행 중
      </div>

      {/* 노드 체인 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          position: "relative",
          transform: `scale(${0.85 + enterProgress * 0.15})`,
          opacity: enterProgress,
        }}
      >
        {nodes.map((node, i) => {
          const active = frame >= node.activeAt;
          const nodeSpring = smoothSpring(frame, fps, node.activeAt);
          const glowPulse = active ? 20 + Math.sin((frame - node.activeAt) * 0.15) * 14 : 0;
          const floatY = active ? Math.sin((frame - node.activeAt) * 0.08 + i) * 3 : 0;

          return (
            <div key={node.id} style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
              {/* 노드 카드 */}
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 24,
                  background: active
                    ? `linear-gradient(135deg, ${node.color}, ${node.color}cc)`
                    : "rgba(255,255,255,0.04)",
                  border: active ? `1.5px solid ${node.color}` : "1.5px solid rgba(255,255,255,0.1)",
                  boxShadow: active
                    ? `0 0 ${glowPulse}px ${node.glow}0.6), 0 12px 40px -8px ${node.glow}0.5), 0 0 0 1px ${node.glow}0.4) inset`
                    : "0 8px 24px -12px rgba(0,0,0,0.3)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transform: `translateY(${floatY}px) scale(${active ? 0.85 + nodeSpring * 0.15 : 0.92})`,
                  position: "relative",
                  transition: "all 0.3s",
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    filter: active ? "none" : "grayscale(100%) brightness(0.5)",
                    transform: `scale(${active ? 1 : 0.85})`,
                  }}
                >
                  {node.icon}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: active ? "#fff" : "rgba(255,255,255,0.45)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {node.label}
                </div>

                {/* 실행 완료 체크 */}
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#10B981,#059669)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 900,
                      boxShadow: "0 6px 16px rgba(16,185,129,0.5), 0 0 0 3px rgba(255,255,255,0.12)",
                      transform: `scale(${nodeSpring})`,
                    }}
                  >
                    ✓
                  </div>
                )}

                {/* 실행 중 Ping 링 */}
                {active && frame - node.activeAt < 18 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -4,
                      borderRadius: 28,
                      border: `2px solid ${node.color}`,
                      opacity: interpolate(frame - node.activeAt, [0, 18], [0.8, 0], { extrapolateRight: "clamp" }),
                      transform: `scale(${interpolate(frame - node.activeAt, [0, 18], [1, 1.35], { extrapolateRight: "clamp" })})`,
                    }}
                  />
                )}
              </div>

              {/* 엣지 + 파티클 */}
              {i < nodes.length - 1 && (
                <div style={{ width: 48, height: 3, position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: frame >= nodes[i + 1].activeAt ? `linear-gradient(90deg, ${node.color}, ${nodes[i + 1].color})` : "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      boxShadow: frame >= nodes[i + 1].activeAt ? `0 0 12px ${node.glow}0.5)` : "none",
                    }}
                  />
                  {/* 진행 중인 파티클 */}
                  {flowParticles
                    .filter((p) => p.nodeIdx === i)
                    .map((p, pi) => (
                      <div
                        key={pi}
                        style={{
                          position: "absolute",
                          top: -4,
                          left: `${p.progress * 100}%`,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: p.color,
                          boxShadow: `0 0 14px ${p.color}, 0 0 4px #fff`,
                          transform: "translateX(-50%)",
                          opacity: 1 - p.progress * 0.3,
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 70,
          fontSize: 13,
          color: "#64748B",
          fontWeight: 500,
          opacity: interpolate(frame, [66, 78], [0, 1], { extrapolateRight: "clamp", easing: easeOut }),
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ color: "#34D399", fontWeight: 700 }}>0.4초</span>
        <span>만에 실행 완료 · 수동 대비</span>
        <span style={{ color: "#F0ABFC", fontWeight: 700 }}>1,200× 빠름</span>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Scene 3 — 자동 응답 + 카탈로그 + 고객 답장
// ─────────────────────────────────────────────────────────────
const Scene3 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp", easing: easeOut });
  const labelOpacity = interpolate(frame, [4, 14], [0, 1], { extrapolateRight: "clamp" });

  const bubbleSpring = (delay) => smoothSpring(frame, fps, delay);

  const autoChipIn = interpolate(frame, [2, 12], [0, 1], { extrapolateRight: "clamp", easing: easeOut });
  const reply1 = bubbleSpring(8);
  const catalog = bubbleSpring(26);
  const custReply = bubbleSpring(56);

  const sceneFade = interpolate(frame, [80, 89], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg,#EFF6FF 0%,#F8FAFC 100%)",
        alignItems: "center",
        justifyContent: "center",
        opacity: sceneFade,
      }}
    >
      <BgOrbs palette="light" />

      <div
        style={{
          position: "absolute",
          top: 70,
          fontSize: 14,
          color: COLORS.textMuted,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: labelOpacity,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.primary, boxShadow: `0 0 10px ${COLORS.primary}` }} />
        센드잇이 자동 응답 중
      </div>

      <PhoneFrame scale={0.6 + phoneIn * 0.4}>
        <DmHeader />
        <div
          style={{
            flex: 1,
            padding: "18px 16px",
            background: "linear-gradient(180deg,#fff 0%,#F8FAFC 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          {/* 고객 원 메시지 */}
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "78%",
              padding: "12px 16px",
              background: "#fff",
              color: COLORS.text,
              borderRadius: 22,
              borderBottomLeftRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.5,
              boxShadow: "0 2px 8px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)",
            }}
          >
            안녕하세요! 상품 가격 문의드려요 🙏
          </div>

          {/* 자동 응답 칩 */}
          <div
            style={{
              alignSelf: "center",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              background: "linear-gradient(135deg,rgba(37,99,235,0.12),rgba(139,92,246,0.12))",
              color: COLORS.primaryDark,
              fontSize: 11,
              fontWeight: 800,
              borderRadius: 100,
              border: "1px solid rgba(37,99,235,0.2)",
              opacity: autoChipIn,
              transform: `translateY(${(1 - autoChipIn) * 4}px)`,
              letterSpacing: "0.02em",
            }}
          >
            <span style={{ animation: "sparkle 1s" }}>✨</span> AI 자동 응답
          </div>

          {/* 응답 1 */}
          <div
            style={{
              alignSelf: "flex-end",
              maxWidth: "80%",
              padding: "13px 18px",
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
              color: "#fff",
              borderRadius: 22,
              borderBottomRightRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.5,
              boxShadow: "0 8px 24px -8px rgba(37,99,235,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset",
              opacity: reply1,
              transform: `translateY(${(1 - reply1) * 16}px) scale(${0.9 + reply1 * 0.1})`,
              transformOrigin: "right bottom",
            }}
          >
            반갑습니다! 상품 카탈로그 보내드릴게요 ✨
          </div>

          {/* 카탈로그 카드 */}
          <div
            style={{
              alignSelf: "flex-end",
              maxWidth: "82%",
              padding: 10,
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
              borderRadius: 22,
              borderBottomRightRadius: 6,
              boxShadow: "0 8px 24px -8px rgba(37,99,235,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset",
              opacity: catalog,
              transform: `translateY(${(1 - catalog) * 16}px) scale(${0.9 + catalog * 0.1})`,
              transformOrigin: "right bottom",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 14,
                color: "#fff",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 44,
                  background: "rgba(255,255,255,0.25)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                📄
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>2026 상품 카탈로그</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>PDF · 지금 다운로드</div>
              </div>
              <div style={{ fontSize: 16 }}>→</div>
            </div>
          </div>

          {/* 읽음 표시 */}
          <div
            style={{
              alignSelf: "flex-end",
              fontSize: 10,
              color: COLORS.textMuted,
              marginRight: 6,
              opacity: interpolate(frame, [46, 54], [0, 1], { extrapolateRight: "clamp" }),
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ color: COLORS.primary }}>✓✓</span> 읽음
          </div>

          {/* 고객 답장 */}
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: "72%",
              padding: "12px 16px",
              background: "#fff",
              color: COLORS.text,
              borderRadius: 22,
              borderBottomLeftRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.5,
              boxShadow: "0 2px 8px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)",
              opacity: custReply,
              transform: `translateY(${(1 - custReply) * 16}px) scale(${0.9 + custReply * 0.1})`,
              transformOrigin: "left bottom",
            }}
          >
            와 감사합니다! 빠르시네요 😊
          </div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Scene 4 — 대시보드 카운터 증가 + 스파클
// ─────────────────────────────────────────────────────────────
const Scene4 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = smoothSpring(frame, fps, 0);
  const labelOpacity = interpolate(frame, [4, 14], [0, 1], { extrapolateRight: "clamp" });

  // 카운터 218 → 219
  const counterProgress = interpolate(frame, [20, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const counter = 218 + Math.floor(counterProgress);

  const pulseScale = frame >= 28 && frame <= 50 ? 1 + Math.sin((frame - 28) * 0.28) * 0.06 : 1;
  const chipIn = smoothSpring(frame, fps, 38);

  const card1In = smoothSpring(frame, fps, 4);
  const card2In = smoothSpring(frame, fps, 12);
  const card3In = smoothSpring(frame, fps, 20);

  // 스파클 파티클
  const sparkles = [];
  if (frame >= 32 && frame <= 58) {
    for (let i = 0; i < 8; i++) {
      const particleFrame = frame - 32 - i * 2;
      if (particleFrame < 0 || particleFrame > 24) continue;
      const angle = (i / 8) * Math.PI * 2;
      const dist = 20 + particleFrame * 3;
      sparkles.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        opacity: 1 - particleFrame / 24,
        scale: 1 - particleFrame / 30,
      });
    }
  }

  const sceneFade = interpolate(frame, [80, 89], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // 미니 차트 바 (시간대별 응답)
  const bars = [45, 62, 38, 78, 55, 92, 84];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg,#F8FAFC 0%,#EFF6FF 100%)",
        alignItems: "center",
        justifyContent: "center",
        opacity: sceneFade,
      }}
    >
      <BgOrbs palette="light" />

      <div
        style={{
          position: "absolute",
          top: 60,
          fontSize: 14,
          color: COLORS.textMuted,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: labelOpacity,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 10px ${COLORS.green}` }} />
        실시간 대시보드
      </div>

      <div
        style={{
          display: "flex",
          gap: 22,
          alignItems: "stretch",
          transform: `scale(${0.9 + enterProgress * 0.1})`,
        }}
      >
        {/* 메인 카드: 오늘 응답 수 */}
        <div
          style={{
            width: 320,
            padding: 30,
            background: "#fff",
            borderRadius: 28,
            boxShadow: "0 30px 80px -30px rgba(37,99,235,0.35), 0 0 0 1px rgba(37,99,235,0.06)",
            position: "relative",
            overflow: "hidden",
            opacity: card1In,
            transform: `translateY(${(1 - card1In) * 30}px)`,
          }}
        >
          {/* 배경 그래디언트 */}
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, position: "relative" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "linear-gradient(135deg,#FBBF24,#F97316)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 8px 20px -5px rgba(249,115,22,0.5)",
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>오늘 자동 응답</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, opacity: 0.7 }}>지난 24시간</div>
            </div>
          </div>

          <div style={{ position: "relative", display: "inline-block" }}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 900,
                color: COLORS.text,
                lineHeight: 1,
                transform: `scale(${pulseScale})`,
                transformOrigin: "left center",
                letterSpacing: "-0.03em",
                fontFeatureSettings: "'tnum' 1",
              }}
            >
              {counter}
              <span style={{ fontSize: 24, color: COLORS.textMuted, fontWeight: 700, marginLeft: 6 }}>건</span>
            </div>
            {/* 스파클 */}
            {sparkles.map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: 30,
                  left: 20,
                  transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale})`,
                  fontSize: 14,
                  opacity: s.opacity,
                  color: "#F59E0B",
                }}
              >
                ✦
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 11px",
                background: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(52,211,153,0.15))",
                color: COLORS.green,
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 100,
                opacity: chipIn,
                transform: `translateY(${(1 - chipIn) * 6}px) scale(${0.9 + chipIn * 0.1})`,
              }}
            >
              <span>↗</span> +1 방금
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>어제보다 +32%</div>
          </div>

          {/* 미니 차트 */}
          <div style={{ marginTop: 20, display: "flex", alignItems: "flex-end", gap: 5, height: 40 }}>
            {bars.map((h, i) => {
              const barDelay = 24 + i * 2;
              const barIn = smoothSpring(frame, fps, barDelay);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h * barIn}%`,
                    background: i === bars.length - 1 ? `linear-gradient(180deg,${COLORS.primary},${COLORS.primaryDark})` : "linear-gradient(180deg,#CBD5E1,#94A3B8)",
                    borderRadius: 3,
                    transformOrigin: "bottom",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* 사이드 카드 2개 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 응답 시간 */}
          <div
            style={{
              width: 240,
              padding: 24,
              background: "#fff",
              borderRadius: 24,
              boxShadow: "0 20px 50px -20px rgba(15,23,42,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
              opacity: card2In,
              transform: `translateY(${(1 - card2In) * 30}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "linear-gradient(135deg,#A78BFA,#7C3AED)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  boxShadow: "0 6px 16px -4px rgba(124,58,237,0.4)",
                }}
              >
                ⏱
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>평균 응답 시간</div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.text, lineHeight: 1, letterSpacing: "-0.02em" }}>0.4s</div>
            <div style={{ fontSize: 11, color: COLORS.green, marginTop: 8, fontWeight: 700 }}>수동 대비 1,200× 빠름</div>
          </div>

          {/* 만족도 */}
          <div
            style={{
              width: 240,
              padding: 24,
              background: "#fff",
              borderRadius: 24,
              boxShadow: "0 20px 50px -20px rgba(15,23,42,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
              opacity: card3In,
              transform: `translateY(${(1 - card3In) * 30}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "linear-gradient(135deg,#F472B6,#EC4899)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  boxShadow: "0 6px 16px -4px rgba(236,72,153,0.4)",
                }}
              >
                💖
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>응답 만족도</div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.text, lineHeight: 1, letterSpacing: "-0.02em" }}>98.4%</div>
            <div style={{ fontSize: 11, color: COLORS.green, marginTop: 8, fontWeight: 700 }}>이번주 +2.1%p</div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 60,
          fontSize: 14,
          color: COLORS.textMuted,
          fontWeight: 500,
          opacity: interpolate(frame, [52, 64], [0, 1], { extrapolateRight: "clamp", easing: easeOut }),
        }}
      >
        고객이 질문하는 순간, 센드잇은 이미 답했습니다.
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Scene 5 — 로고 리빌 + CTA (seamless loop)
// ─────────────────────────────────────────────────────────────
const Scene5 = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoProgress = smoothSpring(frame, fps, 0);

  // 글자 stagger reveal
  const line1 = "센드잇과 함께";
  const line2 = "5분 만에 시작하세요";
  const letterIn = (i, delay) => interpolate(frame, [delay + i * 1.2, delay + i * 1.2 + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  const ctaIn = smoothSpring(frame, fps, 44);

  // 마지막 12프레임에서 페이드아웃 (Scene1의 light gradient로 이어짐)
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

  // 카운트다운 별빛
  const starCount = 30;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg,#0B1220 0%,#1E3A8A 35%,#1D4ED8 65%,#2563EB 100%)",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      <BgOrbs palette="dark" />

      {/* 별빛 배경 */}
      {Array.from({ length: starCount }).map((_, i) => {
        const x = (i * 37) % 100;
        const y = (i * 53) % 100;
        const twinkle = 0.3 + Math.abs(Math.sin(frame * 0.05 + i)) * 0.7;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "#fff",
              opacity: twinkle * 0.6,
              boxShadow: `0 0 6px #fff`,
            }}
          />
        );
      })}

      {/* 회전 광채 링 */}
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          borderRadius: "50%",
          background: "conic-gradient(from 0deg, transparent 60%, rgba(139,92,246,0.4), transparent)",
          transform: `rotate(${frame * 1.5}deg)`,
          filter: "blur(60px)",
          opacity: logoProgress * 0.7,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, position: "relative" }}>
        {/* 로고 */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)",
              filter: "blur(30px)",
              opacity: logoProgress,
            }}
          />
          <Img
            src={staticFile("sendit-logo.png")}
            style={{
              width: 140,
              height: 140,
              transform: `scale(${logoProgress}) rotate(${(1 - logoProgress) * -25}deg)`,
              filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.5)) drop-shadow(0 0 40px rgba(139,92,246,0.5))",
              position: "relative",
            }}
          />
        </div>

        {/* 텍스트 stagger */}
        <div style={{ textAlign: "center", lineHeight: 1.15 }}>
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 4 }}>
            {line1.split("").map((ch, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  color: "#fff",
                  opacity: letterIn(i, 16),
                  transform: `translateY(${(1 - letterIn(i, 16)) * 20}px)`,
                }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.03em" }}>
            {line2.split("").map((ch, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg,#93C5FD 0%,#C4B5FD 50%,#F0ABFC 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  opacity: letterIn(i, 28),
                  transform: `translateY(${(1 - letterIn(i, 28)) * 20}px)`,
                }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </div>
        </div>

        {/* CTA 버튼 */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 34px",
            background: "#fff",
            color: COLORS.primaryDark,
            fontSize: 18,
            fontWeight: 800,
            borderRadius: 16,
            boxShadow: "0 25px 50px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.2) inset",
            opacity: ctaIn,
            transform: `translateY(${(1 - ctaIn) * 20}px) scale(${0.9 + ctaIn * 0.1})`,
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ fontSize: 20 }}>🚀</span>
          <span>무료로 시작하기</span>
          <span style={{ fontSize: 20, display: "inline-block", transform: `translateX(${Math.sin(frame * 0.15) * 3}px)` }}>→</span>
        </div>

        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            opacity: interpolate(frame, [54, 66], [0, 1], { extrapolateRight: "clamp" }),
            fontWeight: 500,
          }}
        >
          카드 정보 불필요 · 5분 만에 완료 · 언제든 해지
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// 메인 Composition (450 frames @ 30fps = 15s)
// ─────────────────────────────────────────────────────────────
export const DemoFlow = () => {
  return (
    <AbsoluteFill
      style={{
        background: "#fff",
        fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <Sequence from={0} durationInFrames={90}>
        <Scene1 />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <Scene2 />
      </Sequence>
      <Sequence from={180} durationInFrames={90}>
        <Scene3 />
      </Sequence>
      <Sequence from={270} durationInFrames={90}>
        <Scene4 />
      </Sequence>
      <Sequence from={360} durationInFrames={90}>
        <Scene5 />
      </Sequence>
    </AbsoluteFill>
  );
};
