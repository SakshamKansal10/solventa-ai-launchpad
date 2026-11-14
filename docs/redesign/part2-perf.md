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
