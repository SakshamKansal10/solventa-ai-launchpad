import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Matrix4, Vector3 } from "three";

import { progressOf, ramp } from "../timeline/timeline";
import { quadToMatrix3d, SLAB } from "../world/product/product-model";
import { STAGE_COUNTS } from "../world/universe/universe-model";
import { universePhases } from "../world/universe/universe-state";
import { useWorld } from "../world/WorldContext";
import { CAPTIONS, captionOpacity, COUNT_SPAN, type Caption } from "./copy";
import { PEARL, STAGE, TONE, VIOLET } from "./palette";

/** The count fades like a statement over its own span. */
const COUNT: Caption = {
  id: "count",
  kind: "statement",
  text: "",
  span: COUNT_SPAN,
  place: "title",
};
/** World labels stay below the site bar (its height plus a margin). */
const NAV_CLEARANCE = 96;

/** The statements' own legibility shadow (kept under the count's brief violet edge). */
const SHADOWS = "0 2px 30px rgba(5,8,14,0.9), 0 1px 2px rgba(5,8,14,0.55)";

/** Mixes two #rrggbb colours (t 0 → 1). */
function mixHex(a: string, b: string, t: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((ca >> shift) & 255) + (((cb >> shift) & 255) - ((ca >> shift) & 255)) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

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
  const finaleFrom = progressOf("finale", 0.38);
  const nav = useMemo(() => ({ el: null as HTMLElement | null, value: "" }), []);
  const finaleTo = progressOf("finale", 0.78);
  /** Per caption: the stage last lit, the kicker tone last written. */
  const marks = useMemo(() => new Map<string, string>(), []);

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

    // Film time (the rendered progress, not the raw scroll position).
    if (dom.time) setStyle(dom.time, "transform", `scaleY(${p.toFixed(4)})`);

    // Visible captions, so world labels can step aside instead of colliding with the copy.
    const sizeKey = `${width}x${height}`;
    const shown: { box: Box; o: number }[] = [];
    for (const c of CAPTIONS) {
      const el = dom.captions.get(c.id);
      if (!el) continue;
      let o = captionOpacity(c, p);
      if (c.id === "void" && p < progressOf("void", 0.12)) o = 1;
      // The finale composition stages its own parts; the container itself is simply present.
      if (c.kind === "finale") o = o > 0 ? 1 : 0;
      // Validate · Build · Elevate: only the stage being travelled is lit.
      if (c.stages && o > 0.002) {
        let at = 0;
        c.stages.forEach((st, i) => {
          if (p >= progressOf(st.scene, 0)) at = i;
        });
        const key = String(at);
        if (marks.get(c.id) !== key) {
          marks.set(c.id, key);
          el.querySelectorAll<HTMLElement>("[data-stage]").forEach((sp) => {
            const i = Number(sp.dataset.stage);
            sp.style.color = i === at ? STAGE.active : i < at ? STAGE.done : STAGE.ahead;
          });
        }
      }
      // A reasoning kicker resolves to conviction once the new route holds (violet → champagne).
      if (c.resolveAt && o > 0.002) {
        const at = progressOf(c.resolveAt[0], c.resolveAt[1]);
        const t = Math.min(1, Math.max(0, (p - at) / 0.01 + 0.5));
        const key = t.toFixed(2);
        if (marks.get(c.id) !== key) {
          marks.set(c.id, key);
          const dot = el.querySelector<HTMLElement>("[data-kicker-dot]");
          if (dot) {
            const col = mixHex(TONE.violet, TONE.gold, t * t * (3 - 2 * t));
            dot.style.background = col;
            dot.style.boxShadow = `0 0 10px ${col}66`;
          }
        }
      }
      show(el, o);
      if (o > 0.02 && c.kind !== "finale") shown.push({ box: boxOf(el, sizeKey), o });
      setStyle(el, "transform", `translate3d(0, ${((1 - o) * 10).toFixed(1)}px, 0)`);
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
        if (cta) setStyle(cta, "visibility", r > 0.62 ? "visible" : "hidden");
      }
    }

    // The narrowing count: one figure that changes only as a stage completes.
    if (dom.counter) {
      const ph = universePhases(p);
      let k = 0;
      while (k < 5 && ph.stages[k] > 0.5) k++;
      const o = captionOpacity(COUNT, p);
      show(dom.counter, o);
      setStyle(dom.counter, "transform", `translate3d(0, ${((1 - o) * 10).toFixed(1)}px, 0)`);
      if (o > 0.02) shown.push({ box: boxOf(dom.counter, sizeKey), o });
      count.el ??= dom.counter.querySelector<HTMLElement>("[data-count]");
      const text = String(STAGE_COUNTS[k]);
      if (count.el && count.value !== text) {
        const changed = count.value !== "";
        count.value = text;
        count.el.textContent = text;
        // Each new figure settles in rather than snapping, catching a brief violet edge while the
        // filter works, then returning to pearl (not under ?freeze).
        if (changed && animate && o > 0.02)
          count.el.animate?.(
            [
              {
                opacity: 0.25,
                transform: "translateY(0.08em)",
                color: "#C9C3F7",
                textShadow: `0 0 22px ${VIOLET}80, ${SHADOWS}`,
              },
              {
                opacity: 1,
                transform: "none",
                color: PEARL,
                textShadow: `0 0 22px ${VIOLET}00, ${SHADOWS}`,
              },
            ],
            { duration: 640, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
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
