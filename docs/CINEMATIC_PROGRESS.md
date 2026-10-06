# Cinematic homepage — progress log (resume from here)

Local-only work on branch `cinematic-homepage`. Never push, deploy, merge or mount on `/`.
Route: `/cinematic` (noindex). `/` untouched. Checkpoint commit of Phase 1: `e02195c` (local).

## Resume order
1. This file → 2. `git status` → 3. only the files for the next unfinished item.

## Status at start of master directive (2026-10-06)
- DONE (Phase 1, keep): persistent R3F canvas, native scroll → damped progress, store outside React,
  device tiers + governor + render gate, reduced-motion/no-WebGL fallback, dev HUD, e2e + unit tests.
- PLACEHOLDER (replace): `scene/CorePlaceholder`, `scene/NodeField`, `scene/node-layout`,
  8-scene timeline, Phase 1 camera keys, `StaticFallback` content, overlay labels, shared Header + pearl plate.

## Architecture decisions (durable)
- One canvas, everything a PURE function of scroll progress (reversible); only bounded ambient
  motion uses time. `?freeze=1` zeroes time + damping for deterministic frames.
- World scale: core radius 6 at origin; opening on +z (`world/layout.ts`). Passage scales the core
  shell ×6 about the opening while the camera passes through → universe lives "inside" (centre −5×opening).
- ONE filament system (GPU Bézier ribbons, data texture) used by core, universe, convergence,
  roadmap rails, evidence, adaptation and finale = the gold-filament continuity.
- Universe: logical 360 opportunities (rendered 360/240/120 by tier, top-36 always rendered),
  5 families × instanced parts (seed, frame, pearl shell, glass shell, energy). Deterministic
  illustrative scoring (`universe/scoring.ts`), elimination stages 360→120→36→9→3→1.
- Product reveal = real DOM panel mapped onto a WebGL slab with a CSS homography, then released
  to plain DOM. Illustrative read-only preview built from real presentational components.
- Cinematic-only nav (`nav/CinematicNav.tsx`) reusing `SignInDialog` + `useCurrentUserQuery`;
  shared Header untouched. CTA → `/consultation` (same as live hero).

## Work list (updated)
- [x] infrastructure: materials (+ dithered instance dissolve), studio env, sweep geometry, filament system
      (GPU Bézier ribbons; DOUBLE-SIDED — single-sided culled everything), layout, 21-scene timeline
- [x] void signals + core awakening + redesigned core (S silhouette, slit aperture, inlays, violet strands)
- [x] context signals (6 forms) → core reactions
- [x] passage: SHELL expands about the opening; inner mechanism stays (camera threads past it)
- [x] universe: model+scoring (tested), 5 families × 5 instanced parts, territory-shaped connections,
      context waves, convergence formations, nine ring
- [x] final three (nested-arch winner + vane + helix), selection, unfold (arches telescope into path)
- [x] path: 34 gates, validate/build/elevate, rails, milestones, distant arches, evidence, crisis, adaptation
- [x] product surface (slab) + DOM homography handoff + illustrative ProductPreview (real components)
- [x] connected chain + isolated answer, finale core variant at the slab position
- [x] DOM: captions (copy.ts), anchored labels, count, CTA → /consultation, CinematicNav, SR narrative
- [ ] visual polish pass (gate joints clunky, arch profile chunky, finalist scale, connected tokens)
- [ ] mobile/tablet framing pass
- [ ] reduced-motion / fallback narrative with stills rendered from the scene
- [ ] docs: ART_DIRECTION, STORYBOARD, SURPRISE_MAP, PERFORMANCE, TEST_REPORT
- [ ] tests (unit rewrite for timeline/camera/quality, e2e, a11y, visual regression), perf, walkthrough

## Tools (local, gitignored .e2e-tmp)
- `node .e2e-tmp/frames.mjs <base> <out> 1440x810 scene:local ...` (uses ?freeze=1; env TIER, DPR, HUD)
- `node .e2e-tmp/sheet.mjs out.jpg cols tileW a.jpg ...` contact sheet
