// Cinematic homepage performance on a LOCAL production build (never production).
//
//   node scripts/film-perf.mjs <baseUrl> <label> [--tier=full|lite] [--headless] [--no-throttle]
//
// Reports, for one full scroll pass down and back up:
//   - frame time p50 / p95 / worst (requestAnimationFrame deltas — not average fps)
//   - long tasks over 50 ms (count, worst)
//   - main-thread self time split: Scripting / Rendering / Painting / GPU (Chrome trace)
//   - the hottest JavaScript functions (CPU profile, self time)
//   - per scene: frame time p95 and the renderer's draw calls / triangles
//   - then the same pass at 4× CPU throttling (frames + long tasks)
// The page is opened with ?perf=1, which exposes window.__cine (counters only, no HUD).
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const [base, label] = args.filter((a) => !a.startsWith("--"));
const flag = (name) => args.find((a) => a.startsWith(`--${name}`));
const tier = flag("tier")?.split("=")[1];
const headless = Boolean(flag("headless"));
const throttleToo = !flag("no-throttle");

const browser = await chromium.launch({
  channel: "chrome",
  headless,
  args: ["--window-size=1440,900", "--ignore-gpu-blocklist"],
});

const pct = (xs, q) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const r1 = (n) => Math.round(n * 10) / 10;

// ---- trace → self time per category (main renderer thread, plus the GPU process) ----
const SCRIPTING = new Set([
  "FunctionCall", "EvaluateScript", "TimerFire", "FireAnimationFrame", "EventDispatch",
  "RunMicrotasks", "v8.compile", "v8.evaluateModule", "V8.Execute", "v8.run", "MinorGC",
  "MajorGC", "BlinkGC.AtomicPhase", "V8.GC_SCAVENGER", "V8.GCScavenger", "GCEvent",
  "v8.callFunction", "FireIdleCallback", "ParseScriptOnBackground", "v8.parseOnBackground",
]);
const RENDERING = new Set([
  "UpdateLayoutTree", "RecalculateStyles", "Layout", "HitTest", "PrePaint", "UpdateLayerTree",
  "ScheduleStyleRecalculation", "LayoutShift", "IntersectionObserverController::computeIntersections",
  "Document::updateStyleAndLayout", "ResizeObserver::BroadcastObservations", "LocalFrameView::RunPostLifecycleSteps",
  // Style recalculation as Blink names it in current traces (DevTools files it under Rendering).
  "Document::recalcStyle", "Document::updateStyle", "Blink.PrePaint.UpdateTime", "LocalFrameView::UpdateStyleAndLayout",
]);
const PAINTING = new Set([
  "Paint", "PaintImage", "CompositeLayers", "Commit", "Decode Image", "Decode LazyPixelRef",
  "RasterTask", "Layerize", "PaintArtifactCompositor::Update", "ImageDecodeTask",
]);
function categorize(events) {
  const threads = new Map();
  let mainTid = null;
  let gpuPid = null;
  for (const e of events) {
    if (e.ph === "M" && e.name === "thread_name" && e.args?.name === "CrRendererMain") mainTid ??= `${e.pid}:${e.tid}`;
    if (e.ph === "M" && e.name === "process_name" && e.args?.name === "GPU Process") gpuPid = e.pid;
  }
  const out = { scripting: 0, rendering: 0, painting: 0, other: 0, gpu: 0 };
  const otherNames = new Map();
  for (const e of events) {
    if (e.ph !== "X" || typeof e.dur !== "number") continue;
    if (e.pid === gpuPid && (e.name === "GPUTask" || e.name === "CommandBufferStub::OnAsyncFlush")) {
      out.gpu += e.dur / 1000;
      continue;
    }
    const key = `${e.pid}:${e.tid}`;
    if (key !== mainTid) continue;
    if (!threads.has(key)) threads.set(key, []);
    threads.get(key).push(e);
  }
  const main = (threads.get(mainTid) ?? []).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  // Self time: an event's duration minus its direct children's.
  const self = new Map();
  const stack = [];
  for (const e of main) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    const parent = stack[stack.length - 1];
    self.set(e, e.dur);
    if (parent) self.set(parent, self.get(parent) - e.dur);
    stack.push(e);
  }
  for (const [e, us] of self) {
    const ms = Math.max(0, us) / 1000;
    if (SCRIPTING.has(e.name) || e.name.startsWith("V8.") || e.name.startsWith("v8.")) out.scripting += ms;
    else if (RENDERING.has(e.name)) out.rendering += ms;
    else if (PAINTING.has(e.name)) out.painting += ms;
    else if (e.name !== "RunTask" && e.name !== "ThreadControllerImpl::RunTask") {
      out.other += ms;
      otherNames.set(e.name, (otherNames.get(e.name) ?? 0) + ms);
    }
  }
  out.otherTop = [...otherNames.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([n, ms]) => `${Math.round(ms)} ms ${n}`);
  for (const k of ["scripting", "rendering", "painting", "other", "gpu"]) out[k] = Math.round(out[k]);
  return out;
}

// ---- CPU profile → hottest functions by self time ----
function hotFunctions(profile, top = 14) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const selfUs = new Map();
  const dts = profile.timeDeltas;
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byId.get(profile.samples[i]);
    const dt = dts[i + 1] ?? 0;
    const cf = n.callFrame;
    if (cf.functionName === "(idle)" || cf.functionName === "(program)") continue;
    const file = (cf.url || "").split("/").pop()?.split("?")[0] ?? "";
    const key = `${cf.functionName || "(anonymous)"}  ${file}:${cf.lineNumber + 1}:${cf.columnNumber + 1}`;
    selfUs.set(key, (selfUs.get(key) ?? 0) + dt);
  }
  return [...selfUs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([k, us]) => `${String(Math.round(us / 1000)).padStart(6)} ms  ${k}`);
}

async function run({ throttle = 1, trace = false, profile = false, passes = ["down", "up"] }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  await page.addInitScript(() => {
    const w = window;
    w.__rec = false;
    w.__frames = [];
    w.__lt = [];
    let last = 0;
    const tick = (now) => {
      if (w.__rec && last) {
        const st = w.__cine?.state;
        w.__frames.push([now - last, st?.sceneIndex ?? -1, st?.renderer?.calls ?? 0, st?.renderer?.triangles ?? 0]);
      }
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (w.__rec) w.__lt.push(Math.round(e.duration));
    }).observe({ type: "longtask", buffered: false });
  });
  const cdp = await ctx.newCDPSession(page);
  const q = tier ? `&tier=${tier}` : "";
  await page.goto(`${base}/?perf=1${q}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-testid=cinematic-home]");
      return el && el.getAttribute("data-mode") !== "pending" && el.getAttribute("data-ready") === "true";
    },
    null,
    { timeout: 90_000 },
  );
  // Let the start-up settle (shader warm-up, the adaptive-quality sample window).
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const el = document.querySelector("[data-testid=cinematic-home]");
    const st = window.__cine?.state;
    const gl = window.__cine?.three?.gl;
    return {
      mode: el?.getAttribute("data-mode"),
      tier: el?.getAttribute("data-tier"),
      reasons: st?.capability?.reasons ?? [],
      gpu: st?.device?.gpu ?? null,
      dpr: st?.perf?.dpr ?? null,
      notch: st?.perf?.notch ?? null,
      windowMedians: st?.perf?.medians ?? [],
      programs: gl?.info?.programs?.length ?? null,
      textures: gl?.info?.memory?.textures ?? null,
      geometries: gl?.info?.memory?.geometries ?? null,
    };
  });
  if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  if (trace)
    await browser.startTracing(page, {
      categories: [
        "devtools.timeline", "disabled-by-default-devtools.timeline", "v8.execute", "blink", "gpu",
        "disabled-by-default-devtools.timeline.frame", "toplevel",
      ],
    });
  if (profile) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
    await cdp.send("Profiler.start");
  }
  const total = await page.evaluate(
    () => document.querySelector("[data-testid=cinematic-timeline]")?.scrollHeight ?? document.documentElement.scrollHeight,
  );
  // Chrome's own main-thread counters (seconds), as a check on the trace split.
  await cdp.send("Performance.enable");
  const metric = async () =>
    Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const m0 = await metric();
  await page.evaluate(() => {
    window.__frames = [];
    window.__lt = [];
    window.__rec = true;
  });
  // A steady, human-like scroll: 160 wheel steps per direction, ~50 ms apart (≈ 8 s a pass).
  const steps = 160;
  for (const dir of passes) {
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, (dir === "down" ? 1 : -1) * (total / steps));
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(1200);
  }
  const m1 = await metric();
  const chromeMs = Object.fromEntries(
    [
      ["script", "ScriptDuration"],
      ["styleRecalc", "RecalcStyleDuration"],
      ["layout", "LayoutDuration"],
      ["allTasks", "TaskDuration"],
    ].map(([k, n]) => [k, Math.round((m1[n] - m0[n]) * 1000)]),
  );
  const rec = await page.evaluate(() => {
    window.__rec = false;
    return { frames: window.__frames, lt: window.__lt };
  });
  let traceSplit = null;
  if (trace) {
    const buf = await browser.stopTracing();
    traceSplit = categorize(JSON.parse(buf.toString()).traceEvents);
  }
  let hot = null;
  if (profile) {
    const { profile: p } = await cdp.send("Profiler.stop");
    hot = hotFunctions(p);
  }
  await ctx.close();

  const ft = rec.frames.map((f) => f[0]);
  const scenes = new Map();
  for (const [dt, idx, calls, tris] of rec.frames) {
    if (!scenes.has(idx)) scenes.set(idx, { ft: [], calls: 0, tris: 0 });
    const sc = scenes.get(idx);
    sc.ft.push(dt);
    sc.calls = Math.max(sc.calls, calls);
    sc.tris = Math.max(sc.tris, tris);
  }
  return {
    throttle,
    info,
    frames: ft.length,
    frameMs: { p50: r1(pct(ft, 0.5)), p95: r1(pct(ft, 0.95)), worst: r1(Math.max(0, ...ft)) },
    longTasksOver50: rec.lt.filter((d) => d > 50).length,
    worstLongTask: Math.max(0, ...rec.lt),
    traceSplitMs: traceSplit,
    chromeMetricsMs: chromeMs,
    perScene: [...scenes.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([idx, s]) => `scene ${String(idx).padStart(2)}: p95 ${String(r1(pct(s.ft, 0.95))).padStart(5)} ms · ${String(s.calls).padStart(3)} draw calls · ${s.tris} triangles · ${s.ft.length} frames`),
    hotFunctions: hot,
    errors: errors.slice(0, 4),
  };
}

const results = { label, tier: tier ?? "auto" };
// Frame times and the trace split first, without the profiler (it adds its own overhead); then a
// separate profiled pass for the hottest functions.
results.unthrottled = await run({ throttle: 1, trace: true });
results.unthrottled.hotFunctions = (await run({ throttle: 1, profile: true })).hotFunctions;
if (throttleToo) results.throttled4x = await run({ throttle: 4, passes: ["down"] });
console.log(JSON.stringify(results, null, 1));
await browser.close();
