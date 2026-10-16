import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Matrix4, Vector3 } from "three";

import { progressOf, ramp } from "../timeline/timeline";
import { quadToMatrix3d, SLAB } from "../world/product/product-model";
import { inkAt, lightAt } from "../world/tone";
import { STAGE_COUNTS } from "../world/universe/universe-model";
import { universePhases } from "../world/universe/universe-state";
import { useWorld } from "../world/WorldContext";
import { CAPTIONS, captionOpacity, COUNT_SPAN, FINALE_REVEAL, type Caption } from "./copy";
import { mixHex, ROLE_VAR, WORLD, type WorldRole } from "./palette";

/** The count arrives and leaves like a statement over its own span. */
const COUNT: Caption = {
  id: "count",
  kind: "statement",
  lines: [],
  span: COUNT_SPAN,
  place: "low",
};
const ROLES = Object.keys(WORLD) as WorldRole[];
/** World labels stay below the site bar (its height plus a margin). */
const NAV_CLEARANCE = 96;

/** Writes a style only when it changed — keeps per-frame DOM work to a handful of writes. */
const last = new WeakMap<HTMLElement, Record<string, string>>();
function setStyle(
  el: HTMLElement,
  key: "opacity" | "transform" | "visibility" | "pointerEvents",
  value: string,
) {
  let cache = last.get(el);
  if (!cache) {
    cache = {};
    last.set(el, cache);
  }
  if (cache[key] === value) return;
  cache[key] = value;
  el.style[key] = value;
}
const labelHalf = new WeakMap<HTMLElement, number>();
const labelHeight = new WeakMap<HTMLElement, number>();
/** A caption's text box in viewport px, measured once per viewport size (the copy never moves). */
interface Box {
  key: string;
  l: number;
  t: number;
  r: number;
  b: number;
}
const captionBox = new WeakMap<HTMLElement, Box>();
function boxOf(el: HTMLElement, key: string): Box {
  const cached = captionBox.get(el);
  if (cached && cached.key === key) return cached;
  const r = el.getBoundingClientRect();
  const box = { key, l: r.left, t: r.top, r: r.right, b: r.bottom };
  captionBox.set(el, box);
  return box;
}
const show = (el: HTMLElement, o: number) => {
  setStyle(el, "opacity", o.toFixed(3));
  setStyle(el, "visibility", o > 0.002 ? "visible" : "hidden");
};
/** Writes a CSS custom property only when it changed. */
const lastVar = new WeakMap<HTMLElement, Record<string, string>>();
function setVar(el: HTMLElement, name: string, value: string) {
  let cache = lastVar.get(el);
  if (!cache) {
    cache = {};
    lastVar.set(el, cache);
  }
  if (cache[name] === value) return;
  cache[name] = value;
  el.style.setProperty(name, value);
}
/**
 * A caption's presence for the masked reveal: --o (0 → 1) and --d (+1 while it arrives, −1 while
 * it leaves — the lines continue upward and out instead of reversing).
 */
function present(el: HTMLElement, o: number, leaving: boolean) {
  setVar(el, "--o", o.toFixed(3));
  setVar(el, "--d", leaving ? "-1" : "1");
  setStyle(el, "visibility", o > 0.002 ? "visible" : "hidden");
}
/**
 * The opening identity's journey into the site bar: one object (emblem, wordmark, signature),
 * each part interpolated from its place at the centre to its place in the bar's own lockup.
 * Scroll-linked, so it reverses exactly; eased so it leaves and lands gently.
 */
const BRAND_PARTS = ["mark", "word", "sig"] as const;
interface PartRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
function rectOf(el: HTMLElement): PartRect {
  const prev = el.style.transform;
  el.style.transform = "none";
  const r = el.getBoundingClientRect();
  el.style.transform = prev;
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** Middle of a span (global progress): before it a caption is arriving, after it leaving. */
function spanMid(span: Caption["span"]): number {
  return (progressOf(span[0], span[1]) + progressOf(span[2], Math.min(1, span[3]))) / 2;
}

/**
 * Inside the canvas, after every world has moved: drives the DOM overlay —
 * caption fades, labels projected onto their world anchors, the convergence
 * count, and the product panel mapped onto the slab (CSS homography) until
 * it is released as plain, interactive DOM.
 */
export function DomSync() {
  const { store, animate } = useWorld();
  const scratch = useMemo(
    () => ({ v: new Vector3(), m: new Matrix4(), corners: [0, 1, 2, 3].map(() => new Vector3()) }),
    [],
  );
  /** The panel's first rasterisation is done right after load, invisibly, instead of mid-handoff. */
  const warmUntil = useMemo(() => ({ t: 0 }), []);
  const count = useMemo(() => ({ el: null as HTMLElement | null, value: "" }), []);
  // The finale composition: the S completes alone (≈ finale 0.335), holds a breath, and only
  // then does its name arrive — wordmark → promise → line → CTA across finale 0.38 → 0.78.
  // The finale composition: the trajectories converge on the emblem, then its name arrives —
  // emblem → wordmark → signature → line → CTA across the reveal.
  const finaleFrom = progressOf("finale", FINALE_REVEAL.from);
  const nav = useMemo(() => ({ el: null as HTMLElement | null, value: "" }), []);
  const finaleTo = progressOf("finale", FINALE_REVEAL.to);
  /** The travelling identity: its parts at the centre and in the bar, measured per layout. */
  const brand = useMemo(
    () => ({
      key: "",
      opening: null as HTMLElement | null,
      cue: null as HTMLElement | null,
      parts: [] as { el: HTMLElement; from: PartRect; to: PartRect | null }[],
      state: "",
    }),
    [],
  );
  /** Per caption: the kicker tone last written. */
  const marks = useMemo(() => new Map<string, string>(), []);
  /** The page element the tone variables are written on (nav and overlay inherit them). */
  const tone = useMemo(() => ({ el: null as HTMLElement | null, key: "" }), []);

  useFrame((state) => {
    const s = store.state;
    const p = s.progress;
    const { width, height } = state.size;
    const dom = s.dom;

    // Immersion: the navigation recedes during the deepest sequences, returns for the product.
    nav.el ??= document.querySelector<HTMLElement>("[data-testid=cinematic-nav]");
    if (nav.el) {
      const immerse = Math.max(
        ramp(p, "void", 0.25, "void", 0.85) * (1 - ramp(p, "handoff", 0.6, "product", 0.1)),
        // …and stays away through the identity: it returns only once the CTA is there.
        ramp(p, "connected", 0.4, "return", 0.2) * (1 - ramp(p, "finale", 0.8, "finale", 0.92)),
      ).toFixed(2);
      if (immerse !== nav.value) {
        nav.value = immerse;
        nav.el.style.setProperty("--immerse", immerse);
      }
    }

    // The identity travels from the centre into the bar (and stays there). Measured once per
    // layout — viewport size and web-font state both change the boxes.
    brand.opening ??= document.querySelector<HTMLElement>("[data-brand-opening]");
    if (brand.opening && nav.el) {
      const fonts = typeof document !== "undefined" && document.fonts ? document.fonts.status : "";
      const layoutKey = `${width}x${height}:${fonts}`;
      if (layoutKey !== brand.key) {
        brand.key = layoutKey;
        brand.cue = brand.opening.querySelector<HTMLElement>("[data-brand-cue]");
        brand.parts = BRAND_PARTS.flatMap((name) => {
          const el = brand.opening!.querySelector<HTMLElement>(`[data-brand-part=${name}]`);
          const target = nav.el!.querySelector<HTMLElement>(`[data-brand-part=${name}]`);
          if (!el) return [];
          const to = target ? rectOf(target) : null;
          return [{ el, from: rectOf(el), to: to && to.w > 0 ? to : null }];
        });
        brand.state = "";
      }
      const travel = ramp(p, "void", 0.04, "void", 0.72);
      const t = travel * travel * (3 - 2 * travel);
      const dark = 1 - inkAt(lightAt(p));
      const key = `${t.toFixed(4)}:${dark.toFixed(3)}`;
      if (key !== brand.state) {
        brand.state = key;
        // The identity never fades into the film: it stays at full strength in the bar (only the
        // calls to action recede during the deepest scenes).
        const recede = 1;
        for (const { el, from, to } of brand.parts) {
          const name = el.dataset.brandPart;
          // A part the bar does not show on this screen (the signature on small phones) fades
          // as it travels; it never moves anywhere it is not.
          const target = to ?? { x: from.x, y: from.y, w: from.w, h: from.h };
          const sc = 1 + (target.w / from.w - 1) * t;
          const dx = (target.x - from.x) * t;
          const dy = (target.y - from.y) * t;
          el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${sc.toFixed(5)})`;
          // The emblem belongs to light fields: it rests while the world is dark.
          const o = (to ? 1 : 1 - t) * recede * (name === "mark" ? 1 - dark : 1);
          el.style.opacity = o.toFixed(3);
        }
        if (brand.cue) brand.cue.style.opacity = Math.max(0, 1 - t * 3).toFixed(3);
      }
    }

    // The tone: one set of colours for the current world, inherited by the overlay and the bar.
    tone.el ??= document.querySelector<HTMLElement>("[data-cine-tone]");
    if (tone.el) {
      const L = lightAt(p);
      const ink = inkAt(L);
      const key = `${L.toFixed(3)}:${ink.toFixed(3)}`;
      if (key !== tone.key) {
        tone.key = key;
        for (const r of ROLES) setVar(tone.el, ROLE_VAR[r], mixHex(WORLD[r][0], WORLD[r][1], ink));
        setVar(tone.el, "--dark", (1 - ink).toFixed(3));
        setVar(tone.el, "--light", L.toFixed(3));
      }
    }

    // Film time (the rendered progress, not the raw scroll position).
    if (dom.time) setStyle(dom.time, "transform", `scaleY(${p.toFixed(4)})`);

    // Visible captions, so world labels can step aside instead of colliding with the copy.
    const sizeKey = `${width}x${height}`;
    const shown: { box: Box; o: number }[] = [];
    let veilLow = 0;
    let veilTop = 0;
    for (const c of CAPTIONS) {
      const el = dom.captions.get(c.id);
      if (!el) continue;
      let o = captionOpacity(c, p);
      // The finale composition stages its own parts; the container itself is simply present.
      if (c.kind === "finale") o = o > 0 ? 1 : 0;
      // A reasoning kicker resolves to conviction once the new route holds (violet → champagne).
      if (c.resolveAt && o > 0.002) {
        const at = progressOf(c.resolveAt[0], c.resolveAt[1]);
        const t = Math.min(1, Math.max(0, (p - at) / 0.01 + 0.5));
        const key = (t * t * (3 - 2 * t)).toFixed(2);
        if (marks.get(c.id) !== key) {
          marks.set(c.id, key);
          const dot = el.querySelector<HTMLElement>("[data-kicker-dot]");
          if (dot)
            dot.style.background = `color-mix(in srgb, var(--accent) ${Math.round(Number(key) * 100)}%, var(--violet))`;
        }
      }
      present(el, o, c.kind !== "finale" && p > spanMid(c.span));
      // Statements (not the small context note) calm the frame behind them in the pearl world.
      if (c.place === "low" && c.lines.length > 0) veilLow = Math.max(veilLow, o);
      if (c.place === "top" && c.lines.length > 0) veilTop = Math.max(veilTop, o);
      if (o > 0.02 && c.kind !== "finale") shown.push({ box: boxOf(el, sizeKey), o });
      if (c.kind === "finale") {
        // The finale stages its own parts (identity → line → promise → CTA) from one value.
        const r = Math.min(1, Math.max(0, (p - finaleFrom) / (finaleTo - finaleFrom)));
        const key = r.toFixed(3);
        if (el.dataset.reveal !== key) {
          el.dataset.reveal = key;
          el.style.setProperty("--reveal", key);
        }
        // The CTA is only focusable once it is visibly there.
        const cta = el.querySelector<HTMLElement>("[data-testid=cinematic-cta]");
        if (cta) setStyle(cta, "visibility", r > 0.7 ? "visible" : "hidden");
      }
    }

    const overlay = dom.counter?.parentElement;
    if (overlay) {
      setVar(overlay, "--veil-low", veilLow.toFixed(3));
      setVar(overlay, "--veil-top", veilTop.toFixed(3));
    }

    // The narrowing count: one figure that changes only as a stage completes (360 → 120 → 36 →
    // 9; the three that remain are then named by the statement).
    if (dom.counter) {
      const ph = universePhases(p);
      let k = 0;
      while (k < 3 && ph.stages[k] > 0.5) k++;
      const o = captionOpacity(COUNT, p);
      present(dom.counter, o, p > spanMid(COUNT_SPAN));
      if (o > 0.02) shown.push({ box: boxOf(dom.counter, sizeKey), o });
      count.el ??= dom.counter.querySelector<HTMLElement>("[data-count]");
      const text = String(STAGE_COUNTS[k]);
      if (count.el && count.value !== text) {
        const changed = count.value !== "";
        count.value = text;
        count.el.textContent = text;
        // Each new figure rises into place rather than snapping — briefly in the reasoning
        // violet, then resolved (not under ?freeze). No glow.
        if (changed && animate && o > 0.02)
          count.el.animate?.(
            [
              { opacity: 0, transform: "translateY(0.12em)", color: WORLD.violet[0] },
              { opacity: 1, transform: "none", color: WORLD.ink[0] },
            ],
            { duration: 720, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
          );
      }
    }

    // Labels follow their world anchors. Earlier labels (copy order) keep their place; a later
    // label that would overlap one already shown yields, softly, by how much it would cover.
    const cam = state.camera;
    const placed: { l: number; t: number; r: number; b: number }[] = [];
    for (const [id, el] of dom.anchors) {
      const a = s.anchors.get(id);
      if (!a || a.o <= 0.002) {
        show(el, 0);
        continue;
      }
      scratch.v.set(a.x, a.y, a.z).project(cam);
      const behind = scratch.v.z > 1 || scratch.v.z < -1;
      const x = (scratch.v.x * 0.5 + 0.5) * width;
      const y = (-scratch.v.y * 0.5 + 0.5) * height;
      const inside =
        x > -80 &&
        x < width + 80 &&
        y - (labelHeight.get(el) ?? 0) > NAV_CLEARANCE &&
        y < height + 40;
      // Phones keep the stage captions clear: milestone tags are left to the narrative there.
      const crowded = width < 640 && id.startsWith("milestone-");
      // Labels never clip at the screen edge (their size is measured once — text is fixed).
      let half = labelHalf.get(el);
      if (half === undefined && a.o > 0.002) {
        const body = el.firstElementChild as HTMLElement | null;
        half = body ? body.offsetWidth / 2 : 0;
        labelHalf.set(el, half);
        labelHeight.set(el, body ? body.offsetHeight : 0);
      }
      const cx = Math.min(Math.max(x, (half ?? 0) + 14), width - (half ?? 0) - 14);
      // …and never sit under a caption: they yield as the copy appears.
      let o = behind || !inside || crowded ? 0 : a.o;
      if (o > 0) {
        const h = labelHeight.get(el) ?? 0;
        const hw = half ?? 0;
        for (const { box, o: co } of shown) {
          const m = 10;
          if (cx + hw > box.l - m && cx - hw < box.r + m && y > box.t - m && y - h < box.b + m)
            o *= 1 - co;
        }
        for (const q of placed) {
          const ox = Math.min(cx + hw, q.r) - Math.max(cx - hw, q.l) + 6;
          const oy = Math.min(y, q.b) - Math.max(y - h, q.t) + 4;
          if (ox > 0 && oy > 0) o *= 1 - Math.min(1, ox / 18) * Math.min(1, oy / 8);
        }
        if (o > 0.3) placed.push({ l: cx - hw, t: y - h, r: cx + hw, b: y });
      }
      show(el, o);
      setStyle(el, "transform", `translate3d(${cx.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);
    }

    // The product panel: mapped onto the slab while it is 3D, released once it faces the screen.
    const panel = dom.panel;
    if (panel) {
      const slab = s.slab;
      if (!warmUntil.t) warmUntil.t = performance.now() + 1500;
      // Not under ?freeze (tests, review frames): there the panel stays strictly hidden until its scene.
      const warming = animate && performance.now() < warmUntil.t;
      const o = slab.visible ? slab.dom : 0;
      if (warming && o < 0.001) {
        setStyle(panel, "opacity", "0.001");
        setStyle(panel, "visibility", "visible");
      } else show(panel, o);
      if (o > 0.002 || warming) {
        scratch.m.fromArray(slab.matrix);
        const hw = SLAB.width / 2;
        const hh = SLAB.height / 2;
        const z = SLAB.depth / 2 + 0.01;
        const pts: [number, number, number][] = [
          [-hw, hh, z],
          [hw, hh, z],
          [hw, -hh, z],
          [-hw, -hh, z],
        ];
        const quad = pts.map(([x, y, zz], i) => {
          const c = scratch.corners[i].set(x, y, zz).applyMatrix4(scratch.m).project(cam);
          return [(c.x * 0.5 + 0.5) * width, (-c.y * 0.5 + 0.5) * height] as [number, number];
        });
        const w = panel.offsetWidth || 1;
        const h = panel.offsetHeight || 1;
        // Phones: the slab is too small to carry the panel — it arrives centred, full width.
        setStyle(
          panel,
          "transform",
          width < 640
            ? `translate3d(${((width - w) / 2).toFixed(1)}px, ${((height - h) / 2 + 20 + (1 - o) * 26).toFixed(1)}px, 0) scale(${(0.82 + 0.18 * o).toFixed(4)})`
            : `matrix3d(${quadToMatrix3d(w, h, quad)
                .map((n) => n.toFixed(6))
                .join(",")})`,
        );
      }
      setStyle(panel, "pointerEvents", slab.released && o > 0.95 ? "auto" : "none");
      if (panel.inert !== !(slab.released && o > 0.95)) panel.inert = !(slab.released && o > 0.95);
    }
  });

  return null;
}
