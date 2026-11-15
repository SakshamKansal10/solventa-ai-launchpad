// Time from navigation to the film's `data-ready`, split by stage, on a cold cache.
//
//   node scripts/film-ready.mjs <baseUrl> <label> [--tier=lite|full] [--runs=3] [--intro]
//
// Conditions (each run a fresh browser and profile: no HTTP cache, no GPU shader cache):
//   broadband  40 Mbps down / 10 Mbps up / 20 ms RTT, no CPU throttle
//   fast4g     9 Mbps down / 1.5 Mbps up / 150 ms RTT (DevTools "Fast 4G"), no CPU throttle
//   cpu4x      broadband network, 4× CPU slowdown
// Stages come from the app's User Timing marks (cine:*, see performance/marks.ts):
//   bundle      navigation → 3D bundle loaded (cine:bundle-loaded)
//   canvas      → WebGL canvas created
//   environment → studio environment built (PMREM)
//   shaders     → every program compiled (compileAsync, one object per frame)
//   textures    → textures uploaded
//   geometry    → geometry warm-up (one world group per frame)
//   ready       → two rendered frames later: data-ready
// Writes docs/redesign/perf/ready-<label>.json and prints medians.
import fs from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const [base, label] = args.filter((a) => !a.startsWith("--"));
const flag = (name) => args.find((a) => a.startsWith(`--${name}`));
const tier = flag("tier")?.split("=")[1] ?? "lite";
const runs = Number(flag("runs")?.split("=")[1] ?? 3);
const intro = Boolean(flag("intro"));
const only = flag("only")?.split("=")[1];
const extra = flag("query")?.slice("--query=".length) ?? "";

const MBPS = (n) => (n * 1_000_000) / 8;
const CONDITIONS = {
  broadband: {
    net: { latency: 20, downloadThroughput: MBPS(40), uploadThroughput: MBPS(10) },
    cpu: 1,
  },
  fast4g: {
    net: { latency: 150, downloadThroughput: MBPS(9), uploadThroughput: MBPS(1.5) },
    cpu: 1,
  },
  cpu4x: { net: { latency: 20, downloadThroughput: MBPS(40), uploadThroughput: MBPS(10) }, cpu: 4 },
};
const STAGES = [
  "bundle-loaded",
  "canvas-created",
  "environment",
  "shaders",
  "textures",
  "geometry",
  "ready",
];

// A fresh browser (and profile) per run: its GPU shader cache is cold, as for a first visitor.
// Runs inside one browser reuse compiled programs and read seconds faster than a real first visit.
const launch = () =>
  chromium.launch({
    channel: "chrome",
    headless: false,
    args: ["--window-size=1440,900", "--ignore-gpu-blocklist"],
  });

const median = (xs) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

const results = {};
for (const [name, cond] of Object.entries(CONDITIONS)) {
  if (only && only !== name) continue;
  results[name] = [];
  for (let r = 0; r < runs; r++) {
    const browser = await launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, ...cond.net });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cond.cpu });
    const url = `${base}/?tier=${tier}&perf=1${intro ? "&intro=1" : ""}${extra ? `&${extra}` : ""}`;
    const t0 = Date.now();
    await page.goto(url, { waitUntil: "commit", timeout: 120_000 });
    let ok = true;
    try {
      await page.waitForSelector("[data-testid=cinematic-home][data-ready=true]", {
        timeout: 90_000,
      });
    } catch {
      ok = false;
    }
    const data = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const marks = Object.fromEntries(
        performance
          .getEntriesByType("mark")
          .filter((m) => m.name.startsWith("cine:"))
          .map((m) => [m.name.slice(5), Math.round(m.startTime)]),
      );
      const details = Object.fromEntries(
        performance
          .getEntriesByType("mark")
          .filter((m) => m.name.startsWith("cine:") && m.detail)
          .map((m) => [m.name.slice(5), m.detail]),
      );
      const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
      const mode = document
        .querySelector("[data-testid=cinematic-home]")
        ?.getAttribute("data-mode");
      return {
        marks,
        details,
        fcp: fcp && Math.round(fcp),
        domContentLoaded: nav && Math.round(nav.domContentLoadedEventEnd),
        mode,
      };
    });
    results[name].push({ ok, wallMs: Date.now() - t0, ...data });
    console.log(
      name,
      r + 1,
      ok ? `ready ${data.marks.ready} ms` : "NOT READY",
      JSON.stringify(data.marks),
      JSON.stringify(data.details),
    );
    await context.close();
    await browser.close();
  }
}

const summary = {};
for (const [name, rs] of Object.entries(results)) {
  const row = {
    runs: rs.length,
    notReady: rs.filter((r) => !r.ok).length,
    fcp: median(rs.map((r) => r.fcp)),
  };
  let prev = 0;
  for (const st of STAGES) {
    const at = median(rs.map((r) => r.marks[st]));
    row[st] = at;
    row[`${st}Δ`] = at !== null ? at - prev : null;
    if (at !== null) prev = at;
  }
  row.bundleStart = median(rs.map((r) => r.marks["bundle-start"]));
  summary[name] = row;
}
console.table(
  Object.fromEntries(
    Object.entries(summary).map(([k, v]) => [
      k,
      {
        fcp: v.fcp,
        bundleStart: v.bundleStart,
        bundle: v["bundle-loaded"],
        canvas: v["canvas-createdΔ"],
        environment: v["environmentΔ"],
        shaders: v["shadersΔ"],
        textures: v["texturesΔ"],
        geometry: v["geometryΔ"],
        ready: v.ready,
        notReady: v.notReady,
      },
    ]),
  ),
);
fs.mkdirSync("docs/redesign/perf", { recursive: true });
fs.writeFileSync(
  `docs/redesign/perf/ready-${label}.json`,
  JSON.stringify(
    { label, tier, runs, intro, at: new Date().toISOString(), summary, results },
    null,
    2,
  ),
);
