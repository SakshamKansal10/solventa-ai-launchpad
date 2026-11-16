# Task: make the cinematic scroll intro on the landing page smooth and stable

You are working in the Solventia codebase (solventia.in). This task is only about the landing page at `/`. Do not touch the dashboard.

**Branch rule:** work only on the git branch `redesign-v2`. If you are on any other branch, stop and tell me. Commit after each step below with a clear message. Never commit to `main`, never force-push, never rewrite history.

Note: the landing page now has a light background and the full logo with the tagline "VALIDATE · BUILD · ELEVATE". Keep both exactly as they are.

## What is wrong

The landing page opens with a scroll-driven cinematic story: a "Loading the interactive experience" placeholder, then pinned full-screen scenes ("Every founder begins with uncertainty.", the six profile panels "01 / 06 · Capital" to "06 / 06 · Customer access", the counter that narrows 360 → 120 → 36 → 9 → 3 → 1, and so on), with a sound toggle in the header.

Two bugs, both reported by the owner on a Windows laptop in Chrome and Edge:

1. **It hangs.** Scrolling stutters and freezes for long stretches.
2. **It switches mode mid-scroll.** Partway through, the page sometimes drops out of the cinematic version and shows the normal static website instead.

## Step 1: investigate before changing anything

Read the landing page code and reply with a short written diagnosis. Do not edit files yet. The diagnosis must answer:

**A. How is it built?**
- Which library drives the scroll (GSAP ScrollTrigger, Lenis, Framer Motion `useScroll`, a hand-written scroll listener, CSS scroll timelines)?
- What is being drawn (DOM and CSS, SVG, canvas, WebGL/three.js, video scrubbing, an image sequence)?
- Is there more than one scroll or animation system running at the same time?

**B. Why does it switch to the normal site?** Find every code path that can replace the cinematic version with the static one after the page has loaded. List each with file and line. Likely candidates:
- an FPS or performance watchdog that falls back when frames drop
- a React error boundary or `Suspense` fallback around the cinematic component
- a `resize`, `matchMedia` or breakpoint listener that re-decides the mode (scrollbar appearing, zoom, DevTools, mobile address bar)
- a `prefers-reduced-motion` or device check that is evaluated more than once
- WebGL context loss
- a dynamic import or hydration re-render that remounts the component and resets its state

**C. Why does it hang?** Check for each of these and say which you found:
- React state updated on every scroll event or every frame (re-rendering the tree while scrolling)
- animating layout properties (`top`, `left`, `width`, `height`, `margin`) instead of `transform` and `opacity`
- large `filter: blur()`, `backdrop-filter`, big `box-shadow` or `mix-blend-mode` layers that repaint during scroll
- a canvas or WebGL scene rendering at full device pixel ratio, or still rendering when it is off screen or the tab is hidden
- more than one `requestAnimationFrame` loop, or scroll listeners that are not passive
- a smooth-scroll library fighting native scrolling or `scroll-behavior: smooth`
- video or image-sequence frames decoded on the main thread while scrolling, or oversized media
- too many DOM nodes animated at once (per-letter or per-particle elements)
- audio loading or decoding on the main thread during the intro
- everything below the intro mounted and animating while the intro plays

End the diagnosis with the fix you propose for B and for C, then make the changes.

## Step 2: fix the mode switch

- Decide cinematic or static **once**, before first paint of the intro, and keep that decision for the whole visit. Store it in a ref or module variable, not in state that can be recomputed.
- Serve the static version from the start when any of these is true: `prefers-reduced-motion: reduce`, `navigator.hardwareConcurrency < 4`, `navigator.deviceMemory < 4` (where available), or viewport width under 768px. Adjust these thresholds if the code already has sensible ones, and tell me what you chose.
- Remove any watchdog that swaps modes mid-scroll. If frames drop, reduce quality inside the cinematic version (lower pixel ratio, fewer particles, skip secondary effects). Never swap the layout under the visitor.
- A resize must only recalculate sizes and scroll positions. It must not change mode.
- If WebGL is used, handle `webglcontextlost` and `webglcontextrestored` so the scene recovers in place.
- If an error boundary wraps the intro, log the error to the console with a clear message so it is visible if it ever fires again.

## Step 3: fix the performance

Apply what the diagnosis calls for. The rules the result must follow:

- One scroll source and one `requestAnimationFrame` loop. Scroll progress lives in a ref or a motion value. No `setState` per frame.
- Animate only `transform` and `opacity`. Remove animated blur and backdrop filters, or replace them with pre-blurred images or static gradients.
- Canvas and WebGL: cap `devicePixelRatio` at 1.5, stop rendering when the scene is off screen (IntersectionObserver) or the tab is hidden (`visibilitychange`), dispose of resources on unmount.
- If two smooth-scroll systems are present, keep one. Native scrolling with a scrubbed timeline is acceptable and usually the smoothest.
- Media: serve correctly sized, compressed assets (WebP or AVIF images, short muted video with a poster), preload only what the first scene needs, and decode before the scene starts.
- Lazy-mount everything below the intro so it does not run during the intro.
- Use `will-change: transform` only on the few layers that move, and remove it when the scene ends.
- The "Loading the interactive experience" placeholder must not block scrolling. If the cinematic bundle has not loaded within 4 seconds, show the static version for that visit.
- Sound: create the audio context only after the visitor clicks the sound toggle.

## Step 4: prove it

Run the production build locally (`build` then `start`, not the dev server) and check in Chrome:

- Performance panel with 4× CPU throttling, record a full scroll through the intro. No long task over 50 ms while scrolling, and frame rate stays near 60 without throttling.
- Scroll through the whole intro five times, including fast scrolls, scrolling back up, resizing the window mid-scroll and opening DevTools mid-scroll. The mode never changes.
- With `prefers-reduced-motion` emulated, the static version shows from the start.
- At 390px width, the static version shows from the start and nothing overflows.
- No console errors.

## Report back

Finish with a short summary: the root cause of the mode switch, the root cause of the hang, what you changed (files), and before and after numbers from the Performance panel. If something could not be fixed without a design change (for example a scene that is too heavy to ever run smoothly on a mid-range laptop), say which scene and what the simpler alternative would be. Do not silently remove a scene.
