import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  DynamicDrawUsage,
  Euler,
  LatheGeometry,
  Matrix4,
  OctahedronGeometry,
  Quaternion,
  Vector2,
  Vector3,
  type Group,
  type InstancedMesh,
} from "three";

import { mulberry32, smoothstep } from "../../math";
import { local, ramp } from "../../timeline/timeline";
import { arcPoints, roundedRect, sweep } from "../geometry/sweep";
import { TRUNK_ORIGIN } from "../universe/universe-model";
import { useWorld } from "../WorldContext";
import { SIDE_FINALISTS } from "./finalists-model";
import { WINNER_POS } from "./path-model";

const RIBS = 11;

/** Rib i's pose in its sculpture (local to the sculpture centre). */
function ribPose(form: "vane" | "helix", i: number, out: Matrix4) {
  const e = new Euler();
  const pos = new Vector3();
  if (form === "vane") {
    // A fan of curved vanes opening from a hub, like a shell's ribs.
    const a = -1.2 + (i / (RIBS - 1)) * 2.4;
    e.set(0.25, 0, a);
    pos.set(Math.sin(a) * 0.6, Math.cos(a) * 0.6 - 0.4, (i % 2) * 0.35);
  } else {
    // A rising helix of ribs.
    const a = i * 0.62;
    e.set(0.5, a, 0.35);
    pos.set(Math.cos(a) * 1.1, -2.4 + i * 0.48, Math.sin(a) * 1.1);
  }
  return out.compose(pos, new Quaternion().setFromEuler(e), new Vector3(1, 1, 1));
}

export function Finalists() {
  const { store, materials, filaments } = useWorld();
  const rib = useMemo(
    () =>
      sweep(
        arcPoints(2.2, -0.9, 0.9, 9).map((v) => new Vector3(v.y, v.x - 2.2, 0)),
        roundedRect(0.16, 0.62, 0.06, 3),
        {
          segments: 20,
          up: new Vector3(0, 0, 1),
          taper: (u) => 0.45 + 0.55 * Math.sin(Math.PI * u),
        },
      ),
    [],
  );
  const hub = useMemo(() => new OctahedronGeometry(0.55, 0), []);
  const ring = useMemo(
    () =>
      new LatheGeometry(
        [
          [0.7, -0.1],
          [0.8, -0.1],
          [0.83, 0],
          [0.8, 0.1],
          [0.7, 0.1],
        ].map(([x, y]) => new Vector2(x, y)),
        36,
      ),
    [],
  );
  useEffect(
    () => () => {
      rib.dispose();
      hub.dispose();
      ring.dispose();
    },
    [rib, hub, ring],
  );
  const pearl = useRef<InstancedMesh>(null);
  const glass = useRef<InstancedMesh>(null);
  const hubs = useRef<InstancedMesh>(null);
  const rings = useRef<InstancedMesh>(null);
  const group = useRef<Group>(null);
  const fil = useMemo(() => filaments.range("finalists", 6), [filaments]);
  const poses = useMemo(
    () =>
      SIDE_FINALISTS.map((f) =>
        Array.from({ length: RIBS }, (_, i) => ribPose(f.form, i, new Matrix4())),
      ),
    [],
  );
  const drift = useMemo(() => {
    const r = mulberry32(77);
    return Array.from({ length: RIBS * 2 }, () => [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
  }, []);
  const scratch = useMemo(
    () => ({
      m: new Matrix4(),
      c: new Matrix4(),
      q: new Quaternion(),
      v: new Vector3(),
      s: new Vector3(),
      e: new Euler(),
      col: new Color(),
      zero: new Matrix4().makeScale(0, 0, 0),
    }),
    [],
  );

  useLayoutEffect(() => {
    for (const mesh of [pearl.current, glass.current, hubs.current, rings.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, scratch.zero);
    }
    for (const mesh of [pearl.current, glass.current]) {
      if (!mesh) continue;
      for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, scratch.col.setScalar(1));
      mesh.instanceColor?.setUsage(DynamicDrawUsage);
    }
  }, [scratch]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = store.state;
    const p = s.progress;
    const three = local(p, "three");
    const emerge = smoothstep(0.04, 0.3, three);
    const lose = ramp(p, "selection", 0.32, "selection", 0.85);
    const gone = ramp(p, "unfold", 0.0, "unfold", 0.45);
    const active = emerge > 0 && gone < 1;
    g.visible = active;
    if (!active) {
      filaments.hideRange(fil);
      return;
    }
    const { m, c, q, v, s: sc, e, col, zero } = scratch;
    SIDE_FINALISTS.forEach((f, k) => {
      // The sculpture turns slowly while it is a candidate, then stops.
      e.set(0, 0.35 + three * 0.5 * (k ? -1 : 1), 0);
      q.setFromEuler(e);
      v.set(f.centre[0], f.centre[1], f.centre[2] - gone * 10);
      sc.setScalar(1.35 * emerge * (1 - 0.35 * gone));
      c.compose(v, q, sc);
      for (let i = 0; i < RIBS; i++) {
        const slot = k * RIBS + i;
        const d = drift[slot];
        // Losing coherence: ribs drift apart and turn away from one another.
        const loose = lose * (0.6 + (0.4 * ((i * 7) % 5)) / 5);
        e.set(d[0] * loose * 0.9, d[1] * loose * 1.1, d[2] * loose * 0.7);
        m.copy(poses[k][i]);
        m.multiply(new Matrix4().makeRotationFromEuler(e));
        m.setPosition(
          new Vector3()
            .setFromMatrixPosition(poses[k][i])
            .add(new Vector3(d[0], d[1], d[2]).multiplyScalar(loose * 2.6)),
        );
        m.premultiply(c);
        const solid = (0.55 + 0.45 * emerge) * (1 - lose) * (1 - gone);
        pearl.current?.setMatrixAt(slot, solid > 0.01 ? m : zero);
        glass.current?.setMatrixAt(slot, m);
        pearl.current?.setColorAt(slot, col.setScalar(solid));
        glass.current?.setColorAt(slot, col.setScalar((1 - solid) * (1 - gone)));
      }
      hubs.current?.setMatrixAt(k, c);
      rings.current?.setMatrixAt(k, c);
    });
    for (const mesh of [pearl.current, glass.current, hubs.current, rings.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Solventia compares all three at once: gold pathways circulate between them;
    // then the two losing links retract and the one aligns with the core's system.
    const compare = ramp(p, "three", 0.55, "selection", 0.2);
    const centres: [number, number, number][] = [
      [...SIDE_FINALISTS[0].centre],
      [WINNER_POS[0], WINNER_POS[1] + 0.9, WINNER_POS[2]],
      [...SIDE_FINALISTS[1].centre],
    ];
    const pairs: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 0],
    ];
    pairs.forEach(([a, b], j) => {
      const idx = fil.start + j;
      const toWinner = a === 1 || b === 1;
      const keep = toWinner ? 1 - lose * 0.4 : 1 - lose;
      const s1 = compare * keep * (1 - gone);
      if (s1 <= 0.01) {
        filaments.hide(idx);
        return;
      }
      const A = centres[a];
      const B = centres[b];
      filaments.arc(idx, A[0], A[1], A[2], B[0], B[1], B[2], 0, 2.2, 0);
      filaments.params(idx, {
        s1,
        width: 0.06,
        intensity: 0.9 * keep,
        pulse: 1.4,
        phase: j / 3,
        speed: 0.35,
      });
    });
    // The one aligns with the core's gold intelligence: a long filament from the trunk origin.
    const align =
      ramp(p, "selection", 0.4, "selection", 0.9) * (1 - ramp(p, "unfold", 0.3, "unfold", 0.7));
    const idx = fil.start + 3;
    if (align > 0.01) {
      filaments.arc(
        idx,
        TRUNK_ORIGIN[0],
        TRUNK_ORIGIN[1],
        TRUNK_ORIGIN[2],
        centres[1][0],
        centres[1][1],
        centres[1][2],
        0,
        6,
        0,
      );
      filaments.params(idx, {
        s1: align,
        width: 0.07,
        intensity: 1.1,
        pulse: 1.2,
        phase: 0.1,
        speed: 0.22,
      });
    } else filaments.hide(idx);
    filaments.hide(fil.start + 4);
    filaments.hide(fil.start + 5);

    // Labels: each future is named while it is a candidate; the two fade as they lose coherence.
    const named = smoothstep(0.2, 0.4, three) * (1 - ramp(p, "unfold", 0.05, "unfold", 0.3));
    centres.forEach((c3, k) => {
      const o = named * (k === 1 ? 1 : 1 - lose);
      s.anchors.set(`finalist-${k}`, { x: c3[0], y: c3[1] + (k === 1 ? 4 : 4.6), z: c3[2], o });
    });
  });

  return (
    <group ref={group}>
      <instancedMesh
        ref={pearl}
        args={[rib, materials.pearlDissolve, RIBS * 2]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={glass}
        args={[rib, materials.glassDissolve, RIBS * 2]}
        frustumCulled={false}
        renderOrder={2}
      />
      <instancedMesh ref={hubs} args={[hub, materials.midnight, 2]} frustumCulled={false} />
      <instancedMesh ref={rings} args={[ring, materials.champagne, 2]} frustumCulled={false} />
    </group>
  );
}
