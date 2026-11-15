import { useReducedMotion } from "motion/react";
import { preload } from "react-dom";
import CINEMATIC_PRELOAD from "virtual:cinematic-preload";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { usePointerInput } from "./camera/usePointerInput";
import {
  classifyDevice,
  probeDevice,
  type Capability,
  type TierOverride,
  isFilm,
} from "./device/capabilities";
import { StaticFallback } from "./fallback/StaticFallback";
import { introRequested, markIntroSeen } from "./intro/intro-gate";
import { IntroQuestion } from "./intro/IntroQuestion";
import { CinematicOverlay } from "./overlay/CinematicOverlay";
import { Narrative } from "./overlay/Narrative";
import { ProductLayer } from "./overlay/ProductLayer";
import { markStage } from "./performance/marks";
import { QUALITY_PRESETS } from "./performance/quality";
import {
  createExperienceStore,
  ExperienceStoreContext,
  useExperienceValue,
} from "./scroll/experience-store";
import { useScrollController } from "./scroll/useScrollController";
import { useStoryDriver } from "./timeline/useStoryDriver";
import { soundController } from "./sound/controller";
import { SCENE_RANGES, TIMELINE_SCROLL_VH } from "./timeline/timeline";
import { PEARL_WORLD } from "./world/tone";

// three.js + React Three Fiber load only in the browser, after hydration, and
// only for devices that get the WebGL experience. The HUD is dev tooling.
let canvasChunk: Promise<typeof import("./scene/CinematicCanvas")> | null = null;
const loadCanvas = () => {
  if (!canvasChunk) {
    markStage("bundle-start");
    canvasChunk = import("./scene/CinematicCanvas");
    canvasChunk.then(() => markStage("bundle-loaded")).catch(() => undefined);
  }
  return canvasChunk;
};
const CinematicCanvas = lazy(loadCanvas);

// The 3D bundle starts downloading the moment this module runs in the browser — while the opening
// question is on screen — for any visit that may get the film (Vite's preload helper adds the
// modulepreload links for its dependencies). Phones and reduced motion get the still version, so
// they skip it. The rejection is handled where the bundle is awaited.
if (
  typeof window !== "undefined" &&
  window.innerWidth >= 768 &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  loadCanvas().catch(() => undefined);
}
const DebugHud = lazy(() => import("./debug/DebugHud"));

/** Who can get the film (see classifyDevice): only they download the 3D bundle early. */
const FILM_MEDIA = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

const HIDE_SCROLLBAR =
  "html,body{scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}";

/** If the 3D bundle has not arrived by then and the visitor has not started the film, the visit
 * gets the still version — decided once, before they are inside the story. */
const BUNDLE_WAIT_MS = 4_000;

/** After the opening's lockup forms, how long the visit waits for the world before it is served
 * the still version instead. */
const LOCKUP_WAIT_MS = 8_000;

/** The opening: asked (first visits only), holding at the lockup for the world, or finished. */
type IntroState = "ask" | "hold" | "off";

/**
 * The visit's mode, decided ONCE (module scope: it survives remounts and client navigations) and
 * never recomputed — a resize, a zoom, DevTools, a slow GPU, an error or a lost WebGL context
 * never swap the layout under the visitor. Only a different review override re-decides.
 */
let visitDecision: { override: TierOverride | undefined; capability: Capability } | null = null;

function decideVisit(override: TierOverride | undefined): Capability {
  if (visitDecision && visitDecision.override === override) return visitDecision.capability;
  const device = probeDevice();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const capability = classifyDevice(device, { reducedMotion, override });
  visitDecision = { override, capability };
  return capability;
}

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
  // Server render: <link rel="preload"> for the 3D bundle in <head>, so it downloads alongside
  // the page itself (the list is empty on the client — see cinematicPreload in vite.config.ts).
  for (const href of CINEMATIC_PRELOAD)
    preload(href, { as: "script", crossOrigin: "anonymous", media: FILM_MEDIA });
  const [store] = useState(createExperienceStore);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() === true;
  const [capability, setCapability] = useState<Capability | null>(null);
  // Problems inside the 3D world hide the world; the film itself keeps running on the overlay.
  const [worldOff, setWorldOff] = useState<string | null>(null);
  const ready = useExperienceValue(store, (s) => s.ready);
  // Server and first client render agree on "ask" (the markup is hidden by CSS unless the head
  // gate asked for it); the layout effect below switches it off before the first paint otherwise.
  const [intro, setIntro] = useState<IntroState>("ask");
  const introRef = useRef<IntroState>("ask");
  introRef.current = intro;

  // Decide the experience once, before the browser paints the hydrated intro (the server render
  // is the void + first line). Never re-decided for this visit.
  useLayoutEffect(() => {
    const decided = decideVisit(tierOverride);
    store.state.device = probeDevice();
    store.state.capability = decided;
    setCapability(decided);
    if (introRequested()) markIntroSeen();
    else setIntro("off");
  }, [store, tierOverride]);

  const serveStill = (reason: string) => {
    const still: Capability = { mode: "fallback", tier: "lite", reasons: [reason] };
    visitDecision = { override: tierOverride, capability: still };
    store.state.capability = still;
    setCapability(still);
  };

  // While the question is asked and while the lockup holds for the world, the story cannot move:
  // the page does not scroll, and assistive technology is told the region is busy.
  useEffect(() => {
    // The gate itself is asked, not only the state: the first client render starts at "ask" for
    // every visit (to match the server), and a mid-story reload must never be scrolled to the top.
    if (intro === "off" || !introRequested()) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    // The gate only asks at the very top of a fresh page; this just keeps it there.
    if (window.scrollY !== 0) window.scrollTo(0, 0);
    return () => {
      root.style.overflow = before;
    };
  }, [intro]);

  // The lockup holds until the world is ready; after LOCKUP_WAIT_MS the visit gets the still
  // version instead (decided before the visitor is inside the film, never mid-film).
  useEffect(() => {
    if (intro !== "hold") return;
    if (ready) {
      setIntro("off");
      return;
    }
    const id = window.setTimeout(() => {
      console.warn("[cinematic] Not ready 8 s after the opening — serving the still version.");
      serveStill("not ready 8 s after the opening");
      setIntro("off");
    }, LOCKUP_WAIT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, ready]);

  // Review/test hook (only with ?freeze, ?debug or ?perf): scene ranges + live state for frame
  // capture; ?perf exposes the same counters without the HUD, for scripts/film-perf.mjs.
  useEffect(() => {
    const perf = new URLSearchParams(window.location.search).has("perf");
    if (!freeze && !debug && !perf) return;
    const w = window as unknown as Record<string, unknown>;
    w.__cine = {
      scenes: SCENE_RANGES,
      state: store.state,
      // Live sound diagnostics: output level reaching the speakers, context state, cues played.
      sound: {
        level: () => soundController.level(),
        context: () => soundController.contextState(),
        fired: () => soundController.fired,
      },
    };
    return () => {
      delete w.__cine;
    };
  }, [store, freeze, debug]);

  const mode = capability?.mode ?? "pending";

  // The 3D bundle starts loading as soon as the visit is a WebGL one. If it has not arrived
  // within BUNDLE_WAIT_MS and the visitor is still at the opening, the visit is served the still
  // version (the one moment a decision can still change, before they enter the film). If they
  // are already scrolling, the film continues on the overlay and the world joins if it arrives.
  useEffect(() => {
    if (!isFilm(mode) || tierOverride) return;
    let loaded = false;
    loadCanvas().then(
      () => (loaded = true),
      (err: unknown) => {
        console.error("[cinematic] The 3D bundle failed to load; the film runs without it:", err);
        setWorldOff("bundle failed");
      },
    );
    const id = window.setTimeout(() => {
      if (loaded || window.scrollY > 40 || introRef.current !== "off") return;
      console.warn(
        "[cinematic] 3D bundle slower than 4 s — serving the still version for this visit.",
      );
      serveStill("3D bundle slower than 4 s");
    }, BUNDLE_WAIT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tierOverride, store]);

  useScrollController(store, sectionRef, mode !== "fallback");
  // The story answers from the first gesture: progress and the overlay run on the page itself,
  // and the WebGL world joins the current position whenever it is ready.
  useStoryDriver(store, stageRef, {
    enabled: mode !== "fallback",
    animate: !reducedMotion,
    freeze,
  });
  usePointerInput(store, isFilm(mode) && !reducedMotion && !freeze);
  // The soundtrack is offered with the WebGL experience only (off until the visitor asks).
  useEffect(() => (isFilm(mode) ? soundController.attach(store) : undefined), [mode, store]);

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
        data-intro-state={intro}
        // Only once the client knows the opening is running (`capability` is set in the same
        // layout effect): the server HTML never tells a returning visitor the page is busy.
        aria-busy={(capability !== null && intro !== "off") || undefined}
        // The first paint is the pearl opening; the world fades up over it once it renders.
        style={{ backgroundColor: PEARL_WORLD.sky }}
      >
        {/* The fallback is itself the semantic story — never read it twice. */}
        {mode !== "fallback" && <Narrative />}
        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        {mode === "fallback" ? (
          <StaticFallback />
        ) : (
          // Time, not a page: the document scrollbar is hidden on this route (scrolling, keys and
          // assistive navigation work as usual); the overlay shows a film-time hairline instead.
          <section
            ref={sectionRef}
            data-testid="cinematic-timeline"
            aria-label="Cinematic story — scroll to travel through it"
            className="[--cine-pace:1] max-sm:[--cine-pace:0.82]"
            // The stage's own 100lvh plus the timeline's scroll length (shorter on phones).
            style={{ height: `calc(${TIMELINE_SCROLL_VH}lvh * var(--cine-pace) + 100lvh)` }}
          >
            <style>{HIDE_SCROLLBAR}</style>
            <div
              ref={stageRef}
              className="fixed inset-x-0 top-0 h-lvh"
              data-testid="cinematic-stage"
            >
              {/* The world fades up over the void as soon as it has rendered real frames — but
                  while the story rests at its opening it adds nothing: the identity holds the
                  pearl field alone, so the first frame is the finished opening and time never
                  changes it. The world arrives as the visitor scrolls into the story
                  (--world-in, written by DomSync from the story position). */}
              <div
                className={`absolute inset-0 transition-opacity duration-[1400ms] ${ready ? "opacity-100" : "opacity-0"}`}
              >
                <div
                  data-cine-world
                  data-world={worldOff ? "off" : "on"}
                  className="absolute inset-0"
                  style={{ opacity: worldOff ? 0 : "var(--world-in, 0)" }}
                >
                  {isFilm(mode) && capability && !worldOff?.startsWith("error") && (
                    <CanvasErrorBoundary
                      onError={(reason) => {
                        console.error(
                          "[cinematic] The 3D world failed; the film continues without it:",
                          reason,
                        );
                        setWorldOff(`error: ${reason}`);
                      }}
                    >
                      <Suspense fallback={null}>
                        <CinematicCanvas
                          store={store}
                          preset={QUALITY_PRESETS[capability.tier]}
                          animate={!reducedMotion}
                          parallax={!reducedMotion}
                          freeze={freeze}
                          onContextLost={() => {
                            console.warn("[cinematic] WebGL context lost — waiting to restore it.");
                            setWorldOff("context lost");
                          }}
                          onContextRestored={() => setWorldOff(null)}
                        />
                      </Suspense>
                    </CanvasErrorBoundary>
                  )}
                </div>
              </div>
              <CinematicOverlay />
              <ProductLayer />
            </div>
          </section>
        )}

        {intro !== "off" && (
          <IntroQuestion
            holding={intro === "hold"}
            still={mode === "fallback"}
            reducedMotion={reducedMotion}
            onLockup={() => setIntro(mode === "fallback" || store.state.ready ? "off" : "hold")}
            onSkip={() => setIntro("off")}
          />
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

/** Any failure inside the canvas (shader, driver, chunk load) hides the world; the film keeps
 * running on the overlay, never swapping to the still page under the visitor. */
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
