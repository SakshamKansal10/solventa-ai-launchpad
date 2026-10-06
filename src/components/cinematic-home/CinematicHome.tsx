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
import { ExperienceLoader } from "./loading/ExperienceLoader";
import { DomOverlay } from "./overlay/DomOverlay";
import { QUALITY_PRESETS } from "./performance/quality";
import { PALETTE } from "./scene/palette";
import {
  createExperienceStore,
  ExperienceStoreContext,
  useExperienceValue,
} from "./scroll/experience-store";
import { useScrollController } from "./scroll/useScrollController";
import { TIMELINE_SCROLL_VH } from "./timeline/timeline";

// three.js + React Three Fiber load only in the browser, after hydration, and
// only for devices that get the WebGL experience. The HUD is dev tooling.
const CinematicCanvas = lazy(() => import("./scene/CinematicCanvas"));
const DebugHud = lazy(() => import("./debug/DebugHud"));

/** A WebGL start slower than this (huge GPU stall, broken driver) falls back to the static page. */
const START_TIMEOUT_MS = 15_000;

/**
 * EXPERIENCE SHELL of the cinematic homepage (Phase 1 prototype).
 *
 *   section (tall, native scroll) ── sets the scroll length of the timeline
 *     └ stage (position: fixed, 100lvh) ── persists through the whole section
 *         ├ WebGL canvas (lazy)         ── scene/  camera/  timeline/  performance/
 *         └ DOM overlay                 ── overlay/
 *   loading veil · static fallback · dev HUD
 *
 * The stage is `fixed`, not `sticky`: the global stylesheet sets overflow-x on
 * both <html> and <body>, which disables sticky positioning site-wide. Content
 * after the section (the footer) simply slides over the stage, and rendering
 * pauses once it is covered.
 */
export function CinematicHome({
  tierOverride,
  debug,
}: {
  tierOverride?: TierOverride;
  debug?: boolean;
}) {
  const [store] = useState(createExperienceStore);
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() === true;
  const [capability, setCapability] = useState<Capability | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const ready = useExperienceValue(store, (s) => s.ready);

  // Decide the experience on the client (the server render is the loading veil).
  useEffect(() => {
    const device = probeDevice();
    const decided = classifyDevice(device, { reducedMotion, override: tierOverride });
    store.state.device = device;
    store.state.capability = decided;
    setCapability(decided);
  }, [store, reducedMotion, tierOverride]);

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
  usePointerInput(store, mode === "webgl" && !reducedMotion);

  const showHud = debug ?? import.meta.env.DEV;

  return (
    <ExperienceStoreContext.Provider value={store}>
      <main
        data-testid="cinematic-home"
        data-mode={mode}
        data-tier={capability?.tier ?? ""}
        data-ready={String(ready || mode === "fallback")}
        style={{ backgroundColor: PALETTE.midnight }}
      >
        <h1 className="sr-only">Solventia — cinematic homepage prototype</h1>

        {mode === "fallback" ? (
          <StaticFallback />
        ) : (
          <section
            ref={sectionRef}
            data-testid="cinematic-timeline"
            // The stage's own 100lvh plus the timeline's scroll length.
            style={{ height: `${TIMELINE_SCROLL_VH + 100}lvh` }}
          >
            <div className="fixed inset-x-0 top-0 h-lvh" data-testid="cinematic-stage">
              {mode === "webgl" && capability && (
                <CanvasErrorBoundary onError={setFailure}>
                  <Suspense fallback={null}>
                    <CinematicCanvas
                      store={store}
                      preset={QUALITY_PRESETS[capability.tier]}
                      animate={!reducedMotion}
                      parallax={!reducedMotion}
                      onContextLost={() => setFailure("WebGL context lost")}
                    />
                  </Suspense>
                </CanvasErrorBoundary>
              )}
              <DomOverlay />
            </div>
          </section>
        )}

        <ExperienceLoader ready={ready || mode === "fallback"} />
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
