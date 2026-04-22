// render-demo.mjs
// 랜딩 페이지 "데모 보기" 모달용 15초 루프 GIF 렌더링.
// 출력: frontend/public/images/demo.gif

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const outPath = path.resolve(__dirname, "../frontend/public/images/demo.gif");
fs.mkdirSync(path.dirname(outPath), { recursive: true });

async function main() {
  console.log("[demo] Bundling Remotion project...");
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "src/index.jsx"),
    webpackOverride: (config) => config,
    // public/ 디렉토리를 staticFile() 루트로 노출
    publicDir: path.resolve(__dirname, "public"),
  });

  console.log("[demo] Resolving DemoFlow composition...");
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "DemoFlow",
  });

  console.log(`[demo] Rendering GIF ${composition.width}x${composition.height} @ ${composition.fps}fps (${composition.durationInFrames} frames)...`);
  console.log(`[demo] Output: ${outPath}`);

  const t0 = Date.now();
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "gif",
    outputLocation: outPath,
    imageFormat: "png",
    // GIF 최적화: 프레임 컬러 제한 없이 기본 팔레트 사용.
    // 용량이 크면 numberOfGifLoops=0 (무한 루프) 유지하면서 fps를 낮추거나 해상도를 줄일 것.
    numberOfGifLoops: 0, // 0 = 무한 루프
    everyNthFrame: 2, // 24fps → 실질 12fps 로 GIF 용량 반감 (애니메이션 부드러움은 유지)
    onProgress: ({ progress }) => {
      if (Number.isFinite(progress)) {
        process.stdout.write(`\r[demo] Progress: ${(progress * 100).toFixed(1)}%`);
      }
    },
  });

  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`\n[demo] Done in ${sec}s → ${sizeKb} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
