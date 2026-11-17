// Final verification of the opening and the film (owner follow-up, step 6).
//
//   node scripts/verify-intro.mjs <baseUrl> <label>
//   VERCEL_BYPASS=<token> node scripts/verify-intro.mjs https://<preview>.vercel.app preview
//
// A protected Vercel preview needs its "Protection Bypass for Automation" token (Project →
// Settings → Deployment Protection); it is sent as the documented bypass headers.
//
// Film runs (lite tier, 1440×900, a fresh browser each = a true first visit):
//   broadband, no CPU throttle · broadband, 4× CPU throttle. Each: the opening (a tap after
//   1.5 s), then the whole film scrolled down. Reported: load → data-ready, whether the lockup
//   held and for how long, long tasks and p95 frame time during the film after release, and
//   whether the mode ever changed after release.
// Checks: reduced motion (question, then the same film on its reduced-motion path), 390 px (question,
//   then the live film, no sideways scroll), a returning visit (no question), a mid-page
//   reload (no question, no hold, the place kept).
// Writes docs/redesign/perf/verify-<label>.json and exits non-zero if a check fails.
import fs from "node:fs";
import { chromium } from "@playwright/test";

const [base, label = "local"] = process.argv.slice(2);
if (!base) throw new Error("usage: node scripts/verify-intro.mjs <baseUrl> <label>");
const bypass = process.env.VERCEL_BYPASS;
const headers = bypass
  ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" }
  : {};

const launch = () =>
  chromium.launch({
    channel: "chrome",
    headless: false,
    args: ["--window-size=1440,900", "--ignore-gpu-blocklist"],
  });
const pct = (xs, q) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor(q * s.length))] * 10) / 10;
};
const HOME = "[data-testid=cinematic-home]";

async function filmRun(throttle) {
  const browser = await launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: headers,
  });
  const page = await ctx.newPage();
  // A background window gets 1 Hz animation frames in Chrome: always measure a visible one.
  await page.bringToFront();
  await page.addInitScript(() => {
    const w = window;
    w.__rec = false;
    w.__frames = [];
    w.__lt = [];
    w.__ltAll = [];
    w.__states = [];
    let last = 0;
    const tick = (now) => {
      if (w.__rec && last) w.__frames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (w.__rec) w.__lt.push(Math.round(e.duration));
        w.__ltAll.push({ s: Math.round(e.startTime), d: Math.round(e.duration) });
      }
    }).observe({ type: "longtask", buffered: false });
    const watch = () => {
      const el = document.querySelector("[data-testid=cinematic-home]");
      if (!el) return void requestAnimationFrame(watch);
      const log = () =>
        w.__states.push({
          t: Math.round(performance.now()),
          intro: el.getAttribute("data-intro-state"),
          mode: el.getAttribute("data-mode"),
          ready: el.getAttribute("data-ready"),
        });
      log();
      new MutationObserver(log).observe(el, {
        attributes: true,
        attributeFilter: ["data-intro-state", "data-mode", "data-ready"],
      });
    };
    watch();
  });
  const cdp = await ctx.newCDPSession(page);
  if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  await page.goto(`${base}/?intro=1&tier=lite&perf=1`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByTestId("intro-question").waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  await page.getByTestId("intro-choice-start").click();
  await page.waitForSelector(`${HOME}[data-intro-state=off]`, { timeout: 30_000 });
  const release = await page.evaluate(() => ({
    t: Math.round(performance.now()),
    mode: document.querySelector("[data-testid=cinematic-home]").getAttribute("data-mode"),
  }));
  // Wait for the world if this is still a film (the lockup released early or a Skip was used).
  if (release.mode === "live")
    await page
      .waitForSelector(`${HOME}[data-ready=true]`, { timeout: 60_000 })
      .catch(() => undefined);
  await page.waitForTimeout(1500);
  const total = await page.evaluate(
    () => document.querySelector("[data-testid=cinematic-timeline]")?.scrollHeight ?? 0,
  );
  await page.evaluate(() => {
    window.__frames = [];
    window.__lt = [];
    window.__rec = true;
  });
  const steps = 160;
  if (total > 0)
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, total / steps);
      await page.waitForTimeout(50);
    }
  await page.waitForTimeout(1200);
  const rec = await page.evaluate(() => {
    window.__rec = false;
    const ready = performance.getEntriesByName("cine:ready")[0]?.startTime ?? null;
    return {
      frames: window.__frames,
      lt: window.__lt,
      ltAll: window.__ltAll,
      states: window.__states,
      readyAt: ready && Math.round(ready),
      endMode: document.querySelector("[data-testid=cinematic-home]").getAttribute("data-mode"),
    };
  });
  await browser.close();
  const hold = rec.states.find((s) => s.intro === "hold");
  const off = rec.states.find((s) => s.intro === "off");
  const lockupAt = hold?.t ?? off?.t ?? null;
  // The reveal (answer lead-out → the lockup): it must add no long task of its own.
  const revealAt = rec.states.find((s) => s.intro === "reveal")?.t ?? null;
  const revealLt =
    revealAt && lockupAt ? rec.ltAll.filter((e) => e.s + e.d > revealAt && e.s < lockupAt) : [];
  return {
    throttle,
    readyMs: rec.readyAt,
    lockupMs: lockupAt,
    held: Boolean(hold),
    holdMs: hold && off ? off.t - hold.t : 0,
    modeAtRelease: release.mode,
    modeAtEnd: rec.endMode,
    switchedModeAfterRelease: release.mode !== rec.endMode,
    revealMs: revealAt && lockupAt ? lockupAt - revealAt : null,
    revealLongTasks: revealLt.length,
    revealWorstMs: revealLt.length ? Math.max(...revealLt.map((e) => e.d)) : 0,
    longTasks: rec.lt.length,
    worstLongTaskMs: rec.lt.length ? Math.max(...rec.lt) : 0,
    p95FrameMs: pct(rec.frames, 0.95),
    frames: rec.frames.length,
    states: rec.states,
  };
}

async function checks() {
  const browser = await launch();
  const out = {};

  // Reduced motion: the question, then the still version — no collapse.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
      extraHTTPHeaders: headers,
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/?intro=1`, { waitUntil: "domcontentloaded" });
    const asked = await page
      .getByTestId("intro-question")
      .isVisible({ timeout: 20_000 })
      .catch(() => false);
    await page.getByTestId("intro-choice-idea").click();
    await page.waitForSelector(`${HOME}[data-intro-state=off]`, { timeout: 20_000 });
    const mode = await page.getAttribute(HOME, "data-mode");
    out.reducedMotion = { asked, mode, pass: asked && mode === "reduced" };
    await ctx.close();
  }

  // 390 px: the question, then the still version; nothing scrolls sideways.
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      extraHTTPHeaders: headers,
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/?intro=1`, { waitUntil: "domcontentloaded" });
    const asked = await page
      .getByTestId("intro-question")
      .isVisible({ timeout: 20_000 })
      .catch(() => false);
    const sidewaysAsk = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    fs.mkdirSync("docs/redesign/perf", { recursive: true });
    await page.screenshot({ path: `docs/redesign/perf/verify-${label}-390-question.png` });
    await page.getByTestId("intro-choice-stuck").tap();
    await page.waitForSelector(`${HOME}[data-intro-state=off]`, { timeout: 20_000 });
    const mode = await page.getAttribute(HOME, "data-mode");
    const sidewaysAfter = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    out.mobile390 = {
      asked,
      mode,
      sideways: sidewaysAsk || sidewaysAfter,
      pass: asked && mode === "live" && !sidewaysAsk && !sidewaysAfter,
    };
    await ctx.close();
  }

  // A returning visit: no question — the line for their earlier choice, then the lockup and the film. The time on
  // the opening is load → the story released (data-intro-state=off).
  for (const signedIn of [false, true]) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: headers,
    });
    await ctx.addInitScript(() => localStorage.setItem("sol-intro-choice", "idea"));
    const page = await ctx.newPage();
    if (signedIn) await page.route("**/_serverFn/**", (r) => r.continue());
    await page.goto(`${base}/?intro=auto`, { waitUntil: "domcontentloaded" });
    const welcomed = await page
      .locator("[data-return-line=idea]")
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    const question = await page
      .getByTestId("intro-question")
      .isVisible()
      .catch(() => false);
    await page.waitForSelector(`${HOME}[data-intro-state=off]`, { timeout: 30_000 });
    const t = await page.evaluate(() => ({
      off: Math.round(performance.now()),
      ready: Math.round(performance.getEntriesByName("cine:ready")[0]?.startTime ?? -1),
    }));
    out[signedIn ? "returningSignedInCheck" : "returning"] = {
      welcomed,
      question,
      openingMs: t.off,
      readyMs: t.ready,
      pass: welcomed && !question,
    };
    await ctx.close();
    if (!signedIn) break; // signed-in needs real credentials: measured in e2e (intro.spec.ts)
  }

  // A mid-page reload: no question, no hold, the place kept.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: headers,
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/?intro=auto`, { waitUntil: "domcontentloaded" });
    // First visit: skip the opening, then go part-way into the story.
    // (No visible Skip since 2026-11-16: Esc ends the opening.)
    const first = await page
      .getByTestId("intro-question")
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (first) await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.35));
    await page.waitForTimeout(800);
    const before = await page.evaluate(() => window.scrollY);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => ({
      y: window.scrollY,
      state: document
        .querySelector("[data-testid=cinematic-home]")
        ?.getAttribute("data-intro-state"),
      busy: document.querySelector("[data-testid=cinematic-home]")?.getAttribute("aria-busy"),
      gate: document.documentElement.dataset.intro ?? null,
    }));
    out.midPageReload = {
      before,
      after: after.y,
      state: after.state,
      busy: after.busy,
      pass: after.state === "off" && !after.busy && after.gate === null && after.y > before * 0.8,
    };
    await ctx.close();
  }
  await browser.close();
  return out;
}

const runs = { broadband: await filmRun(1), cpu4x: await filmRun(4) };
const other = await checks();
const filmPass = (r) =>
  !r.switchedModeAfterRelease &&
  (r.throttle > 1 ? r.longTasks <= 4 : r.longTasks === 0 && r.revealLongTasks === 0);
const result = {
  label,
  base,
  at: new Date().toISOString(),
  runs: Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, { ...r, pass: filmPass(r) }])),
  checks: other,
};
result.pass =
  Object.values(result.runs).every((r) => r.pass) && Object.values(other).every((c) => c.pass);
fs.writeFileSync(`docs/redesign/perf/verify-${label}.json`, JSON.stringify(result, null, 2));
for (const [k, r] of Object.entries(result.runs))
  console.log(
    `${k}: ready ${r.readyMs} ms · lockup ${r.lockupMs} ms · held ${r.held ? `${r.holdMs} ms` : "no"} · reveal long tasks ${r.revealLongTasks} (worst ${r.revealWorstMs} ms) · long tasks ${r.longTasks} (worst ${r.worstLongTaskMs} ms) · p95 ${r.p95FrameMs} ms · mode ${r.modeAtRelease}→${r.modeAtEnd} · ${r.pass ? "PASS" : "FAIL"}`,
  );
for (const [k, c] of Object.entries(other))
  console.log(`${k}: ${c.pass ? "PASS" : "FAIL"} ${JSON.stringify(c)}`);
console.log(result.pass ? "ALL PASS" : "SOME CHECKS FAILED");
process.exit(result.pass ? 0 : 1);
