import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  DynamicDrawUsage,
  Euler,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Vector2,
  Vector3,
  type Group,
  type InstancedMesh,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { smoothstep } from "../../math";
import { local, progressOf, ramp } from "../../timeline/timeline";
import { cornerGeometry, frameGeometry, inlayGeometry, plateGeometry } from "../geometry/frames";
import { useWorld } from "../WorldContext";
import {
  ASSUMPTION_GATE,
  createGateState,
  GATE,
  GATE_SPACING,
  gateState,
  MILESTONES,
  originalFrame,
} from "./path-model";

export const GATE_COUNT = 34;

/** Gates that grow satellite channels in Elevate (the path branches into a network). */
const ELEVATE_FROM = 18;
const ELEVATE_TO = ASSUMPTION_GATE - 1;
const SATELLITES = (ELEVATE_TO - ELEVATE_FROM + 1) * 2;

const { hw, hh, centreY: cy, radius, bar, depth, stub } = GATE;
const CORNERS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;
/** Bars: top, bottom, left, right — where they sit when locked, and which way they open. */
const BARS = [
  { at: [0, cy + hh - bar / 2], open: [0, 0.62], tilt: 0.05, vertical: false },
  { at: [0, cy - hh + bar / 2], open: [0, -0.4], tilt: -0.03, vertical: false },
  { at: [-(hw - bar / 2), cy], open: [-0.62, 0.1], tilt: -0.06, vertical: true },
  { at: [hw - bar / 2, cy], open: [0.62, 0.1], tilt: 0.06, vertical: true },
] as const;

function buildGate(curveSegments: number) {
  const corner = cornerGeometry(radius, bar, depth, stub, curveSegments);
  const lenH = 2 * (hw - radius - stub);
  const lenV = 2 * (hh - radius - stub);
  const barH = new RoundedBoxGeometry(lenH, bar - 0.02, depth - 0.02, 2, 0.03);
  const barV = new RoundedBoxGeometry(bar - 0.02, lenV, depth - 0.02, 2, 0.03);
  // A logic lock on each bar: machined housing + a status window.
  const lockH = new RoundedBoxGeometry(0.62, 0.2, 0.2, 2, 0.04);
  const lockV = new RoundedBoxGeometry(0.2, 0.62, 0.2, 2, 0.04);
  const light = new BoxGeometry(1, 1, 1);
  // Build lays a deck under the gates: graphite plate with a pearl centre track.
  const deck = plateGeometry(hw - 0.35, GATE_SPACING / 2 - 0.12, 0.1, 0.12, 0, 3);
  deck.rotateX(-Math.PI / 2);
  const track = plateGeometry(0.16, GATE_SPACING / 2 - 0.3, 0.04, 0.06, 0, 2);
  track.rotateX(-Math.PI / 2);
  // Elevate: satellite channel frames (with a gold inlay) and vast distant frames.
  const satOpts = { hw: 2.2, hh: 1.6, bar: 0.16, depth: 0.26, radius: 0.5, curveSegments };
  const satellite = frameGeometry(satOpts);
  const satInlay = inlayGeometry(satOpts, 0.04, 0.03);
  const distant = frameGeometry({
    hw: 6,
    hh: 4.2,
    bar: 0.32,
    depth: 0.5,
    radius: 1.3,
    curveSegments,
  });
  return { corner, barH, barV, lockH, lockV, light, deck, track, satellite, satInlay, distant };
}

/** A suspended milestone: a pearl capsule held by a champagne band. */
function buildMilestone() {
  const body = new CapsuleGeometry(0.32, 0.5, 4, 14);
  body.rotateZ(Math.PI / 2);
  const band = new LatheGeometry(
    [
      [0.36, -0.12],
      [0.42, -0.12],
      [0.44, 0],
      [0.42, 0.12],
      [0.36, 0.12],
    ].map(([x, y]) => new Vector2(x, y)),
    28,
  );
  band.rotateZ(Math.PI / 2);
  return { body, band };
}

type Mesh = InstancedMesh | null;

/**
 * The execution path: the chosen opportunity's frames become its gates; gold
 * rails run through them; milestones hang above. Validate, Build and Elevate
 * differ in TOPOLOGY and material state, not just labels:
 *   Validate — open, provisional: smoked-glass bars hang unlocked, violet
 *              probes test the gates ahead, rails are hairlines.
 *   Build    — assembly: bars slide in and lock (titanium), logic locks turn
 *              gold, a deck forms underfoot, rails thicken into structure.
 *   Elevate  — reach: the path climbs, every gate grows satellite channels at
 *              altitude, interconnected; vast architecture opens far out.
 */
export function ExecutionPath() {
  const { store, materials, filaments, preset } = useWorld();
  const geo = useMemo(
    () => buildGate(Math.max(6, Math.round(preset.coreSegments / 6))),
    [preset.coreSegments],
  );
  const milestone = useMemo(() => buildMilestone(), []);
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
      milestone.body.dispose();
      milestone.band.dispose();
    },
    [geo, milestone],
  );
  const states = useMemo(() => Array.from({ length: GATE_COUNT }, createGateState), []);
  // Solid (titanium) and provisional (smoked) variants per piece kind; compacted each frame.
  const cornerSolid = useRef<Mesh>(null);
  const cornerGlass = useRef<Mesh>(null);
  const barSolid = useRef<Mesh[]>([]);
  const barGlass = useRef<Mesh[]>([]);
  const locks = useRef<Mesh[]>([]);
  const lockLights = useRef<Mesh>(null);
  const deck = useRef<Mesh>(null);
  const track = useRef<Mesh>(null);
  const satellites = useRef<Mesh>(null);
  const satInlays = useRef<Mesh>(null);
  const milestoneBody = useRef<Mesh>(null);
  const milestoneBand = useRef<Mesh>(null);
  const distant = useRef<Mesh>(null);
  const group = useRef<Group>(null);
  const rails = useMemo(() => filaments.range("path-rails", GATE_COUNT * 3 + 3), [filaments]);
  const links = useMemo(
    () => filaments.range("path-links", SATELLITES * 2 + MILESTONES.length + 6),
    [filaments],
  );
  const scratch = useMemo(
    () => ({
      m: new Matrix4(),
      g: new Matrix4(),
      lm: new Matrix4(),
      q: new Quaternion(),
      q2: new Quaternion(),
      e: new Euler(),
      v: new Vector3(),
      s: new Vector3(),
      one: new Vector3(1, 1, 1),
      zero: new Matrix4().makeScale(0, 0, 0),
      color: new Color(),
      gold: new Color("#f0cf8c"),
      indigo: new Color("#7d6ff0"),
      pts: [new Vector3(), new Vector3(), new Vector3()],
    }),
    [],
  );
  const showFrom = progressOf("three", 0);
  const showTo = progressOf("connected", 0.6);
  const allMeshes = () => [
    cornerSolid.current,
    cornerGlass.current,
    ...barSolid.current,
    ...barGlass.current,
    ...locks.current,
    lockLights.current,
    deck.current,
    track.current,
    satellites.current,
    satInlays.current,
    milestoneBody.current,
    milestoneBand.current,
    distant.current,
  ];

  useLayoutEffect(() => {
    for (const mesh of allMeshes()) {
      if (!mesh) continue;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, scratch.zero);
    }
    for (const mesh of [
      cornerSolid.current,
      cornerGlass.current,
      ...barSolid.current,
      ...barGlass.current,
      lockLights.current,
    ]) {
      if (!mesh) continue;
      for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, scratch.color.setScalar(1));
      mesh.instanceColor?.setUsage(DynamicDrawUsage);
    }
  }, [scratch]);

  // Gate-local anchor points for the three rails: bottom-left, top centre, bottom-right.
  const railAnchors = useMemo(
    () => [
      new Vector3(-(hw - 0.5), cy - hh + 0.15, 0),
      new Vector3(0, cy + hh + 0.05, 0),
      new Vector3(hw - 0.5, cy - hh + 0.15, 0),
    ],
    [],
  );
  const gateMatrices = useMemo(() => Array.from({ length: GATE_COUNT }, () => new Matrix4()), []);
  const satMatrices = useMemo(() => Array.from({ length: SATELLITES }, () => new Matrix4()), []);

  useFrame(() => {
    const grp = group.current;
    if (!grp) return;
    const p = store.state.progress;
    const active = p > showFrom && p < showTo;
    grp.visible = active;
    if (!active) {
      filaments.hideRange(rails);
      filaments.hideRange(links);
      MILESTONES.forEach((_, k) =>
        store.state.anchors.set(`milestone-${k}`, { x: 0, y: 0, z: 0, o: 0 }),
      );
      return;
    }
    const { m, g, lm, q, e, v, s, one, zero, color, gold, indigo } = scratch;
    const fadeEnd = 1 - ramp(p, "product", 0.05, "product", 0.4) * 0.85;
    const build = ramp(p, "build", 0, "build", 0.7);
    const elevate = ramp(p, "elevate", 0, "elevate", 0.7);

    const n = { cs: 0, cg: 0, bs: [0, 0, 0, 0], bg: [0, 0, 0, 0], lk: [0, 0], ll: 0, dk: 0 };
    const put = (mesh: Mesh, index: number, matrix: Matrix4, alpha?: number) => {
      if (!mesh) return;
      mesh.setMatrixAt(index, matrix);
      if (alpha !== undefined) mesh.setColorAt(index, color.setScalar(alpha));
    };
    for (let i = 0; i < GATE_COUNT; i++) {
      const st = gateState(i, p, states[i]);
      const scale = st.scale * st.present;
      // Instability tilts and shifts each gate on its own seeded axis.
      e.set(st.wobble[0] * 0.18, st.wobble[1] * 0.25, st.wobble[2] * 0.42);
      q.setFromEuler(e).premultiply(st.quaternion);
      v.copy(st.position);
      v.x += st.wobble[2] * 1.1;
      v.y += st.wobble[0] * 0.6;
      s.setScalar(Math.max(scale, 0.0001));
      g.compose(v, q, s);
      gateMatrices[i].copy(g);
      if (scale <= 0.002) continue;
      const solid = st.solid;
      // How open the gate is: unlocked bars hang away; contradiction unlocks them again.
      const open = Math.min(1.4, 1 - st.crown + st.unstable * 0.9);

      // Corner brackets: always present — the gate's provisional skeleton.
      CORNERS.forEach(([sx, sy], k) => {
        e.set(0, 0, (k * Math.PI) / 2 + st.wobble[k % 3] * 0.2 * st.unstable);
        q.setFromEuler(e);
        v.set(
          sx * (hw - radius + st.unstable * 0.35),
          cy + sy * (hh - radius + st.unstable * 0.25),
          0,
        );
        lm.compose(v, q, one);
        m.multiplyMatrices(g, lm);
        if (solid > 0.01) put(cornerSolid.current, n.cs++, m, solid);
        if (solid < 0.99) put(cornerGlass.current, n.cg++, m, 1 - solid);
      });
      // Bars: hang open in Validate, slide in and lock in Build.
      BARS.forEach((b, k) => {
        e.set(0, 0, b.tilt * open);
        q.setFromEuler(e);
        v.set(b.at[0] + b.open[0] * open, b.at[1] + b.open[1] * open, 0);
        lm.compose(v, q, one);
        m.multiplyMatrices(g, lm);
        if (solid > 0.01) put(barSolid.current[k], n.bs[k]++, m, solid);
        if (solid < 0.99) put(barGlass.current[k], n.bg[k]++, m, 1 - solid);
        // Logic locks ride the top and side bars; gold once locked, faint indigo while testing.
        if (k === 1) return;
        const vertical = b.vertical;
        lm.multiply(scratch.m.makeTranslation(0, 0, depth / 2 + 0.07));
        m.multiplyMatrices(g, lm);
        put(locks.current[vertical ? 1 : 0], n.lk[vertical ? 1 : 0]++, m);
        lm.multiply(scratch.m.makeTranslation(0, 0, 0.11));
        lm.multiply(scratch.m.makeScale(vertical ? 0.06 : 0.38, vertical ? 0.38 : 0.06, 0.02));
        m.multiplyMatrices(g, lm);
        if (lockLights.current) {
          lockLights.current.setMatrixAt(n.ll, m);
          const locked = st.crown * (1 - st.unstable);
          color.copy(indigo).multiplyScalar(0.5).lerp(gold, locked);
          lockLights.current.setColorAt(n.ll++, color.multiplyScalar(0.5 + 0.9 * locked));
        }
      });
      // Build: the deck assembles under each gate, one plate after another.
      const deckIn =
        smoothstep(0.05 + (i % 12) * 0.03, 0.4 + (i % 12) * 0.03, build) * (1 - st.unstable);
      if (deckIn > 0.01 && i < GATE_COUNT - 1) {
        lm.compose(
          v.set(0, cy - hh - 0.05, -GATE_SPACING / 2),
          q.identity(),
          s.set(1, 1, Math.max(0.001, deckIn)),
        );
        m.multiplyMatrices(g, lm);
        put(deck.current, n.dk, m);
        put(track.current, n.dk++, m);
      }
    }
    const setCount = (mesh: Mesh, c: number) => {
      if (mesh) mesh.count = c;
    };
    setCount(cornerSolid.current, n.cs);
    setCount(cornerGlass.current, n.cg);
    for (let k = 0; k < 4; k++) {
      setCount(barSolid.current[k], n.bs[k]);
      setCount(barGlass.current[k], n.bg[k]);
    }
    setCount(locks.current[0], n.lk[0]);
    setCount(locks.current[1], n.lk[1]);
    setCount(lockLights.current, n.ll);
    setCount(deck.current, n.dk);
    setCount(track.current, n.dk);

    // Elevate: satellite channels at altitude on both sides of every gate.
    let ns = 0;
    for (let i = ELEVATE_FROM; i <= ELEVATE_TO; i++) {
      const st = states[i];
      const grow = smoothstep(
        0.05 + (i - ELEVATE_FROM) * 0.06,
        0.45 + (i - ELEVATE_FROM) * 0.06,
        elevate,
      );
      for (const side of [-1, 1]) {
        const j = (i - ELEVATE_FROM) * 2 + (side > 0 ? 1 : 0);
        e.set(0, -side * 0.18, side * 0.06);
        q.setFromEuler(e);
        lm.compose(
          v.set(side * (9.5 - 2.5 * (1 - grow)), cy + 4.6 * grow, 0),
          q,
          s.setScalar(Math.max(0.001, grow * st.present)),
        );
        satMatrices[j].multiplyMatrices(gateMatrices[i], lm);
        if (grow > 0.01) {
          put(satellites.current, ns, satMatrices[j]);
          put(satInlays.current, ns++, satMatrices[j]);
        }
      }
    }
    setCount(satellites.current, ns);
    setCount(satInlays.current, ns);

    for (const mesh of allMeshes()) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Rails: hairlines in Validate, structured in Build, carrying more traffic in Elevate.
    const railWidth = 0.016 + build * 0.034 + elevate * 0.012;
    for (let i = 0; i < GATE_COUNT - 1; i++) {
      const a = states[i];
      const b = states[i + 1];
      for (let r = 0; r < 3; r++) {
        const idx = rails.start + i * 3 + r;
        const grow = Math.min(a.present, b.present);
        const broken = Math.max(a.unstable, b.unstable);
        if (grow <= 0.01 || p < progressOf("unfold", 0.2)) {
          filaments.hide(idx);
          continue;
        }
        const A = scratch.pts[0].copy(railAnchors[r]).applyMatrix4(gateMatrices[i]);
        const B = scratch.pts[1].copy(railAnchors[r]).applyMatrix4(gateMatrices[i + 1]);
        filaments.arc(idx, A.x, A.y, A.z, B.x, B.y, B.z);
        filaments.params(idx, {
          s1: grow * (1 - 0.75 * broken),
          width: railWidth * (r === 1 ? 0.7 : 1),
          intensity: (0.4 + build * 0.4) * (1 - 0.6 * broken) * fadeEnd,
          violet: (1 - build) * 0.5,
          pulse: 0.5 + elevate * 0.7,
          phase: (i * 3 + r) * 0.071,
          speed: 0.09 + elevate * 0.06,
        });
      }
    }
    // The original future beyond the last gate: confident at first, retracts once the path is rebuilt.
    const crisis = local(p, "crisis");
    const adapt = local(p, "adaptation");
    for (let r = 0; r < 3; r++) {
      const idx = rails.start + (GATE_COUNT - 1) * 3 + r;
      const last = states[GATE_COUNT - 1];
      const far = originalFrame(GATE_COUNT + 6, {
        position: new Vector3(),
        quaternion: new Quaternion(),
        scale: 1,
      });
      const A = scratch.pts[0].copy(railAnchors[r]).applyMatrix4(gateMatrices[GATE_COUNT - 1]);
      const B = scratch.pts[1]
        .copy(railAnchors[r])
        .applyQuaternion(far.quaternion)
        .add(far.position);
      const s1 = last.present * (1 - smoothstep(0.1, 0.6, crisis)) * (1 - adapt);
      if (s1 <= 0.01) {
        filaments.hide(idx);
        continue;
      }
      filaments.arc(idx, A.x, A.y, A.z, B.x, B.y, B.z);
      filaments.params(idx, {
        s1,
        width: railWidth,
        intensity: 0.45 * fadeEnd,
        pulse: 0.6,
        phase: r * 0.3,
        speed: 0.12,
      });
    }

    // Elevate links: each gate reaches up to its satellites; satellites link along the path.
    for (let j = 0; j < SATELLITES; j++) {
      const i = ELEVATE_FROM + Math.floor(j / 2);
      const up = links.start + j * 2;
      const along = up + 1;
      const st = states[i];
      const live = elevate * st.present * (1 - st.unstable);
      if (live <= 0.01) {
        filaments.hide(up);
        filaments.hide(along);
        continue;
      }
      const side = j % 2 ? 1 : -1;
      const A = scratch.pts[0]
        .set(side * (hw - 0.4), cy + hh - 0.2, 0)
        .applyMatrix4(gateMatrices[i]);
      const B = scratch.pts[1].set(-side * 2.0, -1.4, 0).applyMatrix4(satMatrices[j]);
      filaments.arc(up, A.x, A.y, A.z, B.x, B.y, B.z, 0, 1.2, 0);
      filaments.params(up, {
        s1: live,
        width: 0.026,
        intensity: 0.6 * live * fadeEnd,
        pulse: 1,
        phase: j * 0.11,
        speed: 0.2,
      });
      if (j + 2 < SATELLITES) {
        const C = scratch.pts[2].set(0, 1.6, 0).applyMatrix4(satMatrices[j]);
        const D = scratch.pts[0].set(0, 1.6, 0).applyMatrix4(satMatrices[j + 2]);
        filaments.arc(along, C.x, C.y, C.z, D.x, D.y, D.z);
        filaments.params(along, {
          s1: live * smoothstep(0.3, 0.8, elevate),
          width: 0.03,
          intensity: 0.7 * live * fadeEnd,
          pulse: 1.2,
          phase: j * 0.07,
          speed: 0.18,
        });
      } else filaments.hide(along);
    }

    // Validate: violet probes test the gates ahead — reaching forward, then retracting.
    const validate =
      ramp(p, "unfold", 0.8, "validate", 0.15) * (1 - ramp(p, "build", 0.1, "build", 0.5));
    for (let k = 0; k < 6; k++) {
      const idx = links.start + SATELLITES * 2 + MILESTONES.length + k;
      const from = 2 + k * 2;
      const to = from + 3;
      const cycle = (local(p, "validate") * 2.2 + k * 0.17) % 1;
      if (validate <= 0.01 || to >= GATE_COUNT) {
        filaments.hide(idx);
        continue;
      }
      const A = scratch.pts[0].copy(railAnchors[1]).applyMatrix4(gateMatrices[from]);
      const B = scratch.pts[1].copy(railAnchors[1]).applyMatrix4(gateMatrices[to]);
      filaments.arc(idx, A.x, A.y - 0.3, A.z, B.x, B.y - 0.3, B.z, 0, 0.9, 0);
      filaments.params(idx, {
        s0: smoothstep(0.5, 1, cycle),
        s1: smoothstep(0, 0.5, cycle),
        width: 0.03,
        intensity: 1.1 * validate,
        violet: 1,
        pulse: 0,
      });
    }

    // Milestones: suspended above their gates, waking as the traveller passes.
    MILESTONES.forEach((ms, k) => {
      const st = states[ms.gate];
      const window =
        ms.stage === "validate"
          ? ramp(p, "unfold", 0.85, "validate", 0.3)
          : ramp(p, "build", 0, "build", 0.4);
      const show = window * st.present * (1 - ramp(p, "elevate", 0.6, "evidence", 0.2));
      const idx = links.start + SATELLITES * 2 + k;
      if (show <= 0.01) {
        store.state.anchors.set(`milestone-${k}`, { x: 0, y: 0, z: 0, o: 0 });
        milestoneBody.current?.setMatrixAt(k, zero);
        milestoneBand.current?.setMatrixAt(k, zero);
        filaments.hide(idx);
        return;
      }
      v.set(0, cy + hh + 2.0, 0).applyMatrix4(gateMatrices[ms.gate]);
      store.state.anchors.set(`milestone-${k}`, { x: v.x, y: v.y + 0.9, z: v.z, o: show });
      s.setScalar(show * 0.9);
      m.compose(v, st.quaternion, s);
      milestoneBody.current?.setMatrixAt(k, m);
      milestoneBand.current?.setMatrixAt(k, m);
      const A = scratch.pts[2].copy(railAnchors[1]).applyMatrix4(gateMatrices[ms.gate]);
      filaments.arc(idx, A.x, A.y, A.z, v.x, v.y - 0.4, v.z);
      filaments.params(idx, {
        s1: show,
        width: 0.02,
        intensity: 0.7 * show,
        pulse: 0.6,
        phase: k * 0.2,
        speed: 0.2,
      });
    });
    if (milestoneBody.current) milestoneBody.current.instanceMatrix.needsUpdate = true;
    if (milestoneBand.current) milestoneBand.current.instanceMatrix.needsUpdate = true;

    // Elevate opens the environment: vast frames far out on both sides.
    if (distant.current) {
      for (let k = 0; k < 10; k++) {
        const side = k % 2 ? 1 : -1;
        const along = gateMatrices[Math.min(GATE_COUNT - 1, 12 + k * 2)];
        v.set(side * (40 + (k % 3) * 10), 6 + (k % 4) * 4, 0).applyMatrix4(along);
        q.setFromRotationMatrix(along);
        q.multiply(scratch.q2.setFromEuler(e.set(0, side * 0.5, 0)));
        s.setScalar(elevate * (2.6 + (k % 3) * 0.8) * fadeEnd);
        m.compose(v, q, s);
        distant.current.setMatrixAt(k, elevate > 0.01 ? m : zero);
      }
      distant.current.instanceMatrix.needsUpdate = true;
    }
  });

  const cap = GATE_COUNT * 4;
  return (
    <group ref={group}>
      <instancedMesh
        ref={cornerSolid}
        args={[geo.corner, materials.titaniumDissolve, cap]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={cornerGlass}
        args={[geo.corner, materials.smokedDissolve, cap]}
        frustumCulled={false}
        renderOrder={2}
      />
      {BARS.map((b, k) => (
        <instancedMesh
          key={`bs${k}`}
          ref={(el) => {
            barSolid.current[k] = el;
          }}
          args={[b.vertical ? geo.barV : geo.barH, materials.titaniumDissolve, GATE_COUNT]}
          frustumCulled={false}
        />
      ))}
      {BARS.map((b, k) => (
        <instancedMesh
          key={`bg${k}`}
          ref={(el) => {
            barGlass.current[k] = el;
          }}
          args={[b.vertical ? geo.barV : geo.barH, materials.smokedDissolve, GATE_COUNT]}
          frustumCulled={false}
          renderOrder={2}
        />
      ))}
      {[geo.lockH, geo.lockV].map((lg, k) => (
        <instancedMesh
          key={`lk${k}`}
          ref={(el) => {
            locks.current[k] = el;
          }}
          args={[lg, materials.graphite, GATE_COUNT * 2]}
          frustumCulled={false}
        />
      ))}
      <instancedMesh
        ref={lockLights}
        args={[geo.light, materials.energy, GATE_COUNT * 3]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={deck}
        args={[geo.deck, materials.graphite, GATE_COUNT]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={track}
        args={[geo.track, materials.pearl, GATE_COUNT]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={satellites}
        args={[geo.satellite, materials.titanium, SATELLITES]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={satInlays}
        args={[geo.satInlay, materials.champagne, SATELLITES]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={milestoneBody}
        args={[milestone.body, materials.pearl, MILESTONES.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={milestoneBand}
        args={[milestone.band, materials.champagne, MILESTONES.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={distant}
        args={[geo.distant, materials.titanium, 10]}
        frustumCulled={false}
      />
    </group>
  );
}
