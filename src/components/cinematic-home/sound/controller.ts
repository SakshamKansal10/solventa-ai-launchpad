import type { ExperienceStore } from "../scroll/experience-store";
import { SoundEngine } from "./engine";
import { createCueGate, mixAt } from "./score";

/**
 * Owns the soundtrack for the page: the visitor's preference, the audio
 * context's lifecycle and the loop that follows the scroll.
 *
 * - OFF by default. Audio starts only from a user gesture (the toggle, or —
 *   when the visitor turned it on earlier in this visit — their first tap,
 *   click or key press), as browsers require. Autoplay rules are never bypassed.
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
}

class SoundController {
  private state: SoundState = { available: false, enabled: false, running: false };
  private listeners = new Set<() => void>();
  private store: ExperienceStore | null = null;
  private ctx: AudioContext | null = null;
  private engine: SoundEngine | null = null;
  private gate: ReturnType<typeof createCueGate> | null = null;
  private raf = 0;
  private disarm: (() => void) | null = null;
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
    let wanted = false;
    try {
      wanted = sessionStorage.getItem(KEY) === "on";
    } catch {
      /* storage unavailable: default off */
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
      this.set({ available: false, running: false });
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

  /** Resume on the visitor's first interaction (an earlier "on" in this visit). */
  private armGesture() {
    this.disarm?.();
    const go = () => {
      this.disarm?.();
      if (this.state.enabled) void this.start();
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
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.engine = new SoundEngine(this.ctx);
    }
    try {
      await this.ctx.resume();
    } catch {
      return;
    }
    if (!this.state.enabled || !this.store) return;
    // Start from where the visitor is: the current scene's layers, no backlog of cues.
    this.gate = createCueGate(this.store.state.progress);
    this.engine!.update(mixAt(this.store.state.progress), this.ctx.currentTime);
    this.engine!.setLevel(1, this.ctx.currentTime, 0.6);
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
    this.set({ running: this.ctx.state === "running" });
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

const SERVER_STATE: SoundState = { available: false, enabled: false, running: false };

export const soundController = new SoundController();
