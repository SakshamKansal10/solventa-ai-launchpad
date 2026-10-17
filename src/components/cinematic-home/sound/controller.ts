import type { ExperienceStore } from "../scroll/experience-store";
import { SoundEngine } from "./engine";
import { createCueGate, mixAt } from "./score";

/**
 * Owns the soundtrack for the page: the visitor's preference, the audio
 * context's lifecycle and the loop that follows the scroll.
 *
 * - Part of the experience, not a utility: ON unless the visitor muted it in this visit, but it
 *   only ever STARTS from the visitor's first real interaction — a tap, click or key press — as
 *   browsers require (scrolling alone is not one). Autoplay rules are never bypassed; a refused
 *   start fails silently and waits for the next interaction.
 * - Never in the way: the interaction that starts it is answered first; the audio graph is built
 *   at the next idle moment (see start). There is no visible control — a keyboard-only mute
 *   exists once sound has actually played (`active`; see SoundToggle).
 * - Follows the scroll every frame: continuous layers track the current scene,
 *   cues fire as their visible events are crossed (once — see createCueGate).
 * - Muting fades to silence and suspends the context; un-muting resumes the
 *   current scene's soundscape. A hidden tab is suspended and resumed too.
 * - The preference lasts for the visit (sessionStorage), never longer.
 * - Only offered with the WebGL experience; the still version is silent.
 * - Nothing depends on sound: every moment it marks is also seen.
 */
const KEY = "solventia:cinematic-sound";

export interface SoundState {
  /** A cinematic stage is mounted (the toggle is offered). */
  available: boolean;
  /** The visitor wants sound. */
  enabled: boolean;
  /** Audio is actually playing (context running). */
  running: boolean;
  /** Sound has played at least once on this page (the mute control is offered from then on). */
  active: boolean;
}

class SoundController {
  private state: SoundState = { available: false, enabled: false, running: false, active: false };
  private listeners = new Set<() => void>();
  private store: ExperienceStore | null = null;
  private ctx: AudioContext | null = null;
  private engine: SoundEngine | null = null;
  private gate: ReturnType<typeof createCueGate> | null = null;
  private raf = 0;
  private disarm: (() => void) | null = null;
  /** The audio graph being built, after an interaction (see start). */
  private preparing: Promise<void> | null = null;
  private onVisibility: (() => void) | null = null;
  /** Cues played since the page loaded (diagnostics for tests). */
  fired = 0;

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  snapshot = () => this.state;
  serverSnapshot = () => SERVER_STATE;

  private set(patch: Partial<SoundState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Called by the cinematic stage while it is mounted. Returns the detach. */
  attach(store: ExperienceStore): () => void {
    this.store = store;
    let wanted = true;
    try {
      wanted = sessionStorage.getItem(KEY) !== "off";
    } catch {
      /* storage unavailable: sound is still only started by an interaction */
    }
    this.set({ available: true, enabled: wanted });
    if (wanted) this.armGesture();
    this.onVisibility = () => {
      if (!this.ctx || !this.state.enabled) return;
      if (document.hidden) this.pause();
      else void this.start();
    };
    document.addEventListener("visibilitychange", this.onVisibility);
    return () => {
      if (this.onVisibility) document.removeEventListener("visibilitychange", this.onVisibility);
      this.onVisibility = null;
      this.stop(true);
      this.disarm?.();
      this.store = null;
      this.set({ available: false, running: false, active: false });
    };
  }

  toggle() {
    const enabled = !this.state.enabled;
    try {
      sessionStorage.setItem(KEY, enabled ? "on" : "off");
    } catch {
      /* the choice still applies for this page */
    }
    this.set({ enabled });
    if (enabled) void this.start();
    else this.stop(false);
  }

  /** A real interface interaction (product preview tabs): a soft confirmation, if sound is on. */
  ui() {
    if (this.state.running && this.ctx && this.engine) this.engine.ui(this.ctx.currentTime + 0.01);
  }

  /** Diagnostics: the current output level (RMS), and the context's state. */
  level() {
    return this.engine && this.ctx?.state === "running" ? this.engine.level() : 0;
  }
  contextState() {
    return this.ctx?.state ?? "none";
  }

  /** Start on the visitor's first real interaction; keep listening until audio actually runs. */
  private armGesture() {
    this.disarm?.();
    const go = () => {
      if (!this.state.enabled) {
        this.disarm?.();
        return;
      }
      void this.start().then(() => {
        if (this.state.running) this.disarm?.();
      });
    };
    const events = ["pointerdown", "keydown", "touchend"] as const;
    events.forEach((e) => window.addEventListener(e, go, { passive: true }));
    this.disarm = () => {
      events.forEach((e) => window.removeEventListener(e, go));
      this.disarm = null;
    };
  }

  private async start() {
    if (!this.store || typeof window === "undefined" || !("AudioContext" in window)) return;
    if (!this.ctx) {
      // Opening the audio device and synthesising the room take a few hundred milliseconds on a
      // modest machine — never inside the interaction itself: the click, tap or key press that
      // starts the sound answers first (a click on a link has navigated away before any of it
      // runs). Built once, at the page's next idle moment; a page the visitor has interacted
      // with may start a context created then (where a browser still refuses, the next
      // interaction resumes it — the gesture listeners stay armed until audio runs).
      this.preparing ??= idle().then(() => {
        this.preparing = null;
        if (!this.store || !this.state.enabled || this.ctx) return;
        this.ctx = new AudioContext({ latencyHint: "interactive" });
        this.engine = new SoundEngine(this.ctx);
      });
      await this.preparing;
      if (!this.ctx) return;
    }
    const ctx = this.ctx;
    if (ctx.state !== "running") {
      // Only an interaction may start audio: never wait on a refused attempt.
      await Promise.race([
        ctx.resume().catch(() => undefined),
        new Promise((resolve) => window.setTimeout(resolve, 300)),
      ]);
    }
    if (ctx.state !== "running" || !this.state.enabled || !this.store) return;
    // Start from where the visitor is: the current scene's layers, no backlog of cues.
    this.gate = createCueGate(this.store.state.progress);
    this.engine!.update(mixAt(this.store.state.progress), this.ctx.currentTime);
    this.engine!.setLevel(1, this.ctx.currentTime, 0.6);
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
    this.set({ running: true, active: true });
  }

  /** Hidden tab: fade out and suspend (the preference is unchanged). */
  private pause() {
    cancelAnimationFrame(this.raf);
    const ctx = this.ctx;
    if (!ctx || !this.engine) return;
    this.engine.setLevel(0, ctx.currentTime, 0.1);
    window.setTimeout(() => {
      if (document.hidden) void ctx.suspend();
    }, 400);
    this.set({ running: false });
  }

  private stop(teardown: boolean) {
    cancelAnimationFrame(this.raf);
    const ctx = this.ctx;
    if (ctx && this.engine) {
      this.engine.setLevel(0, ctx.currentTime, 0.12);
      const engine = this.engine;
      window.setTimeout(() => {
        if (teardown) {
          engine.dispose();
          void ctx.close();
        } else if (!this.state.enabled) void ctx.suspend();
      }, 700);
      if (teardown) {
        this.ctx = null;
        this.engine = null;
      }
    }
    this.set({ running: false });
  }

  private loop = () => {
    const store = this.store;
    const ctx = this.ctx;
    const engine = this.engine;
    if (!store || !ctx || !engine || !this.gate) return;
    const p = store.state.progress;
    const now = ctx.currentTime;
    engine.update(mixAt(p), now);
    for (const cue of this.gate.step(p)) {
      engine.play(cue, now + 0.02);
      this.fired++;
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}

/** The page's next idle moment (soon regardless, on a busy page). */
function idle(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: 1200 });
    else window.setTimeout(resolve, 200);
  });
}

const SERVER_STATE: SoundState = {
  available: false,
  enabled: false,
  running: false,
  active: false,
};

export const soundController = new SoundController();
