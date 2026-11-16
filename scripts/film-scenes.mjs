// One screenshot per scene of the cinematic film (middle of each scene, ?freeze=1 frames), for
// comparing two builds. usage: node scripts/film-scenes.mjs <url-with-query> <outDir>
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({
  channel: "chrome",
  args: ["--window-size=1440,900", "--ignore-gpu-blocklist"],
});
// A protected Vercel preview: VERCEL_BYPASS = its "Protection Bypass for Automation" token.
const bypass = process.env.VERCEL_BYPASS;
const p = await b.newPage({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: bypass
    ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" }
    : {},
});
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
await p.waitForFunction(
  () =>
    document.querySelector("[data-testid=cinematic-home]")?.getAttribute("data-ready") === "true",
  null,
  { timeout: 120_000 },
);
await p.waitForTimeout(2500);
const scenes = await p.evaluate(() => window.__cine.scenes.map((s) => s.id));
const info = await p.evaluate(() => ({
  mode: document.querySelector("[data-testid=cinematic-home]").getAttribute("data-mode"),
  tier: document.querySelector("[data-testid=cinematic-home]").getAttribute("data-tier"),
}));
for (const [i, id] of scenes.entries()) {
  await p.evaluate((sid) => {
    const r = window.__cine.scenes.find((s) => s.id === sid);
    const pr = r.start + (r.end - r.start) * 0.5;
    const sec = document.querySelector("[data-testid=cinematic-timeline]");
    const top = sec.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + pr * (sec.offsetHeight - window.innerHeight));
  }, id);
  await p.waitForTimeout(1600);
  await p.screenshot({ path: path.join(out, `${String(i).padStart(2, "0")}-${id}.png`) });
}
console.log(JSON.stringify({ ...info, scenes: scenes.length }));
await b.close();
