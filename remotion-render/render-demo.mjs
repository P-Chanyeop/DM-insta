// render-demo.mjs
// 랜딩 페이지 "데모 보기" 모달용 15초 루프 MP4 렌더링.
// 출력: frontend/public/images/demo.mp4 (+ 호환용 demo.webm)
//
// MP4(h264) 를 기본으로 <video autoplay loop muted playsinline> 로 재생.
// GIF 대비 10배 작은 용량 + 30fps 부드러운 프레임.

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const outDir = path.resolve(__dirname, "../frontend/public/images");
fs.mkdirSync(outDir, { recursive: true });

const mp4Path = path.join(outDir, "demo.mp4");
const webmPath = path.join(outDir, "demo.webm");

async function main() {
  console.log("[demo] Bundling Remotion project...");
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "src/index.jsx"),
    webpackOverride: (config) => config,
    publicDir: path.resolve(__dirname, "public"),
  });

  console.log("[demo] Resolving DemoFlow composition...");
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "DemoFlow",
  });

  const makeProgress = (label) => ({ progress }) => {
    if (Number.isFinite(progress)) {
      process.stdout.write(`\r[demo] ${label}: ${(progress * 100).toFixed(1)}%`);
    }
  };

  // ── MP4 (h264) ──
  console.log(`\n[demo] Rendering MP4 ${composition.width}x${composition.height} @ ${composition.fps}fps (${composition.durationInFrames} frames)...`);
  const t0 = Date.now();
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: mp4Path,
    imageFormat: "jpeg",
    jpegQuality: 92,
    // CRF 낮을수록 고화질 (16=고화질, 23=기본, 28=저화질). 18 = 블루레이 수준.
    crf: 20,
    onProgress: makeProgress("MP4"),
    // 오디오 없음 (autoplay muted 정책에도 유리)
    muted: true,
    enforceAudioTrack: false,
  });
  const mp4Sec = ((Date.now() - t0) / 1000).toFixed(1);
  const mp4Kb = (fs.statSync(mp4Path).size / 1024).toFixed(0);
  console.log(`\n[demo] MP4 done in ${mp4Sec}s → ${mp4Kb} KB`);

  // ── WebM (VP9) — Safari 이외 브라우저 대체용. 시간이 더 걸리므로 생략하고 싶으면 주석처리 ──
  // console.log(`\n[demo] Rendering WebM fallback...`);
  // const t1 = Date.now();
  // await renderMedia({
  //   composition,
  //   serveUrl: bundled,
  //   codec: "vp9",
  //   outputLocation: webmPath,
  //   onProgress: makeProgress("WebM"),
  //   muted: true,
  // });
  // const webmSec = ((Date.now() - t1) / 1000).toFixed(1);
  // const webmKb = (fs.statSync(webmPath).size / 1024).toFixed(0);
  // console.log(`\n[demo] WebM done in ${webmSec}s → ${webmKb} KB`);

  // 구 GIF 파일이 있으면 삭제 (video로 교체됨)
  const oldGif = path.join(outDir, "demo.gif");
  if (fs.existsSync(oldGif)) {
    fs.unlinkSync(oldGif);
    console.log(`[demo] 구 demo.gif 제거 완료`);
  }

  console.log(`\n[demo] 완료!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
