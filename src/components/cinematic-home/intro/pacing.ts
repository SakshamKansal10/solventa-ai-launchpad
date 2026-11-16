import { useEffect, useRef, useState } from "react";

/**
 * The opening's ground over the film: the world's sky at 99.6 % — the same colour to the eye
 * (under 1/255 per channel), but not opaque, so the browser keeps drawing the 3D canvas beneath
 * it. Fully covered, the canvas was first drawn at the moment the reveal uncovered it, and that
 * first draw froze the screen for 0.65–0.93 s right as the exit began (measured 2026-11-16).
 */
export const OPENING_GROUND = "rgba(247, 247, 244, 0.996)";

/** The text holds at least this long, to be read (owner, 2026-11-16). */
export const HOLD_MS = 1_500;
/** …and at most this long while the world is still settling: the opening always moves on. */
export const HOLD_CAP_MS = 6_000;
/** The GPU is calm once frames have come smoothly (each < 50 ms) for this long. */
const CALM_MS = 300;

/**
 * When the opening's text may start its exit. The exit and the reveal are motion; while the
 * world compiles its shaders and then draws its first frames, the GPU stops the page from
 * painting for up to a second (measured 2026-11-16 at 1920 on a Vega-class GPU: 933 ms and
 * 467 ms with no frame, right after "ready" — no main-thread long task involved), and the motion
 * jumps ahead: the sweep never seen, the logo popping in. So the text — still, and readable —
 * holds until the world is ready (or the still version is chosen) AND frames have been flowing
 * smoothly for CALM_MS; never less than HOLD_MS, never more than HOLD_CAP_MS. `armed` is when
 * the final text is on screen.
 */
export function useExitTiming(armed: boolean, settled: boolean, onExit: () => void) {
  const [held, setHeld] = useState(false);
  const [capped, setCapped] = useState(false);
  const [calm, setCalm] = useState(false);
  const fired = useRef(false);
  const cb = useRef(onExit);
  cb.current = onExit;

  useEffect(() => {
    if (!armed) return;
    const a = window.setTimeout(() => setHeld(true), HOLD_MS);
    const b = window.setTimeout(() => setCapped(true), HOLD_CAP_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [armed]);

  // Frames flowing smoothly after the world settled: any stall restarts the count.
  useEffect(() => {
    if (!armed || !settled || calm) return;
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
  }, [armed, settled, calm]);

  useEffect(() => {
    if (!armed || fired.current || !held || !((settled && calm) || capped)) return;
    fired.current = true;
    cb.current();
  }, [armed, held, settled, calm, capped]);
}
