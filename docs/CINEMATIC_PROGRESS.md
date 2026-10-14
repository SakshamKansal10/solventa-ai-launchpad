# Cinematic homepage — progress log (resume from here)

Local-only work on branch `cinematic-homepage`. Never push, deploy, merge or mount on `/`.
Route: `/cinematic` (noindex). `/` untouched.
Local checkpoints: `e02195c` (Phase 1 foundation), `686c42c` (21-scene experience, before the
art-direction pass), then the art-direction pass commit.

## Resume order

1. This file → 2. `git status` → 3. only the files for the next unfinished item.

## Architecture decisions (durable)

- One canvas; everything a PURE function of scroll progress (reversible); only bounded ambient
  motion uses time. `?freeze=1` zeroes time + damping for deterministic frames and exposes
  `window.__cine` (scenes, state, and `three` = scene/gl for profiling).
- World: core (the Engine) at the origin, radius ≈ 6; universe behind it; finals hub
  `[6,-0.5,-46]`; path runs −z and climbs in Elevate; product slab past the revised path.
- ONE structural primitive — the machined rounded-rectangle frame (`world/geometry/frames.ts`).
- ONE filament system (GPU Bézier ribbons, data texture) = the gold/violet signal language.
- Universe: logical 360 (rendered 360/240/120 by tier, top-36 always), 5 families × 5 instanced
  parts, deterministic illustrative scoring, 360→120→36→9→3→1.
- Product reveal = real DOM (Founder OS, illustrative) mapped onto a WebGL slab by CSS
  homography, then released to plain DOM.
- Sound = Web Audio synthesis (`sound/engine.ts`) rendering a pure score (`sound/score.ts`);
  off by default, gesture-started, session preference (`sound/controller.ts`).
- Stage is `position: fixed`; past the section it is lifted with the page (protected ending).
- Film chrome via `--immerse` written by DomSync: during the film the site links and calls to action
  leave the frame (opacity 0); the wordmark (≥ 0.55) and sound control stay. Hover or keyboard focus
  restores the whole bar; it returns for the product and the final hold.
- Keep three.js out of the eager route graph: modules imported by the route chunk (overlay,
  sound, nav) must not import three-dependent modules (check the build: see PERFORMANCE).

## Art-direction pass (2026-10-07) — DONE

- [x] material system: titanium, graphite, smoked/provisional glass, edge hairlines, pearl sparingly
- [x] Engine (core) redesign: gimbal frames + kernel lattice; fly-past assembly; ports; passage aperture
- [x] context modules (skill matrix, connector array) docking into ports; weighted labels
- [x] universe families as decision objects; confidence lights; stronger connections
- [x] final three: strata tower / nest of portal frames / orbital array; comparison + fit signals
- [x] path: portal gates (corners + bars), Validate/Build/Elevate topology + camera language
- [x] product: dark Founder OS UI; graphite slab with titanium bezel; gate token
- [x] finale: emblem + staged lockup/line/promise/CTA + protected hold; stage lift before footer
- [x] nav immersion; Geist/Geist Mono technical type (scoped)
- [x] sound system + offline render check (levels, spectrogram, WAV)
- [x] suspense: exposure beats, longer passage/selection, finale hold
- [x] mobile/tablet review; label clamping; phone milestone tags suppressed
- [x] perf regression found (glass overdraw, alpha-hash physical, heavy plates) and fixed
- [x] eager three.js regression found and fixed
- [x] fallback stills regenerated; alt texts updated
- [x] tests: unit (62 cinematic), cinematic E2E (16), visual baselines (local), full suite
- [x] docs: ART_DIRECTION, STORYBOARD, SURPRISE_MAP, PERFORMANCE, TEST_REPORT

## V2 + continuity correction (2026-10-07) — DONE locally

Commits: `e948ae0`, `660533e` (V2 checkpoints), `f97b2ad` (continuity pass), `df2e86d`, `6d2da93`.
Audits: `docs/CINEMATIC_V2_AUDIT.md` (V1 grades + programme) and `docs/CINEMATIC_CONTINUITY_AUDIT.md`
(every section-boundary moment: current / why it reads as a website / replacement / what changed).

- [x] film chrome (G1), lower-third film titles + chapter marks (G2), time scroll: hidden scrollbar on
      the route, film-time hairline, smoothing λ 3 (G3)
- [x] void signals draw the S's own edges; camera opens close and draws back; metal lands on the lines
- [x] reveal → computation → nine: one camera arc, always forward
- [x] the three futures grow out of the lattice columns; camera pushes between them
- [x] one left-side camera Validate → crisis; evidence travels in through the branch network
- [x] connected = gold routing on the product surface; it leaves and converges into the S; the S
      lands on its lines exactly as in the opening
- [x] tier policy: integrated GPUs stay medium; lighter Elevate branch frames; restraint on labels
- [x] review package `review-v2/` (same structure as `review/`, plus `comparison/` and a no-text
      walkthrough)

## Next (human review)

- Visual review of `/cinematic` on real devices (phones, Safari) — not done here.
- Decide whether to keep or tone down: the fly-past frames in Awakening, the kernel's indigo
  seam glow, the selection-scene filament density on phones.

## Tools (local, gitignored .e2e-tmp)

- `frames.mjs <base> <out> 1440x810 scene:local …` (?freeze=1; env TIER, DPR, HUD, WAIT)
- `shoot.sh <name> <cols> <WxH> scene:at …` → `.e2e-tmp/art/<name>/sheet.jpg` (env BASE, TILE)
- `review/export-v2.sh` (all V2 stills + sheets) · `review/compare-v2.sh` (V1/V2 sheets) ·
  `review/record.mjs` + `review/encode.mjs` (walkthroughs; env SOUND=1, NOTEXT=1) ·
  `review/frame-sheets.mjs` (sheets straight from recorded frames) · `flow.mjs <base> <out>`
  (continuity strip, one frame every 1.5 %)
- `review29.mjs <base> <out>` (29 reference frames) · `sheet.mjs out cols tileW files…` (env RATIO)
- `perf.mjs <base>` → perf-results.json (baseline: perf-before.json, final: perf-after.json)
- `profile.mjs <base> <tier> scene:at …` (per-material frame-time cost)
- `sound-render.mjs <dev-base> <seconds> [lead] [name]` (offline soundtrack: levels, spectrogram, WAV)
- `walkthrough.mjs <base>` · `mux-walkthrough.mjs` (adds the synced soundtrack)
- `stills.mjs <base>` (fallback WebPs → public/cinematic) · `serve-prod.mjs [port]`
- Stop `vite dev` before E2E / perf (it pegs the CPU on this OneDrive path).
