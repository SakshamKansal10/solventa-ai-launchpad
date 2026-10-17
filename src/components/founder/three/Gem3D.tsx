import { useReducedMotion } from "motion/react";
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

import { classifyDevice, probeDevice } from "@/components/cinematic-home/device/capabilities";
import { cn } from "@/lib/utils";
import type { GemVariant } from "./GemCanvas";

const GemCanvas = lazy(() => import("./GemCanvas"));

/** At most this many small WebGL canvases at once across the whole app; the
 * rest fall back to the static gem. The Roadmap journey is its own canvas. */
const MAX_ACTIVE = 2;
let active = 0;

class Boundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A small floating 3D object (crystal, island, seal or trail) that lives
 * beside content. Purely decorative: aria-hidden, never captures pointer
 * events, only renders WebGL while on screen, and shows a static gem when
 * WebGL is unavailable, reduced motion is on, or the canvas budget is spent. */
export function Gem3D({
  variant = "crystal",
  className,
  persist = false,
}: {
  variant?: GemVariant;
  className?: string;
  /** Keep the canvas mounted (paused) once it has started, instead of swapping
   * back to the static gem every time it scrolls out of view. */
  persist?: boolean;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [failed, setFailed] = useState(false);
  const [holding, setHolding] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setWebgl(classifyDevice(probeDevice(), { reducedMotion: false }).mode === "webgl");
  }, []);
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "80px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wants = webgl && !failed && (visible || (persist && started));
  useEffect(() => {
    if (!wants) return;
    if (active >= MAX_ACTIVE) return;
    active += 1;
    setHolding(true);
    setStarted(true);
    return () => {
      active -= 1;
      setHolding(false);
    };
  }, [wants]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      data-testid="gem3d"
      data-variant={variant}
      className={cn("pointer-events-none relative select-none", className)}
    >
      <div
        className={cn(
          "absolute inset-0",
          variant === "orb" ? "sol-gem-fallback-orb" : "sol-gem-fallback",
        )}
      />
      {wants && holding && (
        <div className="absolute inset-0">
          <Boundary onError={() => setFailed(true)}>
            <Suspense fallback={null}>
              <GemCanvas
                variant={variant}
                reduceMotion={reduceMotion}
                paused={!visible}
                onContextLost={() => setFailed(true)}
              />
            </Suspense>
          </Boundary>
        </div>
      )}
    </div>
  );
}
