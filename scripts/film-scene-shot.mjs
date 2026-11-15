// One scene of the cinematic film, captured at a point in it (frozen frames), for before/after.
//   node scripts/film-scene-shot.mjs <baseUrl> <sceneId> <at 0..1> <out.png> [--tier=lite] [--width=1440]
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const [base, scene, at, out] = args.filter((a) => !a.startsWith("--"));
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const tier = flag("tier") ?? "lite";
const width = Number(flag("width") ?? 1440);
const height = Math.round((width * 900) / 1440);

mkdirSync(path.dirname(out), { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  args: [`--window-size=${width},${height}`, "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(`${base}/cinematic?tier=${tier}&freeze=1`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(
  () =>
    document.querySelector("[data-testid=cinematic-home]")?.getAttribute("data-ready") === "true",
  null,
  { timeout: 120_000 },
);
await page.waitForTimeout(1500);
await page.evaluate(
  ([id, l]) => {
    const r = window.__cine.scenes.find((s) => s.id === id);
    const p = r.start + (r.end - r.start) * Number(l);
    const sec = document.querySelector("[data-testid=cinematic-timeline]");
    const top = sec.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + p * (sec.offsetHeight - window.innerHeight));
  },
  [scene, at],
);
await page.waitForTimeout(2200);
await page.screenshot({ path: out });
const mode = await page.getAttribute("[data-testid=cinematic-home]", "data-mode");
console.log(JSON.stringify({ scene, at, mode, out }));
await browser.close();
