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

---

# Part 2c — bounded pass (owner decisions, 2026-11-15)

**Adaptive quality (proposal A, c358578)** samples while the story moves, steps down to notch 2,
never up; the step is applied through R3F's setDpr at a calm moment. **Lite gate parts
(proposal 2, cb04ee3)**: one bevel subdivision (108 instead of 300 triangles per bar, lock,
module and node).

## Re-measure (Vega 3, lite, notch not pinned, 2 runs — perf/2c-run*.json)
| | Run 1 | Run 2 |
|---|---|---|
| Unthrottled p50 / p95 / worst | 16.7 / 17.0 / 266.8 ms | 16.7 / 16.9 / 266.7 ms |
| Unthrottled long tasks > 50 ms | 0 | 0 |
| Window medians while moving | all 16.7 → stays at notch 0 | all 16.7 → notch 0 |
| 4× CPU p95 / long tasks > 50 ms | 33.4 ms / **0** | 33.4 ms / **0** |
| 4× notch at the end | 0 | **1** (one window at 25 ms; no long task at the step) |

One 267 ms frame appears in each run, including run 1 where no notch changed (so it is not the
step); see blocked.md.

## Live vs HEAD, scene by scene (missing graphics)
Live = https://solventia.in (49d3ead) with `?tier=medium&freeze=1` (what this machine got there);
HEAD = local build with `?tier=lite&freeze=1`; 1440×900, middle of each of the 21 scenes
(`scripts/film-scenes.mjs`), pixel diff in a canvas (`scripts/film-scenes-diff.mjs`, a pixel
counts when R+G+B differ by more than 90). Images: `perf/scenes/NN-scene-{live,head,diff}.jpg`.

| Scene | Pixels that differ | Where most |
|---|---|---|
| 00-void | 0.0% | row 1 col 3 |
| 01-awakening | 0.4% | row 4 col 2 |
| 02-context | 0.3% | row 2 col 2 |
| 03-passage | 0.1% | row 3 col 2 |
| 04-universe | 1.7% | row 2 col 4 |
| 05-computation | 2.0% | row 2 col 4 |
| 06-convergence | 1.4% | row 3 col 1 |
| 07-three | 0.4% | row 2 col 2 |
| 08-selection | 1.3% | row 2 col 3 |
| 09-unfold | 1.2% | row 3 col 3 |
| 10-validate | 0.5% | row 1 col 1 |
| 11-build | 0.7% | row 2 col 2 |
| 12-elevate | 1.5% | row 2 col 2 |
| 13-evidence | 0.7% | row 3 col 3 |
| 14-crisis | 0.2% | row 2 col 1 |
| 15-adaptation | 0.7% | row 2 col 2 |
| 16-handoff | 0.1% | row 3 col 2 |
| 17-product | 0.5% | row 2 col 1 |
| 18-connected | 0.0% | row 1 col 1 |
| 19-return | 0.1% | row 2 col 3 |
| 20-finale | 0.0% | row 1 col 1 |

Looked at every scene over 1%: **no element present live is missing or broken at HEAD.** What
differs, all from lite on purpose:
1. **Fewer universe nodes and filaments, in other seeded places** (universe, computation,
   convergence, selection, unfold): 84 instead of 124 nodes, 420 instead of 700 filaments. The
   scenes read the same (the arc, the frames, the shelves of candidates, the narrowing).
2. **No MSAA:** every silhouette aliases — the red outlines in `08-selection-diff`. Thin gold
   filaments look slightly stepped.
3. **Standard instead of clear-coat materials:** a little less sheen on the gates (`12-elevate`).

Not reproduced on this machine: the owner's report of missing graphics on his laptop. Likely
candidates, in order: (a) his screen narrower than 768px or fewer than 4 cores / 4 GB → the still
version by design (part 2); (b) MSAA off on lite makes 1px filaments shimmer and partly vanish,
more so if the governor stepped to pixel ratio 0.65; (c) an older preview. Recorded in
blocked.md with what the owner can send to settle it.
