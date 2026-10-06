# Cinematic test report

All runs were local, on the final code of the art-direction pass (2026-10-07). Environment:
Windows 11, Node 25, Chrome (Playwright), AMD Vega 3. E2E runs use the repo's harness: a
production build (`E2E_BUILD`) with a fake Supabase (PGlite) and a fake Gemini; never real
backends.

## Static checks

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p .` | exit 0 |
| Lint (ESLint + Prettier) | `npm run lint` | 0 errors, 21 warnings (pre-existing, none in cinematic code) |
| Production build | `npm run build` | exit 0 |
| Eager-bundle guard | manual check of the built route chunk | none of the 15 eager dependencies contain three.js |

## Unit tests (Vitest)

**Full suite:** `npx vitest run` → **41 files, 360 tests, all passing.**

The cinematic share is **62 tests in 8 files**:

| File | Tests | Covers |
|---|---|---|
| `timeline` | 8 | order, coverage, proportional lengths, local/progress inverse, keys |
| `camera-path` | 11 | continuity, keys hit exactly, lens compression/reveal, near plane, portrait framing |
| `capabilities` | 8 | tier selection; fallback for reduced motion, no WebGL2 or a software GPU |
| `quality` | 5 | tier budgets, governor drop/recover |
| `progress-math` | 8 | section progress, damping, smoothstep, deterministic random |
| `story` | 9 | 9 → 3 → 1, reversibility, gates telescoping from the winner, Validate/Build state, crisis + adaptation, homography, DOM handoff, captions, finale |
| `universe-model` | 7 | scoring conflicts, neutral unknown signals, 360 → 1, family retraction, budgets, sparse deterministic graph |
| `sound/score` | 6 | **new:** silent start; restricted passage then open universe; a held breath before the one; safe levels everywhere; ordered cues; cues only while travelling forward, never on jumps |

## Browser tests (Playwright)

### Complete existing suite
`npx playwright test` → **170 tests: 168 passed, 1 skipped, 1 failed**, in 32 minutes.
- **Skipped:** the opt-in visual spec, which needs `CINEMATIC_VISUAL=1`.
- **Failed:** the new test "world labels never linger after a jump". It was a test-authoring
  error: it checked a moment (three 0.9) where that label is legitimately off-screen. The test
  now uses the overview moment (three 0.97). The whole cinematic spec was then rerun:
  **16/16 passed**.

The suite covers the whole application:
- public pages and their accessibility (axe, WCAG 2.1 A/AA, serious and critical)
- auth and sign-in
- the consultation (onboarding)
- the dashboard and its controls
- Hindi
- visual sizes
- buttons
- **`/` is unchanged:** "is hidden from search engines and leaves the homepage untouched" passes.

Earlier, before this pass, three timeouts appeared in the full suite. They were caused by a
runaway `vite dev` pegging the CPU and passed on rerun with it stopped.

### Cinematic spec (`e2e/cinematic.spec.ts`): 16 tests

| # | Test | Status |
|---|---|---|
| 1 | The whole story plays on one WebGL stage, scene by scene | ✓ |
| 2 | Reversible: back, forward and jumps land on the same frame | ✓ |
| 3 | A refresh mid-story resumes where the visitor was | ✓ |
| 4 | The 3D surface becomes the real, keyboard-operable interface (tabs by arrow keys, selectable text, inert outside its scene) | ✓ |
| 5 | The finale CTA opens `/consultation` | ✓ |
| 6 | Cinematic nav keeps sign-in (dialog) and the real routes; back restores the canvas | ✓ |
| 7 | The canvas follows resizes (390, 820, 1180, 1440), no horizontal overflow | ✓ |
| 8 | Reduced motion gets the still narrative (no WebGL, h1, 9 stills, product preview, CTA) | ✓ |
| 9 | noindex; `/` untouched | ✓ |
| 10 | No serious/critical a11y violations: start, **immersed (nav receded)**, product, finale, still version | ✓ |
| 11 | **new:** back and forward return to the same moment of the story | ✓ |
| 12 | **new:** sound off by default; plays on request; remembered for the visit; waits for a gesture after reload; mute | ✓ |
| 13 | **new:** the still version offers no sound | ✓ |
| 14 | **new:** the ending is protected (the footer arrives below the CTA, never over it) | ✓ |
| 15 | **new:** the nav recedes (≥ 0.54 opacity) in the depths, restores on hover, returns for the product | ✓ |
| 16 | **new:** world labels never linger after a jump | ✓ |

### Visual regression (opt-in, GPU-specific)
`CINEMATIC_VISUAL=1 npx playwright test e2e/cinematic-visual.spec.ts`
- **Baselines:** 9 keyframes (04, 06, 08, 11, 13, 17, 21, 26, 28) were generated with
  `--update-snapshots`. A second run passed (max diff ratio 0.03).
- **Not committed:** the baselines are machine-specific and kept local
  (`.git/info/exclude`; 8.8 MB).

### Scroll restoration (Section 55)
- **Automated:** reload mid-story (test 3), away and back (test 6), back and forward (test 11).
- **Probe:** reload at the top was also checked with `.e2e-tmp/restore-probe.mjs`.

## Sound verification (offline render)
`.e2e-tmp/sound-render.mjs` plays the real engine and score through a steady 150 s scroll in an
OfflineAudioContext.
- **Levels:** overall peak −5.0 dBFS (no clipping). Per-scene RMS ranges from −16 dBFS (the
  passage build-up) to −29 dBFS (product).
- **Cues:** 68 played.
- **Outputs:** a spectrogram (`soundtrack-spectrogram.png`) and WAV previews.
- **Not testable by me:** listening. No human has listened to it yet.

## Not executed
- physical phones and tablets, Safari, Firefox, Edge (emulated viewports only)
- screen readers (semantics are tested by axe and the structure)
- a manual keyboard-only pass through the entire page, beyond the automated tab and CTA checks
- listening tests for the sound
