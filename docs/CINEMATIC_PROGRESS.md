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
- Nav immersion via `--immerse` written by DomSync (never below AA contrast).
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

## Next (human review)
- Visual review of `/cinematic` on real devices (phones, Safari) — not done here.
- Decide whether to keep or tone down: the fly-past frames in Awakening, the kernel's indigo
  seam glow, the selection-scene filament density on phones.

## Tools (local, gitignored .e2e-tmp)
- `frames.mjs <base> <out> 1440x810 scene:local …` (?freeze=1; env TIER, DPR, HUD, WAIT)
- `shoot.sh <name> <cols> <WxH> scene:at …` → `.e2e-tmp/art/<name>/sheet.jpg` (env BASE, TILE)
- `review29.mjs <base> <out>` (29 reference frames) · `sheet.mjs out cols tileW files…` (env RATIO)
- `perf.mjs <base>` → perf-results.json (baseline: perf-before.json, final: perf-after.json)
- `profile.mjs <base> <tier> scene:at …` (per-material frame-time cost)
- `sound-render.mjs <dev-base> <seconds> [lead] [name]` (offline soundtrack: levels, spectrogram, WAV)
- `walkthrough.mjs <base>` · `mux-walkthrough.mjs` (adds the synced soundtrack)
- `stills.mjs <base>` (fallback WebPs → public/cinematic) · `serve-prod.mjs [port]`
- Stop `vite dev` before E2E / perf (it pegs the CPU on this OneDrive path).
