# Cinematic performance

## Method
- **Build:** the production build (`npm run build`), served locally as-is by
  `.e2e-tmp/serve-prod.mjs` on port 4320.
- **Run:** `node .e2e-tmp/perf.mjs http://127.0.0.1:4320` launches headless Chrome with the real
  GPU (ANGLE D3D11) and does a steady 50 s in-page scroll through the whole timeline. It records:
  - per-frame times (overall and per scene)
  - renderer calls and triangles
  - live universe nodes and filaments
  - load timing, transferred JS, JS heap, long tasks, and governor DPR changes
- **Hardware:** one machine only. AMD Radeon Vega 3 (integrated), 4 threads, 4 GB, Windows 11.
  It auto-selects the **medium** tier.
- **Not measured:** physical phones, tablets, Safari, Edge. Phone and tablet runs are emulated
  viewports on the same GPU.
- **Clean conditions:** a long-running `vite dev` on this OneDrive path pegs the CPU, so it was
  stopped before every measurement. The earlier numbers in the progress log were taken with it
  running; the "before" column below was re-measured cleanly.

## Quality tiers (`performance/quality.ts`)

| Tier | DPR range | Universe rendered (of 360) | Filaments (capacity / segments) | Core curve segments | Physical materials | Governor min fps |
|---|---|---|---|---|---|---|
| high | 1 – 2 | 360 | 900 / 24 | 72 | yes | 50 |
| medium | 1 – 1.5 | 240 | 700 / 20 | 56 | yes | 45 |
| low | 0.75 – 1.25 | 120 | 460 / 14 | 36 | no | 40 |
| fallback | — | — | — | — | — | static still narrative |

**Auto-selection (`device/capabilities.ts`):**
- **fallback:** reduced motion, no WebGL2, or a software GPU
- **low:** touch with ≤ 3 GB, or data-saver
- **medium:** touch, or a modest desktop
- **high:** desktop with ≥ 8 cores and ≥ 8 GB

The governor drops DPR a 0.25 step after two slow one-second windows and recovers after five
comfortable ones (at most twice).

## Before vs after the art-direction pass

Each cell is "before → after". "Before" is checkpoint `686c42c`; "after" is the final build.

| Run | Ready (ms) | FPS | p95 (ms) | p99 (ms) | Frames > 25 ms | Heap (MB) | Longest task (ms) |
|---|---|---|---|---|---|---|---|
| high, 1440, DPR 1 | 7704 → 7038 | 56.6 → **57.6** | 33.2 → **16.9** | 33.4 → 33.5 | 165 → **117** | 33.3 → 34.6 | 2250 → 2234 |
| high, 1440, DPR 2 | 2191 → 2458 | 52.2 → 52.5 | 33.4 → 33.4 | 50.1 → 50.0 | 328 → 310 | 30.4 → 36.0 | 422 → 464 |
| medium, 1440 (auto tier) | 2167 → 2411 | 58.3 → **58.7** | 16.9 → 16.8 | 33.4 → 33.4 | 84 → **64** | 28.4 → 30.6 | 338 → 397 |
| low, 1440 | 2172 → 2292 | 59.4 → 59.3 | 16.8 → 16.8 | 16.9 → 16.9 | 4 → 4 | 20.1 → 23.1 | 306 → 380 |
| phone 390 × 844, DPR 3 (medium) | 2045 → 2324 | 60 → 60 | 16.8 → 16.8 | 16.8 → 16.9 | 0 → 0 | 28.6 → 33.4 | 358 → 411 |

Notes on the table:
- **High at DPR 1, "Ready" 7 s:** this includes the one-time parallel shader warm-up compile
  (about 2.2 s long task) on a cold cache. The other runs reuse the browser's compiled programs.
- **High at DPR 2:** the governor settles at DPR 1.25–1.5 (6 changes).
- **Phone:** DPR is capped at 1.5.

### Why the first redesign build was slower, and the fix
The first build of the redesign dropped the path scenes from 60 to 40 fps on medium. A per-material
probe (`.e2e-tmp/profile.mjs`, which hides each material batch and measures frame time) showed:

| Cost | Found | Fix | Result |
|---|---|---|---|
| Provisional glass | Physical, transparent, double-sided: two passes with heavy overdraw, **9.4 ms per frame** in Validate | Single-pass, front-sided standard material | Validate 26.4 → 16.5 ms per frame |
| Dissolving titanium | Physical and alpha-hashed: **3.6 ms** in Build | Standard material (still alpha-hashed) | — |
| Deck plates | 1,004 triangles each for a flat plate: **3.5 ms** in Build | No bevel, 3 curve segments | Build 20.2 → 16.5 ms per frame |
| Universe node frames | Bevels invisible at node size | Bevel removed, curve segments 3 | Fewer universe triangles |

Unused materials (`pearlDissolve`, `glassDissolve`) were removed, which also means fewer warm-up compiles.

### Per-scene, after (fps / triangles)
| Scene | medium | high (DPR 1) |
|---|---|---|
| void | 60 / 29k | 60 / 44k |
| awakening | 60 / 49k | 60 / 68k |
| context | 59.3 / 53k | 59.7 / 72k |
| passage | 57.5 / 200k | 56.8 / 290k |
| universe | 60 / 224k | 58.1 / 326k |
| computation | 60 / 224k | 53 / 326k |
| convergence | 60 / 224k | 59.3 / 326k |
| three | 56.3 / 192k | 55.9 / 229k |
| selection | 58.6 / 211k | 58.6 / 248k |
| unfold | 58.3 / 191k | 57.1 / 231k |
| validate | 60 / 191k | 60 / 231k |
| build | 58.1 / 306k | 57.2 / 366k |
| elevate | 53.9 / 236k | 52.4 / 288k |
| evidence | 56.7 / 236k | 54.1 / 289k |
| crisis | 55.1 / 261k | 54.6 / 318k |
| adaptation | 56.7 / 261k | 54.1 / 318k |
| handoff | 60 / 239k | 58.5 / 292k |
| product | 60 / 239k | 59.6 / 291k |
| connected | 60 / 244k | 60 / 297k |
| return | 60 / 41k | 60 / 57k |
| finale | 60 / 53k | 59.7 / 72k |

## Load and bundle (production build)

| Asset | Before (raw / gzip) | After (raw / gzip) | Loaded |
|---|---|---|---|
| Main entry `index` (all pages) | 317.45 / 99.65 kB | 317.60 / 99.70 kB | always |
| Route chunk `cinematic` (DOM, overlay, Founder OS, sound engine + score) | 24.10 / 8.10 kB | 47.97 / 15.38 kB | on `/cinematic` |
| `CinematicCanvas` (three.js + R3F + the world) | 993.26 / 271.03 kB | 1,002.49 / 274.30 kB | lazily, WebGL mode only |

- **three.js stays lazy.** A regression in the first build pulled three.js into the eagerly loaded
  route graph (the sound score imported a three-dependent module). It was fixed, and the build is
  now checked: none of the route chunk's 15 eager dependencies contain three.js.
- **Fallback stills:** 22 WebP files (11 × 1600 + 960 px), **612 KB** in total (before: 688 KB).
  They are loaded only by the still version.
- **Sound:** no audio files. It is synthesised in about 10 kB of code; the 4 s noise buffer and the
  3.4 s reverb impulse are generated in memory only after the visitor turns sound on.
- **Fonts:** Geist and Geist Mono from Google Fonts, loaded on `/cinematic` only.

## Runtime techniques
- **One persistent canvas.**
- **State outside React:** a mutable store; React renders the overlay once.
- **Instancing:** InstancedMesh everywhere, with compaction (`mesh.count`) so hidden instances cost nothing.
- **Filaments:** one draw call for every filament (GPU Bézier ribbons from a data texture).
- **Warm-up:** shaders are compiled in parallel (`compileAsync`) with every hidden object made visible.
- **Constant light count:** the point light changes intensity only, so lit shaders never recompile.
- **Render gate:** rendering stops when the stage is off-screen.
- **Adaptive DPR:** the governor described above.
- **No shadows, no post-processing.**

## Below target / not measured
- **High tier:** on this integrated GPU the lowest scenes are Elevate (52.4 fps) and Computation
  (53) at DPR 1. The auto-selected medium tier stays between 53.9 and 60 fps in every scene.
- **Cold load:** a cold first load spends about 2.2 s in the one-time shader warm-up (already in
  the loader, not mid-scroll).
- **Not measured:** physical devices, Safari, Firefox, Edge.
