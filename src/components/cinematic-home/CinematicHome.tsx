import { useReducedMotion } from "motion/react";
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

import { usePointerInput } from "./camera/usePointerInput";
import {
  classifyDevice,
  probeDevice,
  type Capability,
  type TierOverride,
} from "./device/capabilities";
import { StaticFallback } from "./fallback/StaticFallback";
import { CinematicOverlay } from "./overlay/CinematicOverlay";
import { Narrative } from "./overlay/Narrative";
import { ProductLayer } from "./overlay/ProductLayer";
import { QUALITY_PRESETS } from "./performance/quality";
import {
  createExperienceStore,
  ExperienceStoreContext,
  useExperienceValue,
} from "./scroll/experience-store";
import { useScrollController } from "./scroll/useScrollController";
import { soundController } from "./sound/controller";
import { SCENE_RANGES, TIMELINE_SCROLL_VH } from "./timeline/timeline";
import { COLORS } from "./world/layout";

// three.js + React Three Fiber load only in the browser, after hydration, and
// only for devices that get the WebGL experience. The HUD is dev tooling.
const CinematicCanvas = lazy(() => import("./scene/CinematicCanvas"));
const DebugHud = lazy(() => import("./debug/DebugHud"));

/** A WebGL start slower than this (huge GPU stall, broken driver) falls back to the static page. */
const START_TIMEOUT_MS = 15_000;

/**
 * EXPERIENCE SHELL of the cinematic homepage.
 *
 *   section (tall, native scroll) ── sets the scroll length of the timeline
 *     └ stage (position: fixed, 100lvh) ── persists through the whole section
 *         ├ WebGL canvas (lazy)         ── world/, camera/, timeline/, performance/
 *         ├ overlay (captions, labels)  ── driven per frame by the canvas (DomSync)
 *         └ product layer (real DOM)    ── mapped onto the 3D surface, then released
 *   server-rendered narrative · static fallback · dev HUD
 *
 * The stage is `fixed`, not `sticky`: the global stylesheet sets overflow-x on
 * both <html> and <body>, which disables sticky positioning site-wide.
 */
export function CinematicHome({
  tierOverride,
  debug,
  freeze = false,
}: {
  tierOverride?: TierOverride;
  debug?: boolean;
  /** Deterministic frames (no ambient motion, no smoothing) for review and tests. */
  freeze?: boolean;
}) {
  const [store] = useState(createExperienceStore);
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() === true;
  const [capability, setCapability] = useState<Capability | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const ready = useExperienceValue(store, (s) => s.ready);

  // Decide the experience on the client (the server render is the void + first line).
  useEffect(() => {
    const device = probeDevice();
    const decided = classifyDevice(device, { reducedMotion, override: tierOverride });
    store.state.device = device;
    store.state.capability = decided;
    setCapability(decided);
  }, [store, reducedMotion, tierOverride]);

  // Review/test hook (only with ?freeze or ?debug): scene ranges + live state for frame capture.
  useEffect(() => {
    if (!freeze && !debug) return;
    const w = window as unknown as Record<string, unknown>;
    w.__cine = { scenes: SCENE_RANGES, state: store.state };
    return () => {
      delete w.__cine;
    };
  }, [store, freeze, debug]);

  const mode = failure ? "fallback" : (capability?.mode ?? "pending");

  useEffect(() => {
    if (!failure || !capability) return;
    store.state.capability = { ...capability, mode: "fallback", reasons: [failure] };
  }, [store, failure, capability]);

  useEffect(() => {
    if (mode !== "webgl" || ready) return;
    const id = window.setTimeout(() => setFailure("WebGL start timed out"), START_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [mode, ready]);

  useScrollController(store, sectionRef, mode !== "fallback");
  usePointerInput(store, mode === "webgl" && !reducedMotion && !freeze);
  // The soundtrack is offered with the WebGL experience only (off until the visitor asks).
  useEffect(() => (mode === "webgl" ? soundController.attach(store) : undefined), [mode, store]);

  const showHud = debug ?? import.meta.env.DEV;
  const status =
    mode === "fallback"
      ? "Showing the still version of the experience."
      : ready
        ? "The interactive experience is ready. Scroll to travel through it."
        : "Loading the interactive experience.";

  return (
    <ExperienceStoreContext.Provider value={store}>
      <main
        data-testid="cinematic-home"
        data-mode={mode}
        data-tier={capability?.tier ?? ""}
        data-ready={String(ready || mode === "fallback")}
        style={{ backgroundColor: COLORS.black }}
      >
        {/* The fallback is itself the semantic story — never read it twice. */}
        {mode !== "fallback" && <Narrative />}
        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        {mode === "fallback" ? (
          <StaticFallback />
        ) : (
          <section
            ref={sectionRef}
            data-testid="cinematic-timeline"
            aria-label="Cinematic story — scroll to travel through it"
            className="[--cine-pace:1] max-sm:[--cine-pace:0.82]"
            // The stage's own 100lvh plus the timeline's scroll length (shorter on phones).
            style={{ height: `calc(${TIMELINE_SCROLL_VH}lvh * var(--cine-pace) + 100lvh)` }}
          >
            <div className="fixed inset-x-0 top-0 h-lvh" data-testid="cinematic-stage">
              {/* The world fades up over the void as soon as it has rendered real frames. */}
              <div
                className={`absolute inset-0 transition-opacity duration-[1400ms] ${ready ? "opacity-100" : "opacity-0"}`}
              >
                {mode === "webgl" && capability && (
                  <CanvasErrorBoundary onError={setFailure}>
                    <Suspense fallback={null}>
                      <CinematicCanvas
                        store={store}
                        preset={QUALITY_PRESETS[capability.tier]}
                        animate={!reducedMotion}
                        parallax={!reducedMotion}
                        freeze={freeze}
                        onContextLost={() => setFailure("WebGL context lost")}
                      />
                    </Suspense>
                  </CanvasErrorBoundary>
                )}
              </div>
              <CinematicOverlay />
              <ProductLayer />
            </div>
          </section>
        )}

        {/* Client only: `capability` is first set after mount, so the HUD never server-renders. */}
        {showHud && capability && (
          <Suspense fallback={null}>
            <DebugHud store={store} />
          </Suspense>
        )}
      </main>
    </ExperienceStoreContext.Provider>
  );
}

/** Any failure inside the canvas (shader, driver, chunk load) degrades to the static page. */
class CanvasErrorBoundary extends Component<
  { onError: (reason: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(`WebGL error: ${error instanceof Error ? error.message : String(error)}`);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
