import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Euler,
  Matrix4,
  Quaternion,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { mulberry32, smoothstep } from "../../math";
import { local, ramp } from "../../timeline/timeline";
import { frameGeometry, plateGeometry } from "../geometry/frames";
import { FINALS_HUB } from "../layout";
import { TRUNK_ORIGIN } from "../universe/universe-model";
import { useWorld } from "../WorldContext";
import { SIDE_FINALISTS } from "./finalists-model";
import { WINNER_POS } from "./path-model";

/**
 * The two futures that are NOT chosen, each its own architecture:
 *   Direction 01 — a strata tower: framed smoked-glass levels stacked on a
 *                  spindle, each level turned a few degrees (vertical logic).
 *   Direction 03 — an orbital array: machined modules on a precision ring
 *                  around a spindle (radial logic).
 * (Direction 02, the one, is the nest of portal frames in ExecutionPath.)
 *
 * Solventia compares all three at once: the founder's six fit signals run into
 * each. On the two losers some signals cannot hold — they retract — and the
 * structure loses coherence: pieces drift apart, metal turns to glass, lights
 * go out. Pure functions of progress.
 */
type GeoKey = "level" | "pane" | "module" | "face" | "spindle" | "orbit" | "light";
interface Piece {
  geo: GeoKey;
  matrix: Matrix4;
}

const LEVELS = 9;
const MODULES = 10;
/** Which founder signals a losing future cannot satisfy (capital, skills, location, time, experience, access). */
const FAILS = [
  [0, 5],
  [3, 4],
];

const compose = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) =>
  new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromEuler(new Euler(rx, ry, rz)),
    new Vector3(s, s, s),
  );

function towerPieces(): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < LEVELS; i++) {
    const y = -2.2 + i * 0.55;
    const turn = i * 0.13;
    out.push({ geo: "level", matrix: compose(0, y, 0, -Math.PI / 2, 0, turn) });
    out.push({ geo: "pane", matrix: compose(0, y, 0, -Math.PI / 2, 0, turn) });
    out.push({
      geo: "light",
      matrix: compose(1.3 * Math.cos(turn), y + 0.1, -1.3 * Math.sin(turn), 0, turn, 0, 0.1),
    });
  }
  out.push({ geo: "spindle", matrix: compose(0, 0, 0) });
  return out;
}

function arrayPieces(): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < MODULES; i++) {
    const a = (i / MODULES) * Math.PI * 2;
    const x = Math.cos(a) * 2.3;
    const z = Math.sin(a) * 2.3;
    out.push({ geo: "module", matrix: compose(x, 0, z, 0, -a, 0) });
    out.push({ geo: "face", matrix: compose(x * 1.09, 0, z * 1.09, 0, Math.PI / 2 - a, 0) });
    out.push({ geo: "light", matrix: compose(x * 1.16, 0.22, z * 1.16, 0, -a, 0, 0.09) });
  }
  out.push({ geo: "orbit", matrix: compose(0, 0, 0, Math.PI / 2, 0, 0) });
  out.push({ geo: "spindle", matrix: compose(0, 0, 0, 0, 0, 0, 0.8) });
  return out;
}

export function Finalists() {
  const { store, materials, filaments } = useWorld();
  const geos = useMemo<Record<GeoKey, BufferGeometry>>(() => {
    const level = frameGeometry({ hw: 1.5, hh: 1.5, bar: 0.11, depth: 0.12, radius: 0.34 });
    const pane = plateGeometry(1.38, 1.38, 0.03, 0.26, 0);
    const module = new RoundedBoxGeometry(0.42, 0.62, 0.9, 2, 0.06);
    const face = plateGeometry(0.4, 0.26, 0.03, 0.06, 0);
    const spindle = new CylinderGeometry(0.09, 0.09, 5.6, 16);
    const orbit = new TorusGeometry(2.3, 0.04, 10, 96);
    const light = new BoxGeometry(1, 1, 1);
    return { level, pane, module, face, spindle, orbit, light };
  }, []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const pieces = useMemo(() => [towerPieces(), arrayPieces()], []);
  /** Per geometry: [solid material, provisional material | null]. Lights are tinted per instance. */
  const plan = useMemo<Record<GeoKey, [Material, Material | null]>>(
    () => ({
      level: [materials.titaniumDissolve, materials.smokedDissolve],
      pane: [materials.smoked, null],
      module: [materials.titaniumDissolve, materials.smokedDissolve],
      face: [materials.smoked, null],
      spindle: [materials.graphite, null],
      orbit: [materials.titaniumDissolve, materials.smokedDissolve],
      light: [materials.energy, null],
    }),
    [materials],
  );
  const capacity = useMemo(() => {
    const c = {} as Record<GeoKey, number>;
    for (const list of pieces) for (const pc of list) c[pc.geo] = (c[pc.geo] ?? 0) + 1;
    return c;
  }, [pieces]);
  const solid = useRef<Partial<Record<GeoKey, InstancedMesh | null>>>({});
  const glass = useRef<Partial<Record<GeoKey, InstancedMesh | null>>>({});
  const group = useRef<Group>(null);
  const fil = useMemo(() => filaments.range("finalists", 24), [filaments]);
  const drift = useMemo(() => {
    const r = mulberry32(77);
    return pieces.map((list) => list.map(() => [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]));
  }, [pieces]);
  const scratch = useMemo(
    () => ({
      m: new Matrix4(),
      c: new Matrix4(),
      d: new Matrix4(),
      q: new Quaternion(),
      v: new Vector3(),
      s: new Vector3(),
      e: new Euler(),
      col: new Color(),
      violet: new Color("#7d6ff0"),
      gold: new Color("#f0cf8c"),
    }),
    [],
  );

  useLayoutEffect(() => {
    for (const mesh of [...Object.values(solid.current), ...Object.values(glass.current)]) {
      if (!mesh) continue;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
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
    const lose = ramp(p, "selection", 0.28, "selection", 0.85);
    const gone = ramp(p, "unfold", 0.0, "unfold", 0.45);
    const active = emerge > 0 && gone < 1;
    g.visible = active;
    if (!active) {
      filaments.hideRange(fil);
      // A jump out of the scene must not leave a label behind.
      for (let k = 0; k < 3; k++) s.anchors.set(`finalist-${k}`, { x: 0, y: 0, z: 0, o: 0 });
      return;
    }
    const { m, c, d, q, v, s: sc, e, col, violet, gold } = scratch;
    const counts: Partial<Record<GeoKey, [number, number]>> = {};
    SIDE_FINALISTS.forEach((f, k) => {
      // Each future turns slowly while it is a candidate, then stops.
      e.set(0, 0.4 + three * 0.55 * (k ? -1 : 1), k ? 0.18 : -0.08);
      q.setFromEuler(e);
      v.set(f.centre[0], f.centre[1], f.centre[2] - gone * 10);
      sc.setScalar(1.3 * emerge * (1 - 0.35 * gone));
      c.compose(v, q, sc);
      pieces[k].forEach((pc, i) => {
        const dv = drift[k][i];
        // Losing coherence: pieces separate along their own axes, turning away.
        const loose = lose * (0.55 + 0.45 * (((i * 7) % 5) / 5));
        e.set(dv[0] * loose * 0.7, dv[1] * loose * 0.9, dv[2] * loose * 0.6);
        d.makeRotationFromEuler(e);
        d.setPosition(dv[0] * loose * 2.2, dv[1] * loose * 1.6, dv[2] * loose * 2.2);
        m.multiplyMatrices(c, d).multiply(pc.matrix);
        const slot = counts[pc.geo] ?? (counts[pc.geo] = [0, 0]);
        const glassMat = plan[pc.geo][1];
        if (pc.geo === "light") {
          const mesh = solid.current.light;
          if (!mesh) return;
          mesh.setMatrixAt(slot[0], m);
          col
            .copy(violet)
            .lerp(gold, 0.35)
            .multiplyScalar(1.4 * emerge * (1 - lose) * (1 - gone));
          mesh.setColorAt(slot[0]++, col);
          return;
        }
        const coherence = (1 - lose) * (1 - gone);
        const sm = solid.current[pc.geo];
        if (!glassMat) {
          if (sm) sm.setMatrixAt(slot[0]++, m);
          return;
        }
        if (sm && coherence > 0.01) {
          sm.setMatrixAt(slot[0], m);
          sm.setColorAt(slot[0]++, col.setScalar(coherence));
        }
        const gm = glass.current[pc.geo];
        if (gm && coherence < 0.99) {
          gm.setMatrixAt(slot[1], m);
          gm.setColorAt(slot[1]++, col.setScalar((1 - coherence) * (1 - gone)));
        }
      });
    });
    (Object.keys(capacity) as GeoKey[]).forEach((key) => {
      const [a, b] = counts[key] ?? [0, 0];
      for (const [mesh, n] of [
        [solid.current[key], a],
        [glass.current[key], b],
      ] as const) {
        if (!mesh) continue;
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    });

    // The comparison layer: gold pathways between all three futures …
    const compare = ramp(p, "three", 0.5, "selection", 0.15);
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
        width: 0.05,
        intensity: 0.8 * keep,
        pulse: 1.4,
        phase: j / 3,
        speed: 0.35,
      });
    });
    // … and the founder's six fit signals evaluated in each, simultaneously.
    const hub: [number, number, number] = [FINALS_HUB[0], FINALS_HUB[1] + 6.5, FINALS_HUB[2] + 3];
    const fit = ramp(p, "three", 0.55, "three", 0.85);
    centres.forEach((ctr, k) => {
      const fails = k === 1 ? [] : FAILS[k === 0 ? 0 : 1];
      for (let j = 0; j < 6; j++) {
        const idx = fil.start + 4 + k * 6 + j;
        const fail = fails.includes(j);
        const hold = fail ? 1 - smoothstep(0.1, 0.7, lose) : 1;
        const s1 = fit * hold * (1 - gone);
        if (s1 <= 0.01) {
          filaments.hide(idx);
          continue;
        }
        const a = (j / 6) * Math.PI * 2;
        filaments.arc(
          idx,
          hub[0] + Math.cos(a) * 0.5,
          hub[1] + Math.sin(a) * 0.5,
          hub[2],
          ctr[0] + Math.cos(a) * 0.9,
          ctr[1] + Math.sin(a) * 0.9 + 0.4,
          ctr[2],
          0,
          1.2,
          0,
        );
        filaments.params(idx, {
          s1,
          width: 0.022,
          intensity: (fail ? 0.9 : 0.55 + (k === 1 ? 0.5 * lose : 0)) * (1 - gone),
          violet: fail ? 1 : k === 1 ? 0 : 0.4,
          pulse: 1.3,
          phase: j * 0.16 + k * 0.05,
          speed: 0.45,
        });
      }
    });
    // The one aligns with the core's system: a long filament from the trunk origin.
    const align =
      ramp(p, "selection", 0.4, "selection", 0.9) * (1 - ramp(p, "unfold", 0.3, "unfold", 0.7));
    const idx = fil.start + 3;
    if (align > 0.01) {
      const W = centres[1];
      filaments.arc(
        idx,
        TRUNK_ORIGIN[0],
        TRUNK_ORIGIN[1],
        TRUNK_ORIGIN[2],
        W[0],
        W[1],
        W[2],
        0,
        6,
        0,
      );
      filaments.params(idx, {
        s1: align,
        width: 0.06,
        intensity: 1.1,
        pulse: 1.2,
        phase: 0.1,
        speed: 0.22,
      });
    } else filaments.hide(idx);
    for (let j = 22; j < fil.count; j++) filaments.hide(fil.start + j);

    // Labels: each future is named while it is a candidate; the two fade as they lose coherence.
    const named = smoothstep(0.2, 0.4, three) * (1 - ramp(p, "unfold", 0.05, "unfold", 0.3));
    centres.forEach((c3, k) => {
      const o = named * (k === 1 ? 1 : 1 - lose);
      s.anchors.set(`finalist-${k}`, { x: c3[0], y: c3[1] + (k === 1 ? 4 : 4.4), z: c3[2], o });
    });
  });

  return (
    <group ref={group}>
      {(Object.keys(capacity) as GeoKey[]).map((key) => (
        <group key={key}>
          <instancedMesh
            ref={(el) => {
              solid.current[key] = el;
            }}
            args={[geos[key], plan[key][0], capacity[key]]}
            frustumCulled={false}
            renderOrder={plan[key][0] === materials.smoked ? 2 : 0}
          />
          {plan[key][1] && (
            <instancedMesh
              ref={(el) => {
                glass.current[key] = el;
              }}
              args={[geos[key], plan[key][1]!, capacity[key]]}
              frustumCulled={false}
              renderOrder={2}
            />
          )}
        </group>
      ))}
    </group>
  );
}
