# Part 2 — cinematic intro: diagnosis and fix plan

## A. How it is built
- **Scroll:** native scrolling. One passive `scroll` listener (`scroll/useScrollController.ts`)
  writes the raw target into a mutable store; no smooth-scroll library, no GSAP, no Framer
  `useScroll`, no CSS scroll timelines.
- **Drawing:** a WebGL world (three.js through React Three Fiber, `scene/CinematicCanvas.tsx`,
  `world/*`) on a fixed stage, plus a DOM overlay (identity, captions, counter, product panel)
  moved with `transform`/`opacity` by `overlay/overlay-sync.ts`. No video, no image sequence.
- **Loops (three):** the story driver's `requestAnimationFrame` (`timeline/useStoryDriver.ts`:
  smooths scroll into progress, moves the overlay), R3F's own render loop (`frameloop` switched to
  `"always"` by `RenderGate`), and the sound controller's loop while sound plays.
- React is out of the frame loop: the store notifies only on scene changes.

## B. Why it switches to the static site mid-scroll
Every path that replaces the film with `StaticFallback` after load:
1. `CinematicHome.tsx:104-108` — **start timeout**: if the WebGL world is not `ready` within
   15 s, `setFailure("WebGL start timed out")` → static. On a laptop GPU, compiling every shader
   (ReadySignal) can take longer than 15 s; by then the visitor is already scrolling the film,
   which runs on the DOM overlay from the first gesture. This matches the report.
2. `CinematicHome.tsx:179` + `212-228` — **error boundary** around the canvas: any shader, driver
   or chunk error → static, at any time.
3. `CinematicHome.tsx:187` + `CinematicCanvas.tsx:65-72` — **WebGL context loss** (driver reset,
   GPU memory pressure, another tab) → static; the context is never allowed to recover.
4. `CinematicHome.tsx:70-76` — the device decision runs in an effect keyed on
   `useReducedMotion()`, which is `null` on the first render and then a boolean, so the decision
   can run twice (and again if the OS setting changes).
Not found: no FPS watchdog that swaps modes (the `PerformanceGovernor` only lowers pixel ratio),
no resize/`matchMedia` listener that re-decides, no remount from a dynamic import.

## C. Why it hangs
- **Shader compile and first frames on integrated GPUs**: the world is heavy; the governor lowers
  pixel ratio, but the high tier starts at up to 2× device pixel ratio.
- **Sound on by default**: on the first click or key press during the intro, the controller opens
  an `AudioContext` and synthesises its room on the main thread (a few hundred ms on a modest
  machine) while the visitor is scrolling.
- **Two render loops** (story driver + R3F) each scheduling `requestAnimationFrame`.
- Checked and not the cause: per-frame React state (none), layout-property animation (overlay
  uses transform/opacity), smooth-scroll fights (none), video/image decoding (none), non-passive
  listeners (none), blur/backdrop-filter in the film (none; only the dev HUD).

## Fix — mode (B)
- Decide once per visit, in a module variable, at hydration (`useLayoutEffect`), from
  `matchMedia("(prefers-reduced-motion: reduce)")`, WebGL2, software GPU, and the brief's
  thresholds: viewport < 768px, `hardwareConcurrency < 4`, `deviceMemory < 4` → static.
- No path swaps to static after that. Start timeout, canvas error and context loss now only hide
  the 3D world; the film keeps running on the overlay. Context loss recovers in place
  (`webglcontextrestored`). Errors are logged with a clear `[cinematic]` message.
- The 4-second rule: if the 3D bundle has not loaded within 4 s **and the visitor is still at the
  top**, the visit is served the static version (decided once, before they enter the film). If
  they are already scrolling, the film continues without the world and the world joins if it
  arrives — the layout never changes under them.
- Resize recalculates sizes only (unchanged).

## Fix — performance (C)
- One `requestAnimationFrame` loop: R3F stays on `frameloop="never"`; the story driver calls R3F's
  `advance(now)` in the same tick when the world is on screen and compiled.
- Pixel ratio capped at 1.5 on every tier.
- Sound: off by default; the `AudioContext` is created only after the visitor turns sound on.
- Offscreen/hidden: rendering already stops when the stage leaves the screen (RenderGate) and
  rAF does not run in hidden tabs; kept.
