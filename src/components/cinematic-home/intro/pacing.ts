import { useEffect, useRef, useState } from "react";

import { PEARL_WORLD } from "../world/tone";

const PEARL_SKY = PEARL_WORLD.sky;

/**
 * The opening's ground over the film: the world's sky at 99.6 % — the same colour to the eye
 * (under 1/255 per channel), but not opaque, so the browser keeps drawing the 3D canvas beneath
 * it. Fully covered, the canvas was first drawn at the moment the reveal uncovered it, and that
 * first draw froze the screen for 0.65–0.93 s right as the exit began (measured 2026-11-16).
 */
export const OPENING_GROUND = "rgba(247, 247, 244, 0.996)";

/** The text holds at least this long, to be read (owner, 2026-11-16)… */
export const HOLD_MS = 1_500;
/** …and never longer than this after it first appears (owner, 2026-11-16: 4.0 s). If the world
 * is not ready and calm by then, the reveal runs without it (the "flat" path, below). */
export const HOLD_CAP_MS = 4_000;
/** The cap is aimed this much before HOLD_CAP_MS: the exit's first frame lands after its start
 * (style and paint of that frame: up to ~0.3 s at 4× CPU, measured 2026-11-16), and the text
 * must never hold longer than the cap. */
const CAP_LEAD_MS = 300;
/** The text's own fade-in (520 ms) is over by then: the lockup may be pre-painted beneath. */
const TEXT_IN_MS = 560;
/** The GPU is calm once frames have come smoothly (each < 50 ms) for this long. */
const CALM_MS = 300;

/**
 * When the opening's text first appeared, on the performance clock. The returning openings are
 * server-rendered and shown by the head gate's CSS from the first paint, so their text appeared
 * at the first contentful paint — usually well before React hydrates and can count anything.
 */
export function firstPaintAt(): number {
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  return fcp ? fcp.startTime : performance.now();
}

/** True once frames have come smoothly for CALM_MS while `enabled`; any stall restarts the count. */
export function useCalm(enabled: boolean): boolean {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    if (!enabled || calm) return;
    let raf = 0;
    let last = performance.now();
    let smooth = 0;
    const tick = (now: number) => {
      const d = now - last;
      last = now;
      smooth = d < 50 ? smooth + d : 0;
      if (smooth >= CALM_MS) setCalm(true);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, calm]);
  return calm;
}

/**
 * When the opening's text may start its exit. The exit and the reveal are motion; while the
 * world compiles its shaders and then draws its first frames, the GPU stops the page from
 * painting for up to a second (measured 2026-11-16 at 1920 on a Vega-class GPU: 933 ms and
 * 467 ms with no frame, right after "ready" — no main-thread long task involved), and the motion
 * jumps ahead. So the text — still, and readable — holds until the world is ready (or the still
 * version is chosen) AND frames have been flowing smoothly for CALM_MS: the reveal then runs over
 * the world ("world" path). It holds at least HOLD_MS after `minFrom` (when its last line
 * appears) and at most HOLD_CAP_MS after `shownAt` (when it first appeared); at the cap, with
 * the world still settling, the exit starts anyway on the "flat" path: the caller holds the
 * world's drawing until the reveal has finished. `armed` is when the final text is on screen.
 * `onExit` should start the exit's visuals directly (startExit), not only through React state.
 */
export function useExitTiming(
  armed: boolean,
  settled: boolean,
  onExit: (path: "world" | "flat") => void,
  times?: { shownAt: number; minFrom: number },
  /** Once the last text has faded in: the reveal's lockup is pre-painted under the ground then,
   * on either path — its first raster otherwise stalls the screen as the reveal starts. */
  onTextIn?: () => void,
) {
  const [held, setHeld] = useState(false);
  const calm = useCalm(armed && settled);
  const fired = useRef(false);
  const cb = useRef(onExit);
  cb.current = onExit;
  const at = useRef(times);
  at.current = times;
  const textIn = useRef(onTextIn);
  textIn.current = onTextIn;
  const fire = useRef((path: "world" | "flat") => {
    if (fired.current) return;
    fired.current = true;
    cb.current(path);
  });

  useEffect(() => {
    if (!armed) return;
    const now = performance.now();
    const t = at.current ?? { shownAt: now, minFrom: now };
    const ids = [
      window.setTimeout(() => setHeld(true), Math.max(0, t.minFrom + HOLD_MS - now)),
      // At the cap the exit starts from the timer itself — no render in between (a busy page
      // made that round trip land late).
      window.setTimeout(
        () => fire.current("flat"),
        Math.max(0, t.shownAt + HOLD_CAP_MS - CAP_LEAD_MS - now),
      ),
      window.setTimeout(() => textIn.current?.(), Math.max(0, t.minFrom + TEXT_IN_MS - now)),
    ];
    // …and checked on every frame too: while the world's shaders compile, the browser can hold a
    // due timer back for over a second while frames still run (measured 2026-11-16, 4× CPU: due
    // at 0.9 s, fired at 2.7 s).
    const capAt = t.shownAt + HOLD_CAP_MS - CAP_LEAD_MS;
    let raf = 0;
    const watch = (now: number) => {
      if (now >= capAt) fire.current("flat");
      else raf = requestAnimationFrame(watch);
    };
    raf = requestAnimationFrame(watch);
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      cancelAnimationFrame(raf);
    };
  }, [armed]);

  useEffect(() => {
    if (armed && held && settled && calm) fire.current("world");
  }, [armed, held, settled, calm]);
}

/**
 * Starts an opening's exit on the page at once — the same attributes and ground React then
 * renders — so the exit's first frame does not wait for a React render of the page (113 ms at
 * 1920, ~0.45 s at 4× CPU, measured 2026-11-16). React then commits the same values.
 */
export function startExit(layer: HTMLElement | null, path: "world" | "flat", still: boolean) {
  const main = document.querySelector<HTMLElement>("main[data-intro-state]");
  if (main) {
    main.dataset.introState = "reveal";
    main.dataset.introPath = path;
  }
  if (layer) {
    layer.dataset.phase = "reveal";
    layer.style.backgroundColor = still ? PEARL_SKY : "transparent";
  }
}

/**
 * Runs each step after the exit's own animations reach that point — not on a timer from React's
 * commit: on a busy page the exit's first frame came a few hundred ms later, and the hand-off to
 * the film cut the reveal short while the emblem was still landing (1.2–2.4 px, measured
 * 2026-11-16). A step with `whenDone` waits for every running reveal animation ("rv-…") to
 * finish; `ms` (from the exit's first frame) is its backstop. Returns the cleanup.
 */
export function afterExitFrame(steps: { ms: number; run: () => void; whenDone?: boolean }[]) {
  const ids: number[] = [];
  let live = true;
  const raf = requestAnimationFrame((frame) => {
    const late = performance.now() - frame;
    for (const step of steps) {
      let done = false;
      const once = () => {
        if (done || !live) return;
        done = true;
        step.run();
      };
      ids.push(window.setTimeout(once, Math.max(0, step.ms + (step.whenDone ? 600 : 0) - late)));
      if (step.whenDone) {
        const running = document
          .getAnimations()
          .filter((x) => (x as CSSAnimation).animationName?.startsWith("rv-"));
        if (running.length) void Promise.all(running.map((x) => x.finished)).then(once, () => {});
        else ids.push(window.setTimeout(once, Math.max(0, step.ms - late)));
      }
    }
  });
  return () => {
    live = false;
    cancelAnimationFrame(raf);
    ids.forEach((id) => window.clearTimeout(id));
  };
}
