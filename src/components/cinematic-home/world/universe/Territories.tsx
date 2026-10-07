import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  MeshBasicMaterial,
  Vector3,
  type BufferGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { smoothstep } from "../../math";
import { progressOf, ramp } from "../../timeline/timeline";
import { frameGeometry, plateGeometry } from "../geometry/frames";
import { roundedRect, sweep } from "../geometry/sweep";
import { COLORS } from "../layout";
import { useWorld } from "../WorldContext";
import {
  CONVERGE_ANCHOR,
  HORIZON,
  LAYERS,
  RING,
  TERRACE,
  TERRITORIES,
  TRUNK_ORIGIN,
  WALL,
  type TerritoryId,
  type UniverseModel,
} from "./universe-model";
import { universePhases } from "./universe-state";

/**
 * The monumental architecture of the five territories — what the modules live
 * on, and what makes the universe read as one enormous, organised, purposeful
 * system rather than a field of dots:
 *   A Capability alignment — a capability-matrix wall of ordered shelves
 *   B Capital feasibility  — stepped terraces, cheapest lowest; a gold ₹50,000 threshold
 *   C Market access        — a vast routing ring with stations and selected pathways
 *   D Execution complexity — deep dependency layers, half-concealed by atmosphere
 *   E Emerging possibilities — a sparse open horizon arc
 * Structural titanium with rim-lit edges; luminous indigo routes that flare as each
 * founder-context wave passes; gold on the surviving region; eliminated territories
 * lose their light and recede into the atmosphere. Pure functions of progress.
 */
interface Piece {
  geometry: BufferGeometry;
  material: "titanium" | "graphite" | "route" | "gold";
  position: [number, number, number];
  rotation?: [number, number, number];
}

function buildTerritory(id: TerritoryId): Piece[] {
  const out: Piece[] = [];
  switch (id) {
    case "A": {
      out.push({
        geometry: frameGeometry({ hw: WALL.hw, hh: WALL.hh, bar: 0.42, depth: 0.8, radius: 0.9 }),
        material: "titanium",
        position: [0, 0, -0.35],
      });
      // The matrix: modules float in a precise grid inside the frame, each row carried by a
      // luminous route — structure from edges and light, not furniture mass.
      const row = new BoxGeometry(WALL.hw * 2 - 1.3, 0.03, 0.02);
      for (let r = 0; r < WALL.rows; r++) {
        const y = (r - (WALL.rows - 1) / 2) * WALL.dy;
        out.push({ geometry: row, material: "route", position: [0, y, 0.25] });
      }
      const mullion = new BoxGeometry(0.1, WALL.hh * 2 - 0.9, 0.3);
      for (const x of [-WALL.dx * 3, WALL.dx * 3])
        out.push({ geometry: mullion, material: "titanium", position: [x, 0, 0.05] });
      break;
    }
    case "B": {
      // Stepped thresholds: one slim beam per level (cheapest lowest and nearest), modules
      // hovering above; slender columns between levels.
      const beam = new BoxGeometry(TERRACE.hw * 2, 0.14, 0.24);
      const lip = new BoxGeometry(TERRACE.hw * 2 - 0.4, 0.03, 0.025);
      const column = new CylinderGeometry(0.06, 0.06, TERRACE.rise, 10);
      for (let level = 0; level < TERRACE.levels; level++) {
        const y = (level - 2) * TERRACE.rise;
        const z = -level * TERRACE.step;
        out.push({ geometry: beam, material: "titanium", position: [0, y + 0.12, z] });
        out.push({ geometry: lip, material: "route", position: [0, y + 0.21, z + 0.13] });
        if (level > 0)
          for (const x of [-TERRACE.hw + 0.3, TERRACE.hw - 0.3])
            out.push({
              geometry: column,
              material: "titanium",
              position: [x, y - TERRACE.rise / 2 + 0.12, z + TERRACE.step / 2],
            });
      }
      // The founder's capital threshold: ₹50,000 falls on level 1, after its fifth module.
      const x = (4.5 - (TERRACE.perLevel - 1) / 2) * TERRACE.dx;
      out.push({
        geometry: new BoxGeometry(0.05, 2.1, 0.6),
        material: "gold",
        position: [x, (1 - 2) * TERRACE.rise + 1.05, -1 * TERRACE.step],
      });
      // Everything within the founder's reach: the whole first level and level 1 up to the line.
      out.push({
        geometry: new BoxGeometry(TERRACE.hw * 2, 0.035, 0.03),
        material: "gold",
        position: [0, -2 * TERRACE.rise + 0.24, 0.16],
      });
      out.push({
        geometry: new BoxGeometry(TERRACE.hw + x, 0.035, 0.03),
        material: "gold",
        position: [(-TERRACE.hw + x) / 2, -1 * TERRACE.rise + 0.24, -TERRACE.step + 0.16],
      });
      break;
    }
    case "C": {
      const ringPts = Array.from({ length: 97 }, (_, i) => {
        const a = (i / 96) * Math.PI * 2;
        return new Vector3(Math.cos(a) * RING.radius, 0, Math.sin(a) * RING.radius);
      });
      out.push({
        geometry: sweep(ringPts, roundedRect(0.34, 0.24, 0.06, 2), { segments: 96, caps: false }),
        material: "titanium",
        position: [0, 0, 0],
      });
      const routePts = ringPts.map((p) => p.clone().setY(0.16));
      out.push({
        geometry: sweep(routePts, roundedRect(0.05, 0.03, 0.01, 1), { segments: 96, caps: false }),
        material: "route",
        position: [0, 0, 0],
      });
      const station = new RoundedBoxGeometry(1.7, 0.55, 1.7, 2, 0.12);
      const spoke = new BoxGeometry(RING.radius - 2.4, 0.08, 0.16);
      for (let s = 0; s < RING.stations; s++) {
        const a = (s / RING.stations) * Math.PI * 2 + Math.PI / RING.stations;
        out.push({
          geometry: station,
          material: "graphite",
          position: [Math.cos(a) * RING.radius, 0.1, Math.sin(a) * RING.radius],
          rotation: [0, -a, 0],
        });
        // Selected pathways only: every other station is routed to the hub.
        if (s % 2 === 0) {
          const r = (RING.radius + 2.4) / 2;
          out.push({
            geometry: spoke,
            material: "titanium",
            position: [Math.cos(a) * r, 0, Math.sin(a) * r],
            rotation: [0, -a, 0],
          });
        }
      }
      out.push({
        geometry: new RoundedBoxGeometry(3.6, 0.5, 3.6, 2, 0.2),
        material: "graphite",
        position: [0, 0, 0],
      });
      break;
    }
    case "D": {
      const frame = frameGeometry({
        hw: LAYERS.hw,
        hh: LAYERS.hh,
        bar: 0.3,
        depth: 0.36,
        radius: 0.8,
        curveSegments: 6,
      });
      const inlay = new BoxGeometry(LAYERS.hw * 2 - 1.2, 0.035, 0.03);
      for (let layer = 0; layer < LAYERS.count; layer++) {
        const z = (layer - (LAYERS.count - 1) / 2) * LAYERS.gap;
        out.push({ geometry: frame, material: "titanium", position: [0, 0, z] });
        out.push({ geometry: inlay, material: "route", position: [0, LAYERS.hh - 0.42, z + 0.2] });
        out.push({ geometry: inlay, material: "route", position: [0, -LAYERS.hh + 0.42, z + 0.2] });
      }
      break;
    }
    case "E": {
      const span = HORIZON.span + 0.4;
      const pts = Array.from({ length: 49 }, (_, i) => {
        const a = (i / 48 - 0.5) * span;
        return new Vector3(
          Math.sin(a) * HORIZON.radius,
          -0.2,
          -Math.cos(a) * HORIZON.radius + HORIZON.radius * 0.72,
        );
      });
      out.push({
        geometry: sweep(new CatmullRomCurve3(pts), roundedRect(0.16, 0.16, 0.05, 2), {
          segments: 96,
        }),
        material: "titanium",
        position: [0, 0, 0],
      });
      out.push({
        geometry: sweep(
          new CatmullRomCurve3(pts.map((p) => p.clone().setY(0.0))),
          roundedRect(0.035, 0.03, 0.01, 1),
          { segments: 96 },
        ),
        material: "route",
        position: [0, 0, 0],
      });
      break;
    }
  }
  return out;
}

const ROUTE = new Color(COLORS.indigo);
const GOLD = new Color(COLORS.edgeGold);

export function Territories({ model }: { model: UniverseModel }) {
  const { store, materials } = useWorld();
  const groups = useRef<(Group | null)[]>([]);
  const built = useMemo(() => TERRITORIES.map((t) => buildTerritory(t.id)), []);
  // One route material per territory: each one's light answers its own events.
  const routes = useMemo(
    () => TERRITORIES.map(() => new MeshBasicMaterial({ color: ROUTE.clone() })),
    [],
  );
  const gold = useMemo(() => new MeshBasicMaterial({ color: GOLD.clone() }), []);
  useEffect(
    () => () => {
      const seen = new Set<BufferGeometry>();
      for (const list of built) for (const pc of list) seen.add(pc.geometry);
      seen.forEach((g) => g.dispose());
      routes.forEach((m) => m.dispose());
      gold.dispose();
    },
    [built, routes, gold],
  );

  // Per territory: how far it sits from the core (reveal / waves), and the share of its
  // opportunities still alive after each convergence stage (its remaining "authority").
  const meta = useMemo(
    () =>
      TERRITORIES.map((t) => {
        const own = model.opportunities.filter((o) => o.territory === t.id);
        const alive = [0, 1, 2, 3, 4, 5].map(
          (k) => own.filter((o) => o.stage === 0 || o.stage > k).length / Math.max(1, own.length),
        );
        const d = Math.hypot(
          t.centre[0] - TRUNK_ORIGIN[0],
          t.centre[1] - TRUNK_ORIGIN[1],
          t.centre[2] - TRUNK_ORIGIN[2],
        );
        const away = new Vector3(
          t.centre[0] - CONVERGE_ANCHOR[0],
          t.centre[1] - CONVERGE_ANCHOR[1],
          t.centre[2] - CONVERGE_ANCHOR[2],
        ).normalize();
        return { alive, d, away };
      }),
    [model],
  );
  const showFrom = progressOf("passage", 0.36);
  const showTo = progressOf("unfold", 1);
  /** Each territory's label sits above its architecture (territory-local). */
  const labelAt = useMemo(
    () =>
      ({
        A: [0, WALL.hh + 1.2, 0],
        B: [-TERRACE.hw - 1.6, 0.4, -2 * TERRACE.step],
        C: [0, 2.2, RING.radius],
        D: [0, LAYERS.hh + 1.4, 0],
        E: [0, 2.8, HORIZON.radius * 0.3],
      }) as Record<TerritoryId, [number, number, number]>,
    [],
  );
  const labelV = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const p = store.state.progress;
    const active = p > showFrom && p < showTo;
    const ph = universePhases(p);
    // Before the final three the whole landscape withdraws: negative space for the decision.
    const quiet = ramp(p, "convergence", 0.84, "three", 0.18);
    TERRITORIES.forEach((t, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.visible = active;
      if (!active) return;
      const m = meta[i];
      // Rises into place as the reveal reaches it.
      const appear = smoothstep(m.d - 10, m.d + 8, ph.revealFront);
      // Authority: the share still alive, eased through the convergence stages.
      let alive = 1;
      for (let k = 0; k < 5; k++) alive = alive + (m.alive[k + 1] - alive) * ph.stages[k];
      const recede = Math.max((1 - alive) * (1 - ph.fadeOut) + ph.fadeOut, quiet);
      g.position.set(
        t.centre[0] + m.away.x * recede * 26,
        t.centre[1] - (1 - appear) * 9 - recede * 7 + m.away.y * recede * 6,
        t.centre[2] + m.away.z * recede * 26,
      );
      g.rotation.set(0, t.yaw, 0);
      g.scale.setScalar(Math.max(0.0001, (0.86 + 0.14 * appear) * (1 - 0.35 * ph.fadeOut)));
      g.visible = appear > 0.002 && quiet < 0.995;
      // Routes: a resting glow, a flare as each founder-context wave passes, gold if it survives.
      let flare = 0;
      for (const w of ph.waves) {
        const dw = (w - m.d) / 9;
        flare = Math.max(flare, Math.exp(-dw * dw));
      }
      const survive = smoothstep(0.2, 0.9, ph.stages[1]) * alive;
      routes[i].color
        .copy(ROUTE)
        .lerp(GOLD, survive)
        .multiplyScalar(appear * (0.25 + 1.1 * flare + 0.5 * survive) * (0.25 + 0.75 * alive));
    });
    gold.color.copy(GOLD).multiplyScalar(0.4 + 0.9 * smoothstep(0.08, 0.3, ph.waves[0] / 96));
    // Labels: named while the universe is read and computed; gone once order takes over.
    const named =
      ramp(p, "universe", 0.3, "universe", 0.55) *
      (1 - ramp(p, "computation", 0.86, "convergence", 0.1));
    TERRITORIES.forEach((t, i) => {
      const g = groups.current[i];
      const o = active && g && g.visible ? named : 0;
      if (g && o > 0) {
        g.updateMatrixWorld();
        labelV.set(...labelAt[t.id]).applyMatrix4(g.matrixWorld);
        store.state.anchors.set(`territory-${t.id}`, { x: labelV.x, y: labelV.y, z: labelV.z, o });
      } else store.state.anchors.set(`territory-${t.id}`, { x: 0, y: 0, z: 0, o: 0 });
    });
  });

  const pick = (key: Piece["material"], i: number) =>
    key === "route"
      ? routes[i]
      : key === "gold"
        ? gold
        : key === "graphite"
          ? materials.graphite
          : materials.titanium;

  return (
    <>
      {TERRITORIES.map((t, i) => (
        <group
          key={t.id}
          ref={(el) => {
            groups.current[i] = el;
          }}
          visible={false}
        >
          {built[i].map((pc, k) => (
            <mesh
              key={k}
              geometry={pc.geometry}
              material={pick(pc.material, i)}
              position={pc.position}
              rotation={pc.rotation ?? [0, 0, 0]}
            />
          ))}
        </group>
      ))}
    </>
  );
}
