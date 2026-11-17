import { useReducedMotion } from "motion/react";
import { preload } from "react-dom";
import CINEMATIC_PRELOAD from "virtual:cinematic-preload";
import {
  Component,
  lazy,
  memo,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { usePointerInput } from "./camera/usePointerInput";
import {
  chooseFilmPath,
  probeDevice,
  type Capability,
  type FilmOverride,
} from "./device/capabilities";
import { FilmDebug } from "./debug/FilmDebug";
import { introGate, type IntroGate } from "./intro/intro-gate";
import { IntroQuestion } from "./intro/IntroQuestion";
import { IntroReturn } from "./intro/IntroReturn";
import { IntroStyles, LockupHold } from "./intro/IntroShared";
import { useCalm } from "./intro/pacing";
import { CinematicOverlay } from "./overlay/CinematicOverlay";
import { Narrative } from "./overlay/Narrative";
import { ProductLayer } from "./overlay/ProductLayer";

// The film's own layers take no props: the opening's state changes (ask → reveal → hold → off)
// must not re-render them — at the exit that render blocked the main thread for ~0.1 s (1920),
// ~0.45 s at 4× CPU (measured 2026-11-16).
const FilmOverlay = memo(CinematicOverlay);
const FilmNarrative = memo(Narrative);
const FilmProducts = memo(ProductLayer);
import { markStage } from "./performance/marks";
import { QUALITY_PRESETS } from "./performance/quality";
import { RecordedFilm } from "./recorded/RecordedFilm";
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

/** Everyone with motion gets the live film (phones too): they download the 3D bundle early. */
const FILM_MEDIA = "(prefers-reduced-motion: no-preference)";

const HIDE_SCROLLBAR =
  "html,body{scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}";

/** After the opening's lockup forms, how long it holds for the live world; then the visitor goes
 * on, the recorded film showing until the live world arrives (never a different page). */
const LOCKUP_WAIT_MS = 8_000;
/** A lost WebGL context that is not restored within this long hands the film to the recording. */
const CONTEXT_RESTORE_MS = 5_000;
/** Once the world is ready behind the held lockup, how long the hold waits for its first frames
 * to have passed (smooth frames again) before the film is handed over anyway. */
const CALM_WAIT_MS = 1_200;

/** The opening: asked (first visits only), holding at the lockup for the world, or finished. */
type IntroState = "ask" | "reveal" | "hold" | "off";

/**
 * How this visit's film is drawn (device/capabilities.ts), decided once per page load (module
 * scope: it survives remounts and client navigations; nothing is stored between visits). The
 * layout never changes: only the rendering path, and only live → recorded, when the live world
 * fails and cannot recover.
 */
let visitDecision: { key: string; capability: Capability } | null = null;

function decideVisit(override: FilmOverride): Capability {
  const key = JSON.stringify(override);
  if (visitDecision && visitDecision.key === key) return visitDecision.capability;
  const device = probeDevice();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const capability = chooseFilmPath(device, { reducedMotion, override });
  visitDecision = { key, capability };
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
  override = {},
  filmDebug = false,
  debug,
  freeze = false,
}: {
  /** Review/test overrides (?film, ?tier). */
  override?: FilmOverride;
  /** ?film=debug: the rendering path, its quality and why. */
  filmDebug?: boolean;
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
  // A lost WebGL context hides the live world while it is restored (the recording shows meanwhile).
  const [worldOff, setWorldOff] = useState<string | null>(null);
  const ready = useExperienceValue(store, (s) => s.ready);
  // Server and first client render agree on "ask" (the markup is hidden by CSS unless the head
  // gate asked for it); the layout effect below switches it off before the first paint otherwise.
  const [intro, setIntro] = useState<IntroState>("ask");
  // Which opening: unknown until the layout effect reads the head gate (both are server-rendered
  // and the gate's CSS shows the right one before then).
  const [variant, setVariant] = useState<IntroGate | null>(null);
  const introRef = useRef<IntroState>("ask");
  introRef.current = intro;
  // How the opening exited: over the ready world, or (its time cap reached first) "flat" — the
  // reveal on the pearl sky alone, with the world's drawing held until the reveal has finished.
  const [introPath, setIntroPath] = useState<"world" | "flat" | null>(null);
  // The opening's text has faded in: the lockup beneath is pre-painted from then (IntroShared).
  const [textIn, setTextIn] = useState(false);

  // Decide the experience once, before the browser paints the hydrated intro (the server render
  // is the void + first line). Never re-decided for this visit.
  const overrideKey = JSON.stringify(override);
  useLayoutEffect(() => {
    const decided = decideVisit(override);
    store.state.device = probeDevice();
    store.state.capability = decided;
    setCapability(decided);
    const gate = introGate();
    if (gate) setVariant(gate);
    else setIntro("off");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, overrideKey]);

  // The exit starts. On the flat path the world draws nothing until the reveal has finished: its
  // first frames stall the GPU, and nothing of the world shows at the film's opening anyway (it
  // arrives with the first scroll), so the reveal is the same frames either way.
  const onReveal = (path: "world" | "flat") => {
    setIntroPath(path);
    setIntro("reveal");
    if (path === "flat" && live) {
      store.state.worldHeld = true;
      store.emit();
    }
  };
  // Either opening ends on the lockup: the film starts now if the world is ready and drawing
  // smoothly, else the lockup holds (the world resumes drawing here on the flat path).
  const toLockup = () =>
    setIntro(!live || (store.state.ready && introPath !== "flat") ? "off" : "hold");
  // The world draws again once the reveal is over, however it ended (lockup, Esc).
  useEffect(() => {
    if (intro === "reveal" || !store.state.worldHeld) return;
    store.state.worldHeld = false;
    store.emit();
  }, [intro, store]);
  const calmInHold = useCalm(intro === "hold" && ready);

  // The live world failed and cannot recover: the recording takes over at the same scroll
  // position (the page, the overlay and the story do not change).
  const toRecorded = (reason: string) => {
    const prev = store.state.capability;
    if (prev?.path !== "live") return;
    const next: Capability = { ...prev, path: "recorded", reasons: [...prev.reasons, reason] };
    if (visitDecision) visitDecision = { ...visitDecision, capability: next };
    store.state.capability = next;
    setCapability(next);
  };

  // While the question is asked and while the lockup holds for the world, the story cannot move:
  // the page does not scroll, and assistive technology is told the region is busy.
  useEffect(() => {
    // The gate itself is asked, not only the state: the first client render starts at "ask" for
    // every visit (to match the server), and a mid-story reload must never be scrolled to the top.
    if (intro === "off" || !introGate()) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    // The gate only asks at the very top of a fresh page; this just keeps it there.
    if (window.scrollY !== 0) window.scrollTo(0, 0);
    return () => {
      root.style.overflow = before;
    };
  }, [intro]);

  // No visible Skip (owner, 2026-11-16): Esc ends the opening, the reveal or the hold silently.
  useEffect(() => {
    if (intro === "off") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIntro("off");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intro]);

  // The lockup holds until the world is ready; after LOCKUP_WAIT_MS the visit gets the still
  // version instead (decided before the visitor is inside the film, never mid-film).
  // Once ready, it waits (briefly) for the world's first frames to pass, so the film's first
  // movement does not stall; that wait never downgrades the visit.
  useEffect(() => {
    if (intro !== "hold") return;
    if (ready) {
      if (calmInHold) {
        setIntro("off");
        return;
      }
      const id = window.setTimeout(() => setIntro("off"), CALM_WAIT_MS);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      console.warn(
        "[cinematic] Not ready 8 s after the opening — the recording shows until it is.",
      );
      setIntro("off");
    }, LOCKUP_WAIT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, ready, calmInHold]);

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

  const path = capability?.path ?? "pending";
  const live = path === "live";

  // The 3D bundle starts loading as soon as the visit is a live one. However slow it is, the page
  // never changes: the recording's frame for the current position shows until the world is ready.
  // Only a bundle that cannot load at all hands the film to the recording.
  useEffect(() => {
    if (!live) return;
    loadCanvas().catch((err: unknown) => {
      console.error("[cinematic] The 3D bundle failed to load; the recorded film plays:", err);
      toRecorded("3D bundle failed to load");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, store]);

  // A lost context the browser does not restore in time: the recording, at the same position.
  useEffect(() => {
    if (worldOff !== "context lost") return;
    const id = window.setTimeout(
      () => toRecorded("WebGL context lost and not restored"),
      CONTEXT_RESTORE_MS,
    );
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldOff]);

  useScrollController(store, sectionRef, true);
  // The story answers from the first gesture: progress and the overlay run on the page itself,
  // and the WebGL world joins the current position whenever it is ready.
  useStoryDriver(store, stageRef, {
    enabled: true,
    animate: !reducedMotion,
    freeze,
  });
  usePointerInput(store, live && !reducedMotion && !freeze);
  // The soundtrack is offered on every path (off until the visitor asks).
  useEffect(() => (capability ? soundController.attach(store) : undefined), [capability, store]);

  const showHud = debug ?? import.meta.env.DEV;
  const status =
    path === "recorded" || path === "reduced"
      ? "The film is ready. Scroll to travel through it."
      : ready
        ? "The interactive experience is ready. Scroll to travel through it."
        : "Loading the interactive experience.";

  return (
    <ExperienceStoreContext.Provider value={store}>
      <main
        data-testid="cinematic-home"
        data-mode={path}
        data-tier={capability?.tier ?? ""}
        data-ready={String(ready || (capability !== null && !live))}
        data-intro-state={intro}
        data-intro-path={introPath ?? undefined}
        data-prewarm={(capability !== null && !live) || ready || textIn ? "" : undefined}
        // Only once the client knows the opening is running (`capability` is set in the same
        // layout effect): the server HTML never tells a returning visitor the page is busy.
        aria-busy={(capability !== null && intro !== "off") || undefined}
        // The first paint is the pearl opening; the world fades up over it once it renders.
        style={{ backgroundColor: PEARL_WORLD.sky }}
      >
        {/* First in the page: the openings' rules (which also hide the film's lockup under an
            opening) must arrive before the lockup's markup — streamed after it, a slow device
            painted the lockup for ~2 s before the question (4× CPU, measured 2026-11-16). */}
        <IntroStyles />
        {/* The story as text, for assistive technology and search (every path). */}
        <FilmNarrative />
        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        {
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
              <div className="absolute inset-0">
                <div
                  data-cine-world
                  data-world={worldOff ? "off" : "on"}
                  className="absolute inset-0"
                  style={{ opacity: "var(--world-in, 0)" }}
                >
                  {/* The recorded film: the whole film on the recorded and reduced-motion paths;
                      on the live path, the frame for the current position until the live world
                      is ready (or while a lost context is restored). Same layer, same fade. */}
                  {capability && (
                    <RecordedFilm
                      store={store}
                      mode={
                        path === "reduced" ? "keyframes" : path === "recorded" ? "scrub" : "poster"
                      }
                      active={!live || !ready || worldOff !== null}
                    />
                  )}
                  {live && capability && !worldOff?.startsWith("error") && (
                    <CanvasErrorBoundary
                      onError={(reason) => {
                        console.error(
                          "[cinematic] The 3D world failed; the recorded film plays:",
                          reason,
                        );
                        setWorldOff(`error: ${reason}`);
                        toRecorded(`3D world error: ${reason}`);
                      }}
                    >
                      <Suspense fallback={null}>
                        <div
                          className={`absolute inset-0 transition-opacity duration-[1400ms] ${ready && !worldOff ? "opacity-100" : "opacity-0"}`}
                        >
                          <CinematicCanvas
                            store={store}
                            preset={QUALITY_PRESETS[capability.tier]}
                            animate={!reducedMotion}
                            parallax={!reducedMotion}
                            freeze={freeze}
                            onContextLost={() => {
                              console.warn(
                                "[cinematic] WebGL context lost — waiting to restore it.",
                              );
                              setWorldOff("context lost");
                            }}
                            onContextRestored={() => setWorldOff(null)}
                          />
                        </div>
                      </Suspense>
                    </CanvasErrorBoundary>
                  )}
                </div>
              </div>
              <FilmOverlay />
              <FilmProducts />
            </div>
          </section>
        }

        {/* Both openings are server-rendered; the head gate shows the right one before hydration. */}
        {(intro === "ask" || intro === "reveal") && (variant === null || variant === "show") && (
          <IntroQuestion
            still={false}
            settled={!live || ready}
            reducedMotion={reducedMotion}
            onReveal={onReveal}
            onLockup={toLockup}
            onTextIn={() => setTextIn(true)}
            onSkip={() => setIntro("off")}
          />
        )}
        {(["return", "signedin"] as const).map(
          (v) =>
            (intro === "ask" || intro === "reveal") &&
            (variant === null || variant === v) && (
              <IntroReturn
                key={v}
                variant={v}
                onReveal={onReveal}
                still={false}
                settled={!live || ready}
                reducedMotion={reducedMotion}
                onLockup={toLockup}
                onTextIn={() => setTextIn(true)}
                onSkip={() => setIntro("off")}
              />
            ),
        )}
        {intro === "hold" && <LockupHold onSkip={() => setIntro("off")} />}

        {/* Client only: `capability` is first set after mount, so the HUD never server-renders. */}
        {showHud && capability && (
          <Suspense fallback={null}>
            <DebugHud store={store} />
          </Suspense>
        )}
        {filmDebug && capability && <FilmDebug store={store} />}
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
