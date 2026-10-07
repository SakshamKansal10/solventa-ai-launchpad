import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  DynamicDrawUsage,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type Material,
} from "three";

import { progressOf, ramp } from "../../timeline/timeline";
import { useWorld } from "../WorldContext";
import { buildFamilies } from "./families";
import { FINALS_HUB } from "../layout";
import { Territories } from "./Territories";
import { CONVERGE_ANCHOR, createUniverse, TRUNK_ORIGIN } from "./universe-model";
import { createNodeFrame, nodeFrame, universePhases } from "./universe-state";

const PARTS = ["seed", "frame", "pearl", "glass", "energy"] as const;
/** Aligned = one shared, designed three-quarter attitude (never flat-on to the lens). */
const ALIGNED = new Quaternion().setFromEuler(new Euler(-0.22, 0.62, 0.08));
const WARM = new Color("#f0cf94");
const COOL = new Color("#7f72e6");

/**
 * The Opportunity Universe: every rendered opportunity as five instanced parts
 * (5 families × 5 parts = 25 draw calls whatever the count), plus its
 * connections in the shared gold filament system. All state comes from
 * universe-state.ts — a pure function of scroll.
 */
export function OpportunityUniverse() {
  const { store, materials, filaments, preset, animate } = useWorld();
  const model = useMemo(() => createUniverse(preset.universeCount), [preset.universeCount]);
  const families = useMemo(() => buildFamilies(), []);
  useEffect(
    () => () => {
      for (const f of families) for (const g of Object.values(f)) g.dispose();
    },
    [families],
  );

  const slots = useMemo(() => {
    const byFamily: number[][] = [[], [], [], [], []];
    const slotOf = new Int32Array(model.opportunities.length).fill(-1);
    for (const i of model.rendered) {
      const f = model.opportunities[i].family;
      slotOf[i] = byFamily[f].length;
      byFamily[f].push(i);
    }
    return { byFamily, slotOf };
  }, [model]);

  const frames = useMemo(() => model.opportunities.map(() => createNodeFrame()), [model]);
  const tilts = useMemo(
    () => model.opportunities.map((o) => new Quaternion().setFromEuler(new Euler(...o.tilt))),
    [model],
  );
  const fil = useMemo(
    () => filaments.range("universe", model.connections.length),
    [filaments, model],
  );
  const ring = useMemo(() => filaments.range("nine-ring", 10), [filaments]);
  /** The nine survivors in ring order (by angle around the finals hub). */
  const nine = useMemo(
    () =>
      [...model.formations.nine.entries()]
        .sort(
          (x, y) =>
            Math.atan2(x[1][1] - FINALS_HUB[1], x[1][0] - FINALS_HUB[0]) -
            Math.atan2(y[1][1] - FINALS_HUB[1], y[1][0] - FINALS_HUB[0]),
        )
        .map(([i]) => i),
    [model],
  );
  const meshes = useRef<(InstancedMesh | null)[]>([]);
  const group = useRef<Group>(null);
  const scratch = useMemo(
    () => ({
      m: new Matrix4(),
      q: new Quaternion(),
      spin: new Quaternion(),
      pos: new Vector3(),
      scl: new Vector3(),
      color: new Color(),
      zero: new Matrix4().makeScale(0, 0, 0),
      yAxis: new Vector3(0, 1, 0),
    }),
    [],
  );

  useLayoutEffect(() => {
    meshes.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, scratch.zero);
    });
    for (let f = 0; f < 5; f++) {
      const energy = meshes.current[f * 5 + 4];
      if (!energy) continue;
      for (let i = 0; i < energy.count; i++) energy.setColorAt(i, COOL);
      energy.instanceColor?.setUsage(DynamicDrawUsage);
    }
  }, [model, scratch]);

  const showFrom = progressOf("passage", 0.36);
  const showTo = progressOf("unfold", 1);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = store.state;
    const p = s.progress;
    const active = p > showFrom && p < showTo;
    g.visible = active;
    if (!active) {
      filaments.hideRange(fil);
      filaments.hideRange(ring);
      s.renderer.nodes = 0;
      return;
    }
    const t = animate ? s.time : 0;
    const ph = universePhases(p);
    let liveNodes = 0;
    for (const i of model.rendered) {
      if (nodeFrame(model.opportunities[i], model, ph, frames[i]).visible) liveNodes++;
    }
    s.renderer.nodes = liveNodes;

    const { m, q, spin, pos, scl, color, zero, yAxis } = scratch;
    for (let f = 0; f < 5; f++) {
      const list = slots.byFamily[f];
      const parts = PARTS.map((_, k) => meshes.current[f * 5 + k]);
      if (!parts[0]) continue;
      // Compaction: visible nodes are packed to the front and `count` trimmed, so
      // hidden ones cost nothing on the GPU (zero-scale instances still would).
      let slot = 0;
      for (let n = 0; n < list.length; n++) {
        const i = list[n];
        const nf = frames[i];
        if (!nf.visible) continue;
        // Uncertain structures hover a little on their own axis; aligned ones are still.
        spin.setFromAxisAngle(yAxis, Math.sin(t * 0.3 + i) * 0.28 * (1 - nf.align));
        q.slerpQuaternions(tilts[i], ALIGNED, nf.align).multiply(spin);
        pos.set(nf.x, nf.y, nf.z);
        scl.setScalar(nf.scale);
        m.compose(pos, q, scl);
        parts[0]!.setMatrixAt(slot, m);
        parts[1]!.setMatrixAt(slot, m);
        parts[4]!.setMatrixAt(slot, m);
        // Confidence = ceramic; uncertainty = glass. Same shell, two materials.
        scl.setScalar(nf.scale * 0.9 * Math.max(nf.solid, 0.0001));
        m.compose(pos, q, scl);
        parts[2]!.setMatrixAt(slot, nf.solid > 0.01 ? m : zero);
        scl.setScalar(nf.scale * 1.03 * (1 - nf.solid));
        m.compose(pos, q, scl);
        parts[3]!.setMatrixAt(slot, nf.solid < 0.99 ? m : zero);
        color
          .copy(COOL)
          .lerp(WARM, nf.warm)
          .multiplyScalar(nf.energy * 2.8);
        parts[4]!.setColorAt(slot, color);
        slot++;
      }
      for (const part of parts) {
        if (!part) continue;
        part.count = slot;
        part.instanceMatrix.needsUpdate = true;
      }
      if (parts[4]?.instanceColor) parts[4].instanceColor.needsUpdate = true;
    }

    // Connections: trunks from the core, branches inside territories, strands into the dark.
    model.connections.forEach((c, j) => {
      const idx = fil.start + j;
      const A = c.a >= 0 ? frames[c.a] : null;
      const B = c.b >= 0 ? frames[c.b] : null;
      if ((A && !A.visible) || (B && !B.visible)) {
        filaments.hide(idx);
        return;
      }
      const ax = A ? A.x : TRUNK_ORIGIN[0];
      const ay = A ? A.y : TRUNK_ORIGIN[1];
      const az = A ? A.z : TRUNK_ORIGIN[2];
      const bx = B ? B.x : c.far![0];
      const by = B ? B.y : c.far![1];
      const bz = B ? B.z : c.far![2];
      const len = Math.hypot(bx - ax, by - ay, bz - az);
      const grow =
        c.kind === "trunk" ? ph.trunkGrow : ph.branchGrow * (A ? Math.min(1, A.energy * 3) : 1);
      // CONFLICT retracts toward the source; a stage's fallen nodes retract fully.
      const conflict = Math.max(B?.conflict ?? 0, (A?.conflict ?? 0) * 0.6);
      const falling = Math.max(A?.falling ?? 0, B?.falling ?? 0);
      // Order takes over: the territories' own architecture retracts as survivors regroup.
      const regroup = c.kind === "trunk" ? ph.stages[2] : ph.stages[1];
      const s1 = grow * (1 - 0.85 * conflict) * (1 - falling) * (1 - regroup);
      if (s1 <= 0.002) {
        filaments.hide(idx);
        return;
      }
      const eA = A ? A.energy : 1.1;
      const eB = B ? B.energy : 0.5;
      const relevance = Math.min(A?.warm ?? 1, B?.warm ?? 1);
      // Each context wave lights the connection as its front passes the midpoint.
      const mid = Math.hypot(
        (ax + bx) / 2 - TRUNK_ORIGIN[0],
        (ay + by) / 2 - TRUNK_ORIGIN[1],
        (az + bz) / 2 - TRUNK_ORIGIN[2],
      );
      let wave = 0;
      for (const front of ph.waves) {
        const d = (front - mid) / 7;
        if (front > 0 && front < 96) wave += Math.exp(-d * d);
      }
      filaments.arc(
        idx,
        ax,
        ay,
        az,
        bx,
        by,
        bz,
        (c.phase - 0.5) * len * 0.16,
        len * (0.06 + c.phase * 0.08),
        0,
      );
      const base = c.kind === "trunk" ? 0.55 : c.kind === "dark" ? 0.38 : 0.58;
      // Hierarchical weighting: high-value routes dominate, weak ones fade to almost nothing.
      const value = Math.min(1, Math.min(eA, eB) / 1.4);
      // Selective: weak links are not drawn at all — the network shows only what matters.
      if (c.kind !== "trunk" && value < 0.3 && wave < 0.2) {
        filaments.hide(idx);
        return;
      }
      filaments.params(idx, {
        s1,
        width: c.width * (c.kind === "trunk" ? 1 : 0.55 + 1.25 * Math.pow(value, 1.5)),
        intensity:
          base *
          (c.kind === "trunk" ? 1 : 0.18 + 1.1 * Math.pow(value, 1.4)) *
          Math.min(1.2, 0.35 + (eA + eB) * 0.45) *
          (1 + relevance * 0.7 + wave * 0.9) *
          (1 - ph.fadeOut),
        pulse: c.kind === "trunk" ? 0.8 : 0.35 + relevance * 0.6,
        phase: c.phase,
        violet: Math.min(1, wave * 0.9),
        speed: c.kind === "trunk" ? 0.14 : 0.1,
      });
    });

    // The nine as a lattice: each column ranked upward into its head, the three heads joined in
    // gold — structure replacing the scattered network.
    const ringGrow = ph.stages[2] * (1 - ramp(p, "three", 0.06, "three", 0.24));
    const links = model.formations.nineLinks;
    for (let j = 0; j < 9; j++) {
      const idx = ring.start + j;
      const pair = links[j];
      const A = pair ? frames[pair[0]] : null;
      const B = pair ? frames[pair[1]] : null;
      if (!A || !B || ringGrow <= 0.002 || !A.visible || !B.visible) {
        filaments.hide(idx);
        continue;
      }
      const heads = j >= 6;
      filaments.arc(idx, A.x, A.y, A.z, B.x, B.y, B.z, 0, heads ? 0.6 : 0, 0);
      filaments.params(idx, {
        s1: ringGrow,
        width: heads ? 0.05 : 0.032,
        intensity: (heads ? 1 : 0.55) * ringGrow,
        violet: heads ? 0 : 0.6,
        pulse: 0.9,
        phase: j / 9,
        speed: 0.12,
      });
    }
    // 120 → 36: the survivors line up on one gold DECISION AXIS (the ranked board's centre row).
    {
      const idx = ring.start + 9;
      const axis = ph.stages[1] * (1 - ph.stages[2]);
      if (axis <= 0.002) filaments.hide(idx);
      else {
        const [x, y, z] = CONVERGE_ANCHOR;
        filaments.arc(idx, x - 12.5, y, z + 1.2, x + 12.5, y, z + 1.2);
        filaments.params(idx, {
          s0: 0.5 - 0.5 * axis,
          s1: 0.5 + 0.5 * axis,
          width: 0.05,
          intensity: 1.1 * axis,
          pulse: 1,
          speed: 0.2,
        });
      }
    }
  });

  const partMaterial = (k: number): Material =>
    [materials.graphite, materials.titanium, materials.pearl, materials.smoked, materials.energy][
      k
    ];

  return (
    <>
      <Territories model={model} />
      <group ref={group}>
        {families.map((geo, f) => {
          const count = slots.byFamily[f].length;
          if (!count) return null;
          return PARTS.map((part, k) => (
            <instancedMesh
              key={`${f}-${part}-${count}`}
              ref={(el) => {
                meshes.current[f * 5 + k] = el;
              }}
              args={[
                geo[
                  k === 3
                    ? "shell"
                    : k === 2
                      ? "shell"
                      : part === "seed"
                        ? "seed"
                        : part === "frame"
                          ? "frame"
                          : "energy"
                ],
                partMaterial(k),
                count,
              ]}
              frustumCulled={false}
              renderOrder={k === 3 ? 2 : 0}
            />
          ));
        })}
      </group>
    </>
  );
}
