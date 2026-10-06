import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  LatheGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Matrix4,
  Object3D,
  Quaternion,
  Vector2,
  Vector3,
  type BufferGeometry,
  type PointLight,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { clamp01, smoothstep } from "../../math";
import { local } from "../../timeline/timeline";
import { contextResponse } from "../context/context-model";
import { bladeTaper, roundedRect, sweep } from "../geometry/sweep";
import { OPENING } from "../layout";
import { useWorld } from "../WorldContext";
import {
  approachFor,
  BLADES,
  bladeCurve,
  COLLARS,
  GLASS,
  SPINE_POINTS,
  type BladeSpec,
} from "./core-design";
import { SLAB_NORMAL } from "../product/product-model";
import { assembly, coreTransform, finaleTransform } from "./core-motion";

const DEG = Math.PI / 180;

/** Distant champagne signals in the void (appear at local `at`), and the bow of their run in. */
const VOID_SIGNALS: {
  from: [number, number, number];
  bend: [number, number, number];
  at: number;
}[] = [
  { from: [-22, 8, -16], bend: [5, 5, 8], at: 0.16 },
  { from: [27, -6, -34], bend: [-6, 4, 10], at: 0.48 },
  { from: [-7, -12, -52], bend: [3, -5, 12], at: 0.76 },
];
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const flat = (g: BufferGeometry) => (g.index ? g.toNonIndexed() : g);

interface BuiltBlade {
  spec: BladeSpec;
  geometry: BufferGeometry;
  /** Champagne parts that travel with the blade (inlay, clamp, strut) — or null. */
  hardware: BufferGeometry | null;
  curve: CatmullRomCurve3;
}

interface Built {
  blades: BuiltBlade[];
  glass: { geometry: BufferGeometry; order: number }[];
  spine: BufferGeometry;
  spineCurve: CatmullRomCurve3;
  collar: BufferGeometry;
}

function buildCore(segments: number): Built {
  const spineCurve = new CatmullRomCurve3(
    SPINE_POINTS.map((p) => new Vector3(...p)),
    false,
    "centripetal",
  );
  const spine = sweep(spineCurve, roundedRect(0.6, 0.6, 0.29, 4), {
    segments: segments * 2,
    taper: (u) => 0.28 + 0.72 * Math.pow(Math.sin(Math.PI * u), 0.35),
  });

  const blades = BLADES.map((spec): BuiltBlade => {
    const curve = bladeCurve(spec, 9);
    const mid = (spec.theta[0] + spec.theta[1]) / 2;
    const radial = new Vector3(Math.cos(mid * DEG), 0, Math.sin(mid * DEG));
    const up = spec.vertical ? radial : new Vector3(0, 1, 0);
    const taper = spec.vertical
      ? (u: number) => 0.5 + 0.5 * Math.pow(Math.sin(Math.PI * u), 0.45)
      : bladeTaper(0.3, 0.55);
    const twist = (u: number) => spec.twist * (u - 0.5) * 2;
    const profile = spec.vertical
      ? roundedRect(spec.width, spec.thickness, 0.07, 3)
      : roundedRect(spec.thickness, spec.width, 0.07, 3);
    const geometry = sweep(curve, profile, { segments, taper, twist, up });

    const parts: BufferGeometry[] = [];
    if (spec.trim) {
      // An inlay riding the blade's edge: same path, same taper, offset to the edge.
      const inlay = spec.vertical
        ? roundedRect(0.07, spec.thickness * 1.15, 0.025, 2).map(
            (v) => new Vector2(v.x + spec.trim! * (spec.width / 2 - 0.02), v.y),
          )
        : roundedRect(spec.thickness * 1.15, 0.07, 0.025, 2).map(
            (v) => new Vector2(v.x, v.y + spec.trim! * (spec.width / 2 - 0.02)),
          );
      parts.push(sweep(curve, inlay, { segments, taper, twist, up }));
    }
    if (spec.strut) {
      const m = curve.getPointAt(0.5);
      const tangent = curve.getTangentAt(0.5).normalize();
      const clamp = new RoundedBoxGeometry(0.3, 0.2, spec.width * 0.6 + 0.16, 2, 0.05);
      clamp.applyMatrix4(
        new Matrix4().compose(
          m,
          new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), tangent),
          new Vector3(1, 1, 1),
        ),
      );
      parts.push(clamp);
      const spinePoint = spineCurve.getPointAt(clamp01(0.5 - m.y / 11.4));
      const dir = spinePoint.clone().sub(m);
      const len = dir.length() * 0.9;
      dir.normalize();
      const strut = new CylinderGeometry(0.035, 0.035, len, 8, 1);
      strut.applyMatrix4(
        new Matrix4().compose(
          m.clone().addScaledVector(dir, len / 2),
          new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir),
          new Vector3(1, 1, 1),
        ),
      );
      parts.push(strut);
    }
    const hardware = parts.length ? mergeGeometries(parts.map(flat)) : null;
    return { spec, geometry, hardware, curve };
  });

  const glass = GLASS.map((spec) => ({
    geometry: sweep(bladeCurve(spec, 7), roundedRect(0.04, spec.width, 0.02, 2), {
      segments,
      taper: bladeTaper(0.55, 0.4),
    }),
    order: spec.order,
  }));

  // A machined band: flat face, chamfered lips — not a ring.
  const band = [
    [0.5, -0.14],
    [0.58, -0.14],
    [0.62, -0.1],
    [0.62, 0.1],
    [0.58, 0.14],
    [0.5, 0.14],
  ].map(([x, y]) => new Vector2(x, y));
  const collar = new LatheGeometry(band, 48);
  collar.rotateX(Math.PI / 2);
  return { blades, glass, spine, spineCurve, collar };
}

/** A piece's flight in from the dark: 0 = far away, 1 = in place. */
function placePiece(obj: Object3D, id: string, index: number, u: number) {
  const t = easeOut(u);
  const a = approachFor(id, index);
  const w0 = (1 - t) * (1 - t);
  const w1 = 2 * (1 - t) * t;
  obj.position.set(
    a.from[0] * w0 + (a.from[0] * 0.4 + a.bow[0]) * w1,
    a.from[1] * w0 + (a.from[1] * 0.4 + a.bow[1]) * w1,
    a.from[2] * w0 + (a.from[2] * 0.4 + a.bow[2]) * w1,
  );
  obj.rotation.set(0, a.spin * (1 - t), 0);
  obj.scale.setScalar(0.75 + 0.25 * t);
  obj.visible = u > 0;
}

/**
 * The Intelligence Core: assembles in Awakening, answers each context signal,
 * then opens and expands around the visitor in the Passage.
 */
const NO_CONTEXT = {
  capital: 0,
  skills: 0,
  location: 0,
  time: 0,
  experience: 0,
  access: 0,
  pulse: 0,
};
/** The finale core turns its S front (+z) toward the visitor. */
const FINALE_YAW = Math.atan2(SLAB_NORMAL.x, SLAB_NORMAL.z);

export function IntelligenceCore({ variant = "origin" }: { variant?: "origin" | "finale" }) {
  const finale = variant === "finale";
  const { store, materials, filaments, preset, animate } = useWorld();
  const root = useRef<Group>(null);
  const shell = useRef<Group>(null);
  const bladeGroups = useRef<(Group | null)[]>([]);
  const glassGroups = useRef<(Group | null)[]>([]);
  const spineGroup = useRef<Group>(null);
  const collarGroup = useRef<Group>(null);
  const energyGroup = useRef<Group>(null);
  const violetLight = useRef<PointLight>(null);
  const built = useMemo(() => buildCore(preset.coreSegments), [preset.coreSegments]);
  const fil = useMemo(() => filaments.range(`core-${variant}`, 32), [filaments, variant]);
  const scratch = useMemo(
    () => ({ m: new Matrix4(), v: new Vector3(), pts: [0, 1, 2, 3].map(() => new Vector3()) }),
    [],
  );

  useEffect(
    () => () => {
      for (const b of built.blades) {
        b.geometry.dispose();
        b.hardware?.dispose();
      }
      for (const g of built.glass) g.geometry.dispose();
      built.spine.dispose();
      built.collar.dispose();
    },
    [built],
  );

  useFrame(() => {
    const group = root.current;
    const shellGroup = shell.current;
    if (!group || !shellGroup) return;
    const s = store.state;
    const p = s.progress;
    const ct = finale ? finaleTransform(p) : coreTransform(p);
    group.visible = ct.visible;
    if (!ct.visible) {
      filaments.hideRange(fil);
      if (violetLight.current) violetLight.current.intensity = 0;
      return;
    }
    // The whole core settles its twist; only the shell expands in the passage.
    group.position.set(
      finale ? ct.position[0] : 0,
      finale ? ct.position[1] : 0,
      finale ? ct.position[2] : 0,
    );
    group.rotation.set(finale ? -0.12 : 0, finale ? FINALE_YAW : ct.spin, 0);
    group.updateMatrix();
    if (finale) shellGroup.position.set(0, 0, 0);
    else shellGroup.position.set(ct.position[0], ct.position[1], ct.position[2]);
    shellGroup.scale.setScalar(ct.scale);
    shellGroup.updateMatrix();
    shellGroup.matrixWorld.multiplyMatrices(group.matrix, shellGroup.matrix);

    const a = assembly(p, finale);
    const ctx = finale ? NO_CONTEXT : contextResponse(p);
    const t = animate ? s.time : 0;

    if (spineGroup.current) placePiece(spineGroup.current, "spine", 0, smoothstep(0.02, 0.3, a));
    if (collarGroup.current) {
      placePiece(collarGroup.current, "collar", 1, smoothstep(0.12, 0.38, a));
      // TIME: the collars step round like a calibrated mechanism.
      collarGroup.current.rotation.y += ctx.time * 0.9;
    }

    built.blades.forEach((b, i) => {
      const g = bladeGroups.current[i];
      if (!g) return;
      const start = b.spec.order * 0.72;
      placePiece(g, b.spec.id, i + 3, clamp01((a - start) / 0.3));
      // EXPERIENCE settles the layers inward; the passage swings the jambs aside.
      g.scale.multiplyScalar(1 - ctx.experience * 0.03 * (i % 3));
      if (b.spec.opens) g.rotation.y += b.spec.opens * ct.open * 24 * DEG;
    });
    built.glass.forEach((gl, i) => {
      const g = glassGroups.current[i];
      if (!g) return;
      placePiece(g, `glass${i}`, i + 40, clamp01((a - gl.order * 0.85) / 0.22));
      // LOCATION: the optical layers turn to a fixed coordinate.
      g.rotation.y += ctx.location * (i - 1) * 0.14;
    });

    // Violet intelligence wakes last and answers SKILLS.
    const wake = smoothstep(0.72, 1, a);
    if (energyGroup.current) {
      energyGroup.current.visible = wake > 0;
      energyGroup.current.scale.setScalar(0.4 + 0.6 * wake);
      energyGroup.current.rotation.y = t * 0.05;
    }
    if (violetLight.current) {
      violetLight.current.position.setFromMatrixPosition(group.matrix);
      violetLight.current.intensity =
        wake * (5 + ctx.skills * 8 + ctx.pulse * 7) * (1 - ct.open * 0.6);
    }

    // Gold conductive filaments: activate along each blade once it is in place.
    const { m, pts } = scratch;
    built.blades.forEach((b, i) => {
      const gi = bladeGroups.current[i];
      const idx = fil.start + i;
      if (!gi || !gi.visible) {
        filaments.hide(idx);
        return;
      }
      gi.updateMatrix();
      m.multiplyMatrices(b.spec.strut ? group.matrix : shellGroup.matrixWorld, gi.matrix);
      for (let j = 0; j < 4; j++) {
        b.curve.getPointAt(0.1 + (j / 3) * 0.8, pts[j]);
        const out = Math.hypot(pts[j].x, pts[j].z) || 1;
        pts[j].x += (pts[j].x / out) * b.spec.thickness * 0.7;
        pts[j].z += (pts[j].z / out) * b.spec.thickness * 0.7;
        pts[j].applyMatrix4(m);
      }
      const [p0, p1, p2, p3] = pts;
      // Cubic through four points: handles from the 1/3 and 2/3 samples.
      filaments.curve(
        idx,
        p0.x,
        p0.y,
        p0.z,
        (-5 * p0.x + 18 * p1.x - 9 * p2.x + 2 * p3.x) / 6,
        (-5 * p0.y + 18 * p1.y - 9 * p2.y + 2 * p3.y) / 6,
        (-5 * p0.z + 18 * p1.z - 9 * p2.z + 2 * p3.z) / 6,
        (2 * p0.x - 9 * p1.x + 18 * p2.x - 5 * p3.x) / 6,
        (2 * p0.y - 9 * p1.y + 18 * p2.y - 5 * p3.y) / 6,
        (2 * p0.z - 9 * p1.z + 18 * p2.z - 5 * p3.z) / 6,
        p3.x,
        p3.y,
        p3.z,
      );
      const grow = smoothstep(b.spec.order * 0.72 + 0.26, b.spec.order * 0.72 + 0.5, a);
      filaments.params(idx, {
        s1: grow,
        width: 0.05 * (b.spec.strut ? 1 : ct.scale),
        intensity: grow * (0.5 + ctx.pulse * 0.6 + ctx.skills * 0.45 + ct.open * 0.7) * ct.fade,
        pulse: 0.55 + ctx.skills * 0.6,
        phase: i * 0.137,
        speed: 0.16 + (i % 4) * 0.035,
      });
    });

    // Guides: filaments that draw the eye into the aperture, then run on inward.
    for (let j = 0; j < 4; j++) {
      const idx = fil.start + 20 + j;
      if (ct.guide <= 0) {
        filaments.hide(idx);
        continue;
      }
      const ang = (j / 4) * Math.PI * 2 + 0.6;
      const A = scratch.v
        .set(OPENING[0] + Math.cos(ang) * 1.6, OPENING[1] + Math.sin(ang) * 2.0, OPENING[2] + 0.4)
        .applyMatrix4(shellGroup.matrixWorld)
        .clone();
      const B = scratch.v
        .set(OPENING[0] + Math.cos(ang) * 0.12, OPENING[1] + Math.sin(ang) * 0.12, OPENING[2] - 9)
        .applyMatrix4(group.matrix)
        .clone();
      filaments.arc(idx, A.x, A.y, A.z, B.x, B.y, B.z);
      filaments.params(idx, {
        s1: ct.guide,
        width: 0.04,
        intensity: 0.85 * ct.guide * ct.fade,
        pulse: 1,
        phase: j * 0.25,
        speed: 0.45,
      });
    }

    // VOID: distant champagne signals appear one by one, then streak into the core.
    const v = local(p, "void");
    VOID_SIGNALS.forEach((sig, j) => {
      const idx = fil.start + 24 + j;
      const appear = finale ? 0 : smoothstep(sig.at, sig.at + 0.12, v);
      const travel = smoothstep(0.02 + j * 0.05, 0.3 + j * 0.05, a);
      if (appear <= 0 || travel >= 1) {
        filaments.hide(idx);
        return;
      }
      const [x, y, z] = sig.from;
      filaments.arc(idx, x, y, z, 0, 0, 0, sig.bend[0], sig.bend[1], sig.bend[2]);
      // Before travelling: a short glint at the far end. Travelling: a streak running in.
      const head = 0.03 + travel * 0.97;
      filaments.params(idx, {
        s0: Math.max(0, head - 0.025 - travel * 0.12),
        s1: head,
        width: 1.5 - travel * 0.9,
        intensity: appear * (2.4 + 0.5 * Math.sin(t * 1.7 + j)),
        pulse: 0,
      });
    });

    // Violet intelligence: three fine strands spiralling inside the spine's space.
    for (let j = 0; j < 3; j++) {
      const idx = fil.start + 28 + j;
      if (wake <= 0) {
        filaments.hide(idx);
        continue;
      }
      const ang = j * 2.094 + t * 0.12;
      const r = 0.95;
      const P = (yy: number, da: number) =>
        scratch.v
          .set(Math.cos(ang + da) * r + yy * -0.2, yy, Math.sin(ang + da) * r)
          .applyMatrix4(group.matrix)
          .clone();
      const A = P(-2.6, 0);
      const C1 = P(-0.9, 1.6);
      const C2 = P(0.9, 3.2);
      const B = P(2.6, 4.8);
      filaments.curve(idx, A.x, A.y, A.z, C1.x, C1.y, C1.z, C2.x, C2.y, C2.z, B.x, B.y, B.z);
      filaments.params(idx, {
        s1: wake,
        width: 0.035,
        intensity: wake * (0.7 + ctx.skills * 0.8 + ctx.pulse * 0.6) * (1 - ct.open),
        violet: 1,
        pulse: 0.8,
        phase: j * 0.33,
        speed: 0.22,
      });
    }
  });

  const bladeMesh = (b: BuiltBlade, i: number) => (
    <group
      key={b.spec.id}
      ref={(el) => {
        bladeGroups.current[i] = el;
      }}
    >
      <mesh geometry={b.geometry} material={materials.pearl} />
      {b.hardware && <mesh geometry={b.hardware} material={materials.champagne} />}
    </group>
  );

  return (
    <>
      <group ref={root} matrixAutoUpdate={false}>
        <group ref={spineGroup}>
          <mesh geometry={built.spine} material={materials.midnight} />
        </group>
        <group ref={collarGroup}>
          {COLLARS.map((u) => {
            const p = built.spineCurve.getPointAt(u);
            const tan = built.spineCurve.getTangentAt(u);
            const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), tan);
            return (
              <mesh
                key={u}
                geometry={built.collar}
                material={materials.champagne}
                position={p}
                quaternion={q}
              />
            );
          })}
        </group>
        {built.blades.filter((b) => b.spec.strut).map((b) => bladeMesh(b, built.blades.indexOf(b)))}
        <group ref={shell} matrixAutoUpdate={false}>
          {built.blades
            .filter((b) => !b.spec.strut)
            .map((b) => bladeMesh(b, built.blades.indexOf(b)))}
        </group>
        {built.glass.map((g, i) => (
          <group
            key={i}
            ref={(el) => {
              glassGroups.current[i] = el;
            }}
          >
            <mesh geometry={g.geometry} material={materials.glass} renderOrder={2} />
          </group>
        ))}
        <group ref={energyGroup} />
      </group>
      {/* Always in the scene (intensity only): toggling a light's visibility changes the
        light count and forces every lit shader to recompile mid-scroll. */}
      <pointLight ref={violetLight} color="#8f7fc0" intensity={0} distance={12} decay={2} />
    </>
  );
}
