// Records the cinematic film for the "recorded" path (owner, 2026-11-17): the live 3D world,
// frozen (?freeze — no time-based motion), driven through N evenly spaced scroll positions and read
// straight off the WebGL canvas as WebP — the 3D world only (the text and product overlay stay
// live DOM over the recording, exactly as over the live film). Frame i is film progress
// i / (N − 1), the same scroll position as the live film.
//
//   node scripts/record-film.mjs <baseUrl>   (a running build, e.g. the review server :4175)
// Writes public/film/<set>/NNN.webp and public/film/manifest.json.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:4175";
const SETS = [
  // Desktop: 16:10 (16:9 and wider screens crop a little top and bottom).
  { name: "desktop", width: 1280, height: 800, scale: 1, frames: 240, quality: 0.72 },
  // Phones: portrait, small — the phone download stays small.
  { name: "phone", width: 390, height: 844, scale: 1.25, frames: 160, quality: 0.62 },
];
const out = path.resolve("public/film");
const manifest = { version: 1, recordedAt: new Date().toISOString(), sets: {} };

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--ignore-gpu-blocklist", "--window-size=1400,1000"],
});
for (const set of SETS) {
  const dir = path.join(out, set.name);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: set.width, height: set.height },
    deviceScaleFactor: set.scale,
  });
  await page.goto(`${base}/cinematic?tier=full&freeze=1&film=live`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.querySelector("[data-testid=cinematic-home]")?.getAttribute("data-ready") === "true",
    null,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(2000);
  let bytes = 0;
  const t0 = Date.now();
  for (let i = 0; i < set.frames; i++) {
    const p = i / (set.frames - 1);
    await page.evaluate((p) => {
      const sec = document.querySelector("[data-testid=cinematic-timeline]");
      const top = sec.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + p * (sec.offsetHeight - window.innerHeight));
    }, p);
    // The story eases to the scroll position: wait until it has arrived and a frame has drawn.
    await page.waitForFunction(
      () => {
        const s = window.__cine?.state;
        return s && Math.abs(s.targetProgress - s.progress) < 1e-5;
      },
      null,
      { timeout: 30_000, polling: 50 },
    );
    const url = await page.evaluate(async (q) => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const { gl, scene, camera } = window.__cine.three;
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/webp", q);
    }, set.quality);
    const buf = Buffer.from(url.split(",")[1], "base64");
    if (!url.startsWith("data:image/webp")) throw new Error(`frame ${i}: not WebP (${url.slice(0, 30)})`);
    fs.writeFileSync(path.join(dir, `${String(i).padStart(3, "0")}.webp`), buf);
    bytes += buf.length;
    if (i % 40 === 0) console.log(`${set.name} ${i}/${set.frames} (${Math.round(bytes / 1024)} KB, ${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  const size = await page.evaluate(() => {
    const c = window.__cine.three.gl.domElement;
    return [c.width, c.height];
  });
  manifest.sets[set.name] = {
    frames: set.frames,
    width: size[0],
    height: size[1],
    bytes,
    path: `/film/${set.name}/`,
  };
  console.log(`${set.name}: ${set.frames} frames ${size.join("x")}, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  await page.close();
}
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
