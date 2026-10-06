import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CapsuleGeometry,
  Color,
  DynamicDrawUsage,
  Euler,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { smoothstep } from "../../math";
import { local, progressOf, ramp } from "../../timeline/timeline";
import { roundedRect, sweep } from "../geometry/sweep";
import { useWorld } from "../WorldContext";
import { ARCH, createGateState, gateState, MILESTONES, originalFrame } from "./path-model";

export const GATE_COUNT = 34;

const flat = (g: BufferGeometry) => (g.index ? g.toNonIndexed() : g);

/** Arch pieces in gate-local space: two legs and the crown, swept from one profile. */
function buildArch(segments: number) {
  const arc = (a0: number, a1: number, extendDown = 0) => {
    const pts: Vector3[] = [];
    if (extendDown) {
      const a = (a0 * Math.PI) / 180;
      pts.push(new Vector3(Math.cos(a) * ARCH.radius, ARCH.centreY - extendDown, 0));
    }
    for (let k = 0; k <= 8; k++) {
      const a = ((a0 + ((a1 - a0) * k) / 8) * Math.PI) / 180;
      pts.push(new Vector3(Math.cos(a) * ARCH.radius, ARCH.centreY + Math.sin(a) * ARCH.radius, 0));
    }
    return pts;
  };
  const profile = roundedRect(0.17, 0.44, 0.07, 3);
  const opts = { segments, up: new Vector3(0, 0, 1) };
  const legL = sweep(arc(180, 118, 1.1), profile, opts);
  const crown = sweep(arc(116, 64), profile, {
    ...opts,
    taper: (u: number) => 0.9 + 0.1 * Math.sin(Math.PI * u),
  });
  const legR = sweep(arc(0, 62, 1.1).reverse(), profile, opts);
  // Champagne hardware: slim machined collars around the tube at the crown
  // joints and the feet — fitted to the profile, never boxes.
  const parts: BufferGeometry[] = [];
  const collar = roundedRect(0.23, 0.5, 0.1, 3);
  for (const deg of [117, 63]) {
    parts.push(sweep(arc(deg - 2.2, deg + 2.2), collar, { segments: 4, up: new Vector3(0, 0, 1) }));
  }
  for (const side of [-1, 1]) {
    const foot = new RoundedBoxGeometry(0.46, 0.08, 0.62, 2, 0.03);
    foot.translate(side * ARCH.radius, ARCH.centreY - 1.12, 0);
    parts.push(foot);
  }
  const hardware = mergeGeometries(parts.map(flat));
  parts.forEach((g) => g.dispose());
  return { legL, crown, legR, hardware };
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

const LEG_OFFSET = new Vector3();
const PIECES = ["legL", "crown", "legR"] as const;

/**
 * The execution path: the chosen sculpture's arches become its gates, gold
 * rails run through them, milestones hang above, distant architecture opens
 * in Elevate. Gate states come from path-model.ts (pure, reversible).
 */
export function ExecutionPath() {
  const { store, materials, filaments, preset } = useWorld();
  const arch = useMemo(
    () => buildArch(Math.max(16, Math.round(preset.coreSegments / 3))),
    [preset.coreSegments],
  );
  const milestone = useMemo(() => buildMilestone(), []);
  useEffect(
    () => () => {
      for (const g of Object.values(arch)) g.dispose();
      milestone.body.dispose();
      milestone.band.dispose();
    },
    [arch, milestone],
  );
  const states = useMemo(() => Array.from({ length: GATE_COUNT }, createGateState), []);
  const pearl = useRef<(InstancedMesh | null)[]>([]);
  const glass = useRef<(InstancedMesh | null)[]>([]);
  const hardware = useRef<InstancedMesh>(null);
  const milestoneBody = useRef<InstancedMesh>(null);
  const milestoneBand = useRef<InstancedMesh>(null);
  const distant = useRef<InstancedMesh>(null);
  const group = useRef<Group>(null);
  const rails = useMemo(() => filaments.range("path-rails", GATE_COUNT * 3 + 3), [filaments]);
  const links = useMemo(
    () => filaments.range("path-links", GATE_COUNT + MILESTONES.length),
    [filaments],
  );
  const scratch = useMemo(
    () => ({
      m: new Matrix4(),
      g: new Matrix4(),
      local: new Matrix4(),
      q: new Quaternion(),
      e: new Euler(),
      v: new Vector3(),
      s: new Vector3(),
      zero: new Matrix4().makeScale(0, 0, 0),
      color: new Color(),
      pts: [new Vector3(), new Vector3(), new Vector3()],
    }),
    [],
  );
  const showFrom = progressOf("three", 0);
  const showTo = progressOf("connected", 0.6);

  useLayoutEffect(() => {
    for (const mesh of [
      ...pearl.current,
      ...glass.current,
      hardware.current,
      milestoneBody.current,
      milestoneBand.current,
      distant.current,
    ]) {
      if (!mesh) continue;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, scratch.zero);
    }
    // Allocate per-instance alpha for the dissolving arch pieces.
    for (const mesh of [...pearl.current, ...glass.current]) {
      if (!mesh) continue;
      for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, scratch.color.setScalar(1));
      mesh.instanceColor?.setUsage(DynamicDrawUsage);
    }
  }, [scratch]);

  // Gate-local anchor points for the three rails: left foot, crown, right foot.
  const railAnchors = useMemo(
    () => [
      new Vector3(-ARCH.radius, ARCH.centreY - 1.0, 0),
      new Vector3(0, ARCH.centreY + ARCH.radius + 0.25, 0),
      new Vector3(ARCH.radius, ARCH.centreY - 1.0, 0),
    ],
    [],
  );
  const gateMatrices = useMemo(() => Array.from({ length: GATE_COUNT }, () => new Matrix4()), []);

  useFrame(() => {
    const grp = group.current;
    if (!grp) return;
    const p = store.state.progress;
    const active = p > showFrom && p < showTo;
    grp.visible = active;
    if (!active) {
      filaments.hideRange(rails);
      filaments.hideRange(links);
      return;
    }
    const { m, g, local: lm, q, e, v, s, zero } = scratch;
    const fadeEnd = 1 - ramp(p, "product", 0.05, "product", 0.4) * 0.85;

    const packed = { pearl: [0, 0, 0], glass: [0, 0, 0] };
    for (let i = 0; i < GATE_COUNT; i++) {
      const st = gateState(i, p, states[i]);
      const scale = st.scale * st.present;
      const visible = scale > 0.002;
      // Instability tilts and shifts each gate on its own seeded axis.
      e.set(st.wobble[0] * 0.18, st.wobble[1] * 0.25, st.wobble[2] * 0.42);
      q.setFromEuler(e).premultiply(st.quaternion);
      v.copy(st.position).add(LEG_OFFSET.set(st.wobble[2] * 1.1, st.wobble[0] * 0.6, 0));
      s.setScalar(Math.max(scale, 0.0001));
      g.compose(v, q, s);
      gateMatrices[i].copy(g);
      PIECES.forEach((piece, k) => {
        if (!visible) return;
        if (piece === "crown") {
          // Unlocked crowns hover above the arch; locked crowns sit in place.
          const lift = (1 - st.crown) * 2.2 + st.unstable * 1.4;
          lm.makeRotationZ((1 - st.crown) * 0.22 + st.wobble[1] * 0.3);
          lm.setPosition(st.wobble[0] * 0.5, lift, 0);
        } else {
          const side = piece === "legL" ? -1 : 1;
          // Contradiction separates the legs from the crown.
          lm.makeTranslation(side * st.unstable * 0.55, -st.unstable * 0.25, 0);
        }
        m.multiplyMatrices(g, lm);
        const solid = st.solid;
        // Glass ↔ ceramic in place: a dithered dissolve, no shrinking. Each material only
        // carries the pieces that show it (packed to the front; `count` trimmed below).
        const pm = pearl.current[k];
        const gm = glass.current[k];
        if (pm && solid > 0.01) {
          pm.setMatrixAt(packed.pearl[k], m);
          pm.setColorAt(packed.pearl[k]++, scratch.color.setScalar(solid));
        }
        if (gm && solid < 0.99) {
          gm.setMatrixAt(packed.glass[k], m);
          gm.setColorAt(packed.glass[k]++, scratch.color.setScalar(1 - solid));
        }
      });
      hardware.current?.setMatrixAt(i, visible ? g : zero);
    }
    PIECES.forEach((_, k) => {
      if (pearl.current[k]) pearl.current[k]!.count = packed.pearl[k];
      if (glass.current[k]) glass.current[k]!.count = packed.glass[k];
    });
    for (const mesh of [...pearl.current, ...glass.current, hardware.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Rails: three gold rails gate-to-gate; delicate in Validate, structured in Build.
    const build = ramp(p, "build", 0, "build", 0.7);
    const elevate = ramp(p, "elevate", 0, "elevate", 0.8);
    const railWidth = 0.022 + build * 0.03 + elevate * 0.016;
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
        filaments.arc(idx, A.x, A.y, A.z, B.x, B.y, B.z, 0, r === 1 ? 0.25 : -0.1, 0);
        filaments.params(idx, {
          s1: grow * (1 - 0.75 * broken),
          width: railWidth * (r === 1 ? 0.7 : 1),
          intensity: (0.5 + build * 0.35) * (1 - 0.6 * broken) * fadeEnd,
          pulse: 0.5 + elevate * 0.5,
          phase: (i * 3 + r) * 0.071,
          speed: 0.09,
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

    // Elevate: the gates interconnect (crown to crown, two ahead).
    for (let i = 0; i < GATE_COUNT; i++) {
      const idx = links.start + i;
      const j = i + 2;
      if (elevate <= 0.01 || j >= GATE_COUNT || i % 2) {
        filaments.hide(idx);
        continue;
      }
      const A = scratch.pts[0].copy(railAnchors[1]).applyMatrix4(gateMatrices[i]);
      const B = scratch.pts[1].copy(railAnchors[1]).applyMatrix4(gateMatrices[j]);
      filaments.arc(idx, A.x, A.y, A.z, B.x, B.y, B.z, 0, 1.6, 0);
      const broken = Math.max(states[i].unstable, states[j].unstable);
      filaments.params(idx, {
        s1: elevate * (1 - broken),
        width: 0.03,
        intensity: 0.5 * elevate * fadeEnd,
        pulse: 0.8,
        phase: i * 0.13,
        speed: 0.15,
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
      if (show <= 0.01) {
        store.state.anchors.set(`milestone-${k}`, { x: 0, y: 0, z: 0, o: 0 });
        milestoneBody.current?.setMatrixAt(k, zero);
        milestoneBand.current?.setMatrixAt(k, zero);
        filaments.hide(links.start + GATE_COUNT + k);
        return;
      }
      v.set(0, ARCH.centreY + ARCH.radius + 2.4, 0).applyMatrix4(gateMatrices[ms.gate]);
      store.state.anchors.set(`milestone-${k}`, { x: v.x, y: v.y + 0.9, z: v.z, o: show });
      s.setScalar(show * 0.9);
      m.compose(v, st.quaternion, s);
      milestoneBody.current?.setMatrixAt(k, m);
      milestoneBand.current?.setMatrixAt(k, m);
      const A = scratch.pts[2].copy(railAnchors[1]).applyMatrix4(gateMatrices[ms.gate]);
      filaments.arc(links.start + GATE_COUNT + k, A.x, A.y, A.z, v.x, v.y - 0.4, v.z);
      filaments.params(links.start + GATE_COUNT + k, {
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

    // Elevate opens the environment: vast arches far out on both sides.
    if (distant.current) {
      for (let k = 0; k < 10; k++) {
        const side = k % 2 ? 1 : -1;
        const along = gateMatrices[Math.min(GATE_COUNT - 1, 12 + k * 2)];
        v.set(side * (38 + (k % 3) * 9), 4 + (k % 4) * 3, 0).applyMatrix4(along);
        q.setFromRotationMatrix(along);
        s.setScalar(elevate * (4.2 + (k % 3)) * fadeEnd);
        m.compose(v, q, s);
        distant.current.setMatrixAt(k, elevate > 0.01 ? m : zero);
      }
      distant.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      {PIECES.map((piece, k) => (
        <instancedMesh
          key={`p-${piece}`}
          ref={(el) => {
            pearl.current[k] = el;
          }}
          args={[arch[piece], materials.pearlDissolve, GATE_COUNT]}
          frustumCulled={false}
        />
      ))}
      {PIECES.map((piece, k) => (
        <instancedMesh
          key={`g-${piece}`}
          ref={(el) => {
            glass.current[k] = el;
          }}
          args={[arch[piece], materials.glassDissolve, GATE_COUNT]}
          frustumCulled={false}
          renderOrder={2}
        />
      ))}
      <instancedMesh
        ref={hardware}
        args={[arch.hardware, materials.champagne, GATE_COUNT]}
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
      <instancedMesh ref={distant} args={[arch.crown, materials.pearl, 10]} frustumCulled={false} />
    </group>
  );
}
