# Part 2 — performance and mode proof

Local production build (fake AI stack), headed Chrome 1440×900, `--ignore-gpu-blocklist`,
`.e2e-tmp/tools/film-perf.mjs` (5 scroll passes with a mid-scroll resize unthrottled; 2 passes at
4× CPU throttling) and `.e2e-tmp/tools/film-modes.mjs`.

| Run | Modes seen | Long tasks > 50 ms | Worst long task | Approx. fps |
|---|---|---|---|---|
| Before, unthrottled | pending → webgl | 0 | — | 46 |
| After, unthrottled (with resize) | pending → webgl | 1 | 65 ms | 48 |
| Before, 4× CPU | pending → webgl | 110 | 195 ms | 25 |
| After, 4× CPU | pending → webgl | 87 | 120 ms | 27 |

"pending" is the server-rendered first frame before hydration decides.

Mode decision (`film-modes.mjs`), scrolling six screens after load:
| Case | Modes seen |
|---|---|
| Reduced motion, 1440px | fallback (from the start, never changes) |
| Phone 390px | fallback (from the start, never changes) |
| Desktop resized to 390px mid-visit | webgl (no swap under the visitor) |

E2E: `e2e/cinematic.spec.ts` + `e2e/public.spec.ts` — 27 passed (sound tests updated to the
off-by-default toggle).

Not measurable here: a real integrated-GPU laptop. The fixes that target it (pixel ratio cap 1.5,
one render loop, no audio context until asked, no start timeout) are in place; the owner's
check on that machine is in REPORT.md's manual steps.

---

# Part 2b — the owner's follow-up: tiers, adaptive quality, main-thread cost (2026-11-15)

Machine: AMD Radeon(TM) Vega 3 (integrated, ANGLE/D3D11), 1440×900, DPR 1, headed Chrome; the
same class as the owner's laptop. Tool: `node scripts/film-perf.mjs <url> <label> [--tier=]
[--notch=]` — one full scroll pass down and up (frame times = rAF deltas), long tasks, trace split,
Chrome's own counters, CPU profile; then one pass down at 4× CPU throttle. Raw JSON per commit in
`docs/redesign/perf/`.

## Acceptance (final build, lite tier — what this machine now gets)
| | Target | Result |
|---|---|---|
| Frame time unthrottled | p95 < 20 ms | p50 16.7 · **p95 16.8** · worst 100 ms (best of 3 runs; one run 33.3, one with a 1 s window hitch) |
| Long tasks unthrottled | none over 50 ms | **0** in every run |
| Long tasks at 4× CPU, one full pass | < 10 | **2 / 3 / 4** (worst 55 / 53 / 90 ms) |
| React commits while scrolling | none | **0** across all 21 scenes (13 during load) |
| Main thread per pass (Chrome counters) | — | script 3.4 s · style 2.5 s · layout 0.05 s · paint ~0.66 s · GPU ~25 s |

## What each commit did (same machine, same tool)
| Commit | Change | p95 unthrottled | 4× long tasks > 50 ms | Note |
|---|---|---|---|---|
| 80bcdc6 | baseline ("medium") | 33.5 ms | 74 (worst 160) | GPU 33.8 s |
| bda4461 | full / lite / fallback tiers | 33.4 | 79 | GPU −15% |
| 4d1cd9e | adaptive notches; R3F delta in seconds | 33.4 | 100 | worst 274 → 117 ms; the opening's median is 16.7 ms so no step |
| afa640f | no layout read in the filament draw | 33.4 | 75 | 4.5 s "self time" hotspot gone |
| 2d085bc | veils written directly; tone in 1% steps | 33.4 | 56 | no measurable change in style time |
| dca0457 | no layout reads in the frame loop | 33.4 | 47 | style 3.6 → 2.7 s, tasks 11.2 → 9.3 s |
| 4a2b569 | faded scroll cue stops animating | 33.3 | 44 | recalcs per half pass 891 → 441 |
| 2623dcd | geometry uploaded before the film; notch DPR applied | **16.8** | 45 | geometries 26 → 98 resident from scene 1 |
| f252612 | instanced meshes get their own materials | 16.8 | 46 | per-draw program re-derivation gone |
| c7913ae | hidden overlay content leaves style; fewer allocations | 16.8* | **2–4** | no recalc over 300 elements; 122 → 99 MB allocated per pass |

\* see Acceptance for the run-to-run spread.

Two bugs found on the way, both from part 2's single loop: R3F's `advance()` was given
milliseconds, so every `useFrame` delta was in ms (the old governor never acted; the camera lean
ran clamped); and R3F re-applies its `dpr` prop on every canvas render, which silently undid every
`setDpr()` (the old governor's resolution steps never stuck). Both fixed.

## Scene audit (lite, at points through the film)
| Scene | Draw calls | Triangles | Visible meshes | Instances |
|---|---|---|---|---|
| 0 opening | 14 | 22k | 14 | 89 |
| 2 passage | 55–57 | 65k | 37 | 89 |
| 3 universe | 76–88 | 106–161k | 71 | 424 |
| 6 convergence | 15–49 | 77–111k | 54 | 235 |
| 7 three / selection | 29–40 | 141–148k | 61 | 409 |
| 11–18 execution path | 21–34 | 234–256k | 26–28 | 759–801 |
| 20 finale | 2–15 | 11–14k | 2 | 0 |

Whole film: 204 scene objects, 170 meshes, **31 shader programs**, **5 textures** (environment
PMREM 256, filament data texture, 3 small), **98 geometries**. Per frame: the camera, ~10–60
instance matrices per visible world, one 420×20 RGBA float data texture (filaments) when they
change, ~10–20 uniforms; on the DOM side ~1 style recalc of 1–20 elements, plus a larger one
(101–300 elements) when the tone steps.

Cost drivers measured:
- **Fill rate** on integrated GPUs: at pixel ratio 0.65 (notch 2) p95 is 16.8 ms even before the
  geometry fix; at 1.0 the heavy scenes miss vsync. No MSAA and standard materials (lite) cut GPU
  time 15%; resolution cuts it a further ~30%.
- **First-appearance uploads** (fixed): geometry buffers were uploaded mid-scroll.
- **Style recalculation** (fixed): inherited tone variables re-styled hidden overlay content.
- `?tier=full` on this machine: same p95 as lite before the fixes, +20% GPU time — full is
  correctly reserved for dedicated graphics.

## Proposals (not done — the owner decides; nothing was cut)
1. **Adaptive rule on integrated GPUs.** As specified (median of the first ~2 s after the scene
   starts) it never steps down here: the opening is light (median 16.7 ms) and the cost arrives
   with the universe and the path. Option A: sample the windows while the story is moving
   (progress changing), not while it rests at the opening. Option B: lite's pixel-ratio ceiling
   0.8 (measured: not enough alone, p95 33) or 0.65 (measured p95 16.8; softer image on 1080p
   panels). Recommendation: A.
2. **Execution path (scenes 11–18): 234–256k triangles** in ~25 draw calls — the gates' corner
   and bar sweeps. Lite could use 16 instead of 32 sweep segments for gate parts (≈ −40% of those
   triangles), invisible at that distance.
3. **Universe (scene 3): 76–88 draw calls** — the five opportunity families are separate instanced
   meshes per state; merging the state variants into one instanced mesh per family with a per-
   instance attribute would roughly halve the calls.
4. Remaining 4× long tasks (2–4 per pass) coincide with the large tone steps (101–300 element
   recalcs). Moving the tone variables from the page root to the nav and the visible overlay
   only would remove them; a larger refactor of the overlay, not attempted.
