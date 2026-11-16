// `npm run scan` — the dashboard bug scanner (go-live step 6).
//
// Every dashboard route, at 390 and 1440 px, in English and Hindi, for seeded founders in each
// state (empty, directions revealed, roadmap active), on the LOCAL review server (never
// production). It fails on: console errors, failed requests, sideways overflow, overlapping
// controls, text under 15 px, untranslated text in Hindi, dead buttons, empty states with no next
// step, and greyed-out tabs with no reason.
//
//   1. COMPARE_AI=fake npx playwright test -c playwright.compare.config.ts   (serves :4175)
//   2. seed once: E2E_BASE_URL=http://localhost:4175 E2E_APP_URL=http://localhost:4175 \
//        E2E_FAKE_URL=http://127.0.0.1:54329 npx playwright test -c playwright.seed.config.ts
//   3. npm run scan            (SCAN_ONLY=hi or SCAN_ONLY=390 to narrow; SCAN_SHOTS=1 for shots)
//
// Report: docs/redesign/scan/report.json (+ report.md).
import fs from "node:fs";
import { chromium } from "@playwright/test";

const APP = process.env.SCAN_APP ?? "http://localhost:4175";
const FAKE = process.env.SCAN_FAKE ?? "http://127.0.0.1:54329";
const OUT = "docs/redesign/scan";
const ONLY = process.env.SCAN_ONLY ?? "";

const FOUNDERS = [
  { state: "empty", email: "founder@solventia.local" },
  { state: "directions", email: "reveal@solventia.local" },
  { state: "roadmap", email: "demo@solventia.local" },
];
const ROUTES = [
  "/dashboard",
  "/dashboard/opportunities",
  "/dashboard/roadmap",
  "/dashboard/roadmap/official",
  "/dashboard/proof",
  "/dashboard/history",
  "/dashboard/settings",
];
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];

/** Latin-script words that are right in Hindi: names, tax/app terms, units. */
const HI_ALLOW = new Set(
  [
    "Solventia",
    "SOLVENTIA",
    "Sol",
    "AI",
    "GST",
    "UPI",
    "PAN",
    "CA",
    "NGO",
    "WhatsApp",
    "Instagram",
    "Google",
    "LinkedIn",
    "Excel",
    "Udyam",
    "INR",
    "USD",
    "EN",
    "HI",
    "English",
    "OTP",
    "PDF",
    "OK",
    "MSME",
    "JPG",
    "PNG",
    "WEBP",
    "MB",
    "KB",
    // The seeded founders' own answers (names and city they typed): user data, not UI text.
    "Local",
    "Riya",
    "Demo",
    "Gurugram",
  ].map((w) => w.toLowerCase()),
);

if (
  !(await fetch(APP)
    .then((r) => r.ok)
    .catch(() => false))
) {
  console.error(`[scan] ${APP} is not answering. Start the review server first (see the header).`);
  process.exit(2);
}

async function session(email) {
  const res = await fetch(`${FAKE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Solventia-local-1" }),
  });
  if (!res.ok) throw new Error(`[scan] cannot sign in ${email}: ${res.status} (seed first)`);
  return res.json();
}

/** Runs in the page: everything that can be judged from the rendered DOM. */
function inspect({ locale, allow }) {
  const out = {
    overflow: null,
    overlaps: [],
    small: [],
    latin: [],
    dead: [],
    emptyNoStep: [],
    greyed: [],
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      Number(cs.opacity) > 0.05
    );
  };
  const label = (el) =>
    (el.getAttribute("data-testid") ? `[${el.getAttribute("data-testid")}] ` : "") +
    (el.innerText || el.getAttribute("aria-label") || el.tagName)
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 60);

  const sw = document.documentElement.scrollWidth;
  if (sw > innerWidth + 1) {
    const wide = [...document.querySelectorAll("body *")]
      .filter((e) => vis(e) && e.getBoundingClientRect().right > innerWidth + 1)
      .slice(-3)
      .map(label);
    out.overflow = { scrollWidth: sw, width: innerWidth, culprits: wide };
  }

  // Text: size and (in Hindi) script.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seenSmall = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.trim();
    if (!text) continue;
    const el = n.parentElement;
    if (
      !el ||
      !vis(el) ||
      el.closest("script,style,noscript,[aria-hidden=true],[data-scan-ignore]")
    )
      continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 15 && !el.closest("[data-allow-small]") && !seenSmall.has(el)) {
      seenSmall.add(el);
      out.small.push(`${size}px: ${text.slice(0, 50)}`);
    }
    // "हिंदी … ❯ <source>" is the local fake translator's output (the source is kept so tests can
    // read it): that text WAS translated.
    if (
      locale === "hi" &&
      !text.includes("❯") &&
      !el.closest("input,textarea,[data-user-content],[translate=no]")
    ) {
      const words = text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
      const bad = words.filter(
        (w) => !allow.includes(w.toLowerCase()) && !/^[a-z0-9._%+-]+@/.test(text),
      );
      if (bad.length) out.latin.push(text.slice(0, 70));
    }
  }

  // Controls: overlaps, dead buttons, greyed tabs.
  const controls = [
    ...document.querySelectorAll("a[href],button,input,select,textarea,[role=button],[role=tab]"),
  ].filter(vis);
  // A control in a fixed or sticky bar covers scrolling content by design (the page scrolls it
  // clear); only two controls in the same flow overlapping is a bug.
  const pinned = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const p = getComputedStyle(e).position;
      if (p === "fixed" || p === "sticky") return true;
    }
    return false;
  };
  for (let i = 0; i < controls.length; i++) {
    const a = controls[i].getBoundingClientRect();
    for (let j = i + 1; j < controls.length; j++) {
      if (controls[i].contains(controls[j]) || controls[j].contains(controls[i])) continue;
      if (pinned(controls[i]) !== pinned(controls[j])) continue;
      const b = controls[j].getBoundingClientRect();
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 4 && y > 4) out.overlaps.push(`${label(controls[i])} × ${label(controls[j])}`);
    }
  }
  const props = (el) => {
    const k = Object.keys(el).find((key) => key.startsWith("__reactProps$"));
    return k ? el[k] : {};
  };
  for (const el of document.querySelectorAll("button,[role=button]")) {
    if (!vis(el) || el.disabled || el.getAttribute("aria-disabled") === "true") continue;
    const p = props(el);
    const handled =
      p.onClick ||
      p.onMouseDown ||
      p.onPointerDown ||
      p.onKeyDown ||
      (el.type === "submit" && el.closest("form")) ||
      el.getAttribute("aria-haspopup") ||
      el.getAttribute("aria-expanded") !== null ||
      el.closest("[data-radix-collection-item],[data-state]");
    if (!handled) out.dead.push(label(el));
  }
  for (const a of document.querySelectorAll("a")) {
    if (!vis(a)) continue;
    const href = a.getAttribute("href");
    if (href === null || href === "" || href === "#") out.dead.push(`link: ${label(a)}`);
  }
  for (const el of document.querySelectorAll(
    "nav [aria-disabled=true], nav button:disabled, [role=tab][aria-disabled=true]",
  )) {
    if (!vis(el)) continue;
    if (!el.getAttribute("title") && !el.getAttribute("aria-describedby"))
      out.greyed.push(label(el));
  }
  for (const el of document.querySelectorAll("[data-testid*=empty],[data-empty]")) {
    if (!vis(el)) continue;
    if (!el.querySelector("a[href],button")) out.emptyNoStep.push(label(el));
  }
  // Phones: every control is at least 44×44 px to tap. A link inside running text is exempt
  // (WCAG 2.5.8), as is a hidden-until-focus skip link.
  out.tap = [];
  if (innerWidth <= 400) {
    for (const el of document.querySelectorAll(
      "a[href],button,[role=button],input,select,textarea,[role=tab]",
    )) {
      if (!vis(el) || el.closest("p,li > p,[data-inline-link]") || el.classList.contains("sr-only"))
        continue;
      if (getComputedStyle(el).display === "inline" && el.closest("p,span")) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 44 || r.width < 44)
        out.tap.push(`${Math.round(r.width)}×${Math.round(r.height)} ${label(el)}`);
    }
  }
  return out;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const findings = [];
let pages = 0;
for (const f of FOUNDERS) {
  const s = await session(f.email);
  for (const vp of VIEWPORTS) {
    if (ONLY && /^\d+$/.test(ONLY) && ONLY !== vp.name) continue;
    for (const locale of ["en", "hi"]) {
      if (ONLY && /^[a-z]{2}$/.test(ONLY) && ONLY !== locale) continue;
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      await ctx.addCookies([
        {
          name: "sb-127-auth-token",
          value: `base64-${Buffer.from(JSON.stringify(s)).toString("base64url")}`,
          url: APP,
        },
        { name: "solventia-locale", value: locale, url: APP },
      ]);
      const page = await ctx.newPage();
      for (const route of ROUTES) {
        const console_ = [];
        const failed = [];
        page.removeAllListeners("console");
        page.removeAllListeners("pageerror");
        page.removeAllListeners("requestfailed");
        page.removeAllListeners("response");
        page.on("console", (m) => m.type() === "error" && console_.push(m.text().slice(0, 160)));
        page.on("pageerror", (e) => console_.push(String(e).slice(0, 160)));
        page.on("requestfailed", (r) => {
          const why = r.failure()?.errorText ?? "";
          // A navigation away aborts in-flight requests: that is not a failure.
          if (!/ERR_ABORTED|NS_BINDING_ABORTED/.test(why))
            failed.push(`${why} ${r.url().slice(0, 100)}`);
        });
        page.on("response", (r) => {
          if (r.status() >= 400 && !r.url().includes("favicon"))
            failed.push(`${r.status()} ${r.url().slice(0, 100)}`);
        });
        await page.goto(`${APP}${route}`, { waitUntil: "networkidle" }).catch(() => {});
        await page.waitForTimeout(700);
        const finalPath = new URL(page.url()).pathname;
        const r = await page.evaluate(inspect, { locale, allow: [...HI_ALLOW] });
        pages++;
        const where = `${f.state} ${vp.name} ${locale} ${route}${finalPath !== route ? ` → ${finalPath}` : ""}`;
        const add = (kind, items) =>
          items.length && findings.push({ where, kind, items: [...new Set(items)].slice(0, 12) });
        add("console", console_);
        add("request", failed);
        if (r.overflow)
          add("overflow", [
            `scrollWidth ${r.overflow.scrollWidth} > ${r.overflow.width}`,
            ...r.overflow.culprits,
          ]);
        add("overlap", r.overlaps);
        add("small-text", r.small);
        add("untranslated", r.latin);
        add("dead-button", r.dead);
        add("empty-no-step", r.emptyNoStep);
        add("greyed-unexplained", r.greyed);
        add("tap-target", r.tap);
        if (process.env.SCAN_SHOTS) {
          fs.mkdirSync(`${OUT}/shots`, { recursive: true });
          await page.screenshot({
            path: `${OUT}/shots/${where.replace(/[^a-z0-9]+/gi, "_")}.jpg`,
            type: "jpeg",
            quality: 70,
            fullPage: true,
          });
        }
      }
      await ctx.close();
    }
  }
  // The top bar fits a 360 px phone, in both languages (Hindi labels are wider).
  for (const locale of ["en", "hi"]) {
    if (ONLY && /^[a-z]{2}$/.test(ONLY) && ONLY !== locale) continue;
    const ctx = await browser.newContext({ viewport: { width: 360, height: 760 } });
    await ctx.addCookies([
      {
        name: "sb-127-auth-token",
        value: `base64-${Buffer.from(JSON.stringify(s)).toString("base64url")}`,
        url: APP,
      },
      { name: "solventia-locale", value: locale, url: APP },
    ]);
    const page = await ctx.newPage();
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle" }).catch(() => {});
    const bad = await page.evaluate(() => {
      const bar = document.querySelector("[data-testid=topbar]");
      if (!bar) return [];
      return [...bar.querySelectorAll("*")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && (r.right > innerWidth + 0.5 || r.left < -0.5);
        })
        .slice(0, 4)
        .map(
          (e) =>
            (e.getAttribute("data-testid") ?? e.tagName) +
            " " +
            Math.round(e.getBoundingClientRect().right),
        );
    });
    pages++;
    if (bad.length)
      findings.push({ where: `${f.state} 360 ${locale} topbar`, kind: "topbar-360", items: bad });
    await ctx.close();
  }
}
await browser.close();

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  `${OUT}/report.json`,
  JSON.stringify({ at: new Date().toISOString(), pages, findings }, null, 2),
);
const byKind = {};
for (const x of findings) byKind[x.kind] = (byKind[x.kind] ?? 0) + 1;
fs.writeFileSync(
  `${OUT}/report.md`,
  `# Dashboard scan\n\n${pages} pages. ${findings.length} findings.\n\n` +
    findings
      .map((x) => `- **${x.kind}** — ${x.where}\n${x.items.map((i) => `  - ${i}`).join("\n")}`)
      .join("\n"),
);
console.log(`[scan] ${pages} pages · ${findings.length} findings`, byKind);
process.exit(findings.length ? 1 : 0);
