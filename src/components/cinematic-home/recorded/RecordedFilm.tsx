import { useEffect, useRef } from "react";

import type { ExperienceStore } from "../scroll/experience-store";
import { SCENE_RANGES } from "../timeline/timeline";

/**
 * The recorded film (owner, 2026-11-17): the live 3D world pre-rendered from the same camera path
 * (scripts/record-film.mjs → public/film/), frame i = film progress i / (N − 1), drawn to a canvas
 * at the visitor's scroll position — so the page, the overlay and the story are the live film's,
 * only the world is a recording. It sits inside the world layer (the same --world-in fade) under
 * the live canvas.
 *
 *   scrub      the recorded path: every frame, loaded progressively (the frame at the visitor's
 *              position first, then coarse to fine); the two nearest frames are blended by the
 *              exact position, so scrubbing is smooth.
 *   keyframes  reduced motion: one frame per scene, crossfaded gently when the scene changes —
 *              no camera moves.
 *   poster     the live path before the live world is ready: just the frame at the current
 *              position, so a slow network never shows an empty or different page.
 *
 * Phones (portrait or narrow) get a small portrait set, other screens a 16:10 set; each is drawn
 * to cover the screen, like the live camera.
 */
export type RecordedMode = "scrub" | "keyframes" | "poster";

interface FilmSet {
  frames: number;
  width: number;
  height: number;
  bytes: number;
  path: string;
}
interface Manifest {
  sets: Record<"desktop" | "phone", FilmSet>;
}

let manifestLoad: Promise<Manifest | null> | null = null;
function loadManifest(): Promise<Manifest | null> {
  manifestLoad ??= fetch("/film/manifest.json")
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
    .catch(() => null);
  return manifestLoad;
}

/** The frame shown for each scene in reduced motion: its middle. */
const KEY_POINTS = SCENE_RANGES.map((s) => (s.start + s.end) / 2);
const CROSSFADE_MS = 700;
const PARALLEL_LOADS = 4;

export function RecordedFilm({
  store,
  mode,
  active,
}: {
  store: ExperienceStore;
  mode: RecordedMode;
  /** Drawing and loading run only while the recording is what the visitor sees. */
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Loaded frames survive mode changes (a live → recorded switch reuses the poster frames).
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const set = useRef<FilmSet | null>(null);
  const wanted = useRef<number[]>([]);
  const inFlight = useRef(0);
  const dirty = useRef(true);

  useEffect(() => {
    if (!active) return;
    let live = true;
    let raf = 0;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let shownKey = -1;
    let fadeFrom = -1;
    let fadeStart = 0;
    // The crossfade's final, fully opaque frame has been drawn (a fade must end on it).
    let fadeDone = true;
    let lastIndex = -1;
    let lastP = -1;

    const pump = () => {
      const s = set.current;
      while (s && inFlight.current < PARALLEL_LOADS && wanted.current.length) {
        const i = wanted.current.shift()!;
        if (frames.current[i] !== undefined) continue;
        frames.current[i] = null; // requested
        inFlight.current++;
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          inFlight.current--;
          frames.current[i] = img;
          dirty.current = true;
          pump();
        };
        img.onerror = () => {
          inFlight.current--;
          frames.current[i] = undefined as unknown as null;
          pump();
        };
        img.src = `${s.path}${String(i).padStart(3, "0")}.webp`;
      }
    };
    /** Ask for frames: `first` jumps the queue. */
    const want = (indices: number[], first = false) => {
      const fresh = indices.filter((i) => frames.current[i] === undefined);
      wanted.current = first ? [...fresh, ...wanted.current] : [...wanted.current, ...fresh];
      pump();
    };
    const indexAt = (p: number) =>
      Math.round(Math.min(1, Math.max(0, p)) * ((set.current?.frames ?? 1) - 1));
    /** The loaded frame nearest to `i`. */
    const nearest = (i: number) => {
      const f = frames.current;
      for (let d = 0; d < f.length; d++) {
        if (f[i - d]) return i - d;
        if (f[i + d]) return i + d;
      }
      return -1;
    };

    void loadManifest().then((m) => {
      if (!live || !m) return;
      const portrait = window.innerWidth < 768 || window.innerHeight > window.innerWidth;
      set.current = portrait ? m.sets.phone : m.sets.desktop;
      canvas.dataset.filmSet = portrait ? "phone" : "desktop";
      frames.current.length = set.current.frames;
      const n = set.current.frames;
      const here = indexAt(store.state.progress);
      if (mode === "keyframes") {
        const keys = KEY_POINTS.map(indexAt);
        want([...new Set([indexAt(KEY_POINTS[sceneAt(store.state.progress)]), ...keys])]);
      } else if (mode === "scrub") {
        // The frame here first, then coarse to fine over the whole film.
        const order: number[] = [here];
        for (let stride = 32; stride >= 1; stride >>= 1)
          for (let i = 0; i < n; i += stride) order.push(i);
        want([...new Set(order)]);
      } else {
        want([here]);
      }
      dirty.current = true;
    });

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const s = set.current;
      if (!s) return;
      const p = store.state.progress;
      // Backing store: the screen's size (capped at 2× for memory).
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        dirty.current = true;
      }
      const cover = (img: HTMLImageElement, alpha: number) => {
        const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * k;
        const dh = img.naturalHeight * k;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.globalAlpha = 1;
      };

      if (mode === "keyframes") {
        const key = indexAt(KEY_POINTS[sceneAt(p)]);
        if (key !== shownKey && frames.current[key]) {
          fadeFrom = shownKey;
          shownKey = key;
          fadeStart = now;
          fadeDone = false;
          dirty.current = true;
        }
        const t = Math.min(1, (now - fadeStart) / CROSSFADE_MS);
        if (!dirty.current && t >= 1 && fadeDone) return;
        dirty.current = false;
        if (t >= 1) fadeDone = true;
        const to = frames.current[shownKey];
        const from = fadeFrom >= 0 ? frames.current[fadeFrom] : null;
        if (!to) return;
        if (from && t < 1) {
          cover(from, 1);
          cover(to, t * t * (3 - 2 * t));
        } else cover(to, 1);
        canvas.dataset.frame = String(shownKey);
        canvas.dataset.settled = fadeDone ? "1" : "0";
        return;
      }

      const x = Math.min(1, Math.max(0, p)) * (s.frames - 1);
      const a = Math.floor(x);
      const here = Math.round(x);
      if (here !== lastIndex) {
        lastIndex = here;
        // The visitor's position always loads next (poster: only it).
        want([here, a, Math.min(s.frames - 1, a + 1)], true);
      }
      if (!dirty.current && p === lastP) return;
      dirty.current = false;
      lastP = p;
      const fa = frames.current[a];
      const fb = frames.current[Math.min(s.frames - 1, a + 1)];
      if (fa && fb && fa !== fb) {
        cover(fa, 1);
        cover(fb, x - a);
        canvas.dataset.frame = String(here);
      } else {
        const n = nearest(here);
        if (n < 0) return;
        cover(frames.current[n]!, 1);
        canvas.dataset.frame = String(n);
      }
      canvas.dataset.loaded = String(frames.current.filter(Boolean).length);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [active, mode, store]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="recorded-film"
      data-mode={mode}
      data-active={active ? "" : undefined}
      className="pointer-events-none absolute inset-0 block h-full w-full"
    />
  );
}

/** The scene a film position belongs to. */
function sceneAt(p: number): number {
  const i = SCENE_RANGES.findIndex((s) => p >= s.start && p < s.end);
  return i >= 0 ? i : p >= 1 ? SCENE_RANGES.length - 1 : 0;
}

/** For the debug overlay and the report. */
export async function recordedFilmSizes() {
  const m = await loadManifest();
  return m?.sets ?? null;
}
