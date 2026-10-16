import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  type PointLight,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { smoothstep } from "../../math";
import { local } from "../../timeline/timeline";
import { frameGeometry, plateGeometry } from "../geometry/frames";
import { COLORS } from "../layout";
import { lightAt } from "../tone";
import { useWorld } from "../WorldContext";
import {
  CHANNEL,
  chainAt,
  chainNormal,
  chainSpan,
  crescentOutline,
  PORTS,
  portLocal,
  S_MID,
  S_SCALE,
  TRACES,
  WAFER,
  WAFER_Z,
} from "./core-design";
import { enginePose, type EnginePose } from "./core-motion";
import { bladeMatrix, buildLens, LENS, LENS_TRACES } from "./lens";
import { buildFaceDetail, buildSeamLight, buildShell, rimNormal, shellPoint } from "./s-shell";
import { S_INNER, S_OUTER } from "./s-mark";

/**
 * The void: the founder's signals already run through the Engine's own channels. Each travels one
 * edge of the S (channel k, outer/inner chain) and draws it in light behind it — seen so close at
 * first that the lines read as abstract curves. Appears at void-local `at`.
 */
const VOID_RUNS: { k: number; ci: number; at: number }[] = [
  { k: 0, ci: 0, at: -0.4 },
  { k: 0, ci: 1, at: 0.15 },
  { k: 1, ci: 0, at: 0.4 },
];
/** How far along its edge (0 → 1) each void signal has drawn at progress p. */
function voidHeads(p: number): number[] {
  const vv = local(p, "void");
  const aa = local(p, "awakening");
  return VOID_RUNS.map((r) =>
    Math.min(1, 0.82 * smoothstep(r.at, r.at + 0.8, vv) + 0.18 * smoothstep(0, 0.22, aa)),
  );
}
/** Faint distant structure glimpsed through the aperture before the reveal. */
const HINTS: [number, number, number][] = [
  [-9, 1.5, -30],
  [7, -2.5, -38],
  [1.5, 4.5, -47],
  [-4, -3.5, -54],
];
/** Founder-signal weights in the illustrative scoring model (channel width). */
const WEIGHTS = [0.22, 0.22, 0.1, 0.16, 0.14, 0.16];
/** Inner-edge points where connectors reach into the counter. */
const STRUT_U = [0.08, 0.34];
const GOLD = new Color(COLORS.edgeGold);
/** The lit inner bevel: a deeper gold, so it reads as light on metal rather than paint. */
const SEAM_GOLD = new Color("#E9C48A");
const INDIGO = new Color(COLORS.indigo);
const VIOLET = new Color(COLORS.violetGlow);
/**
 * The symbol's surface follows the world: graphite on pearl, pearl on graphite — matte and
 * calm, with a fraction of the old metallic reflection (the mark is never redrawn, only lit).
 */
const S_ON_LIGHT = new Color("#2B3039");
const S_ON_DARK = new Color("#E4E0D6");
/** Glow budget of the mark — the warm core, the inner light, the point lights (≈ 25% of before). */
const GLOW = 0.25;

function buildEngine() {
  // The channel: a machined shell (s-shell.ts) with its groove and the gold inner light.
  return {
    shell: buildShell(),
    detail: buildFaceDetail(),
    seam: buildSeamLight(),
    // The optical kernel (lens.ts) and its warm core light.
    ...buildLens(),
    core: new PlaneGeometry(0.9, 0.9),
    unit: new BoxGeometry(1, 1, 1),
    pad: new BoxGeometry(0.07, 0.07, 0.012),
    strut: new CylinderGeometry(0.05, 0.05, 1, 12, 1).translate(0, 0.5, 0),
    collar: new CylinderGeometry(0.1, 0.1, 0.12, 16, 1),
    socket: new RoundedBoxGeometry(0.62, 0.36, 0.34, 2, 0.06),
  };
}

const ONE = new Vector3(1, 1, 1);
const Z_AXIS = new Vector3(0, 0, 1);
const Y_AXIS = new Vector3(0, 1, 0);
const BASE = [new Quaternion(), new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI)];

interface Flight {
  from: Vector3;
  via: Vector3;
  turn: Quaternion;
}

export function IntelligenceCore({ variant = "origin" }: { variant?: "origin" | "finale" }) {
  const finale = variant === "finale";
  const { store, materials, filaments, animate } = useWorld();
  const root = useRef<Group>(null);
  const channelGroups = useRef<(Group | null)[]>([]);
  const bezels = useRef<InstancedMesh>(null);
  const lip = useRef<InstancedMesh>(null);
  const barrel = useRef<InstancedMesh>(null);
  const planes = useRef<InstancedMesh>(null);
  const blades = useRef<InstancedMesh>(null);
  const core = useRef<Mesh>(null);
  const traces = useRef<InstancedMesh>(null);
  const pads = useRef<InstancedMesh>(null);
  const struts = useRef<InstancedMesh>(null);
  const collars = useRef<InstancedMesh>(null);
  const sockets = useRef<InstancedMesh>(null);
  const portLights = useRef<InstancedMesh>(null);
  const violetLight = useRef<PointLight>(null);
  const goldLight = useRef<PointLight>(null);
  const built = useMemo(() => buildEngine(), []);
  const seamMaterial = useMemo(
    () => new MeshBasicMaterial({ color: GOLD.clone(), vertexColors: true, side: DoubleSide }),
    [],
  );
  const fil = useMemo(() => filaments.range(`core-${variant}`, 45), [filaments, variant]);
  // The barrel is seen from inside when the camera travels through the lens.
  const barrelMaterial = useMemo(() => {
    const mat = materials.graphite.clone();
    mat.side = DoubleSide;
    return mat;
  }, [materials.graphite]);
  // The warm core: the logo light in the counter, seen through the closed iris.
  const coreMaterial = useMemo(() => {
    // A soft radial falloff, added to the frame: light, not a coin.
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d")!;
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, "rgba(255,255,255,0.85)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.22)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return new MeshBasicMaterial({
      color: GOLD.clone(),
      map: new CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
  }, []);
  // Body (group 0) and the chamfers / lips (group 1): a razor champagne edge, brushed and quiet
  // rather than mirror-bright.
  const edgeMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: COLORS.champagne,
        metalness: 0.55,
        roughness: 0.46,
        envMapIntensity: 0.45,
      }),
    [],
  );
  const shellMaterials = useMemo(
    () => [materials.sMetal, edgeMaterial],
    [materials.sMetal, edgeMaterial],
  );

  // Flights in (origin): fixed points derived from the camera path, so pure in scroll. The first
  // channel sweeps past the lens; its complement rises out of the dark beyond.
  // Each channel descends onto the line already drawn for it, from just in front of the S —
  // the metal lands where the signals were travelling, it does not fly in from elsewhere.
  const flights = useMemo<Flight[]>(
    () => [
      {
        from: new Vector3(-1.6, 1.2, 7),
        via: new Vector3(-0.5, 0.4, 2.4),
        turn: new Quaternion().setFromEuler(new Euler(0.28, -0.34, 0.12)),
      },
      {
        from: new Vector3(1.6, -1.2, 7),
        via: new Vector3(0.5, -0.4, 2.4),
        turn: new Quaternion().setFromEuler(new Euler(-0.28, 0.34, -0.12)),
      },
    ],
    [],
  );

  const scratch = useMemo(
    () => ({
      place: new Matrix4(),
      ch: [new Matrix4(), new Matrix4()],
      rest: [new Matrix4(), new Matrix4()],
      lock: [new Matrix4(), new Matrix4()],
      m: new Matrix4(),
      lm: new Matrix4(),
      q: new Quaternion(),
      q2: new Quaternion(),
      e: new Euler(),
      v: new Vector3(),
      w: new Vector3(),
      pos: new Vector3(),
      scl: new Vector3(),
      o: new Object3D(),
      c: new Color(),
      pts: [0, 1, 2, 3].map(() => new Vector3()),
    }),
    [],
  );

  // Per-instance colour buffers exist from the first frame, so the warm-up compiles the right
  // programs (creating them later would recompile mid-scroll, e.g. when the finale appears).
  useLayoutEffect(() => {
    const black = new Color(0, 0, 0);
    for (const mesh of [traces.current, pads.current, portLights.current]) {
      if (!mesh) continue;
      for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, black);
    }
  }, []);

  useEffect(
    () => () => {
      [
        built.shell,
        built.detail,
        built.seam,
        built.bezel,
        built.lip,
        built.barrel,
        built.plane,
        built.blade,
        built.core,
        built.unit,
        built.pad,
        built.strut,
        built.collar,
        built.socket,
      ].forEach((g) => g.dispose());
      seamMaterial.dispose();
      edgeMaterial.dispose();
      barrelMaterial.dispose();
      coreMaterial.map?.dispose();
      coreMaterial.dispose();
    },
    [built, seamMaterial, edgeMaterial, barrelMaterial, coreMaterial],
  );

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const s = store.state;
    const p = s.progress;
    const pose = enginePose(p, finale);
    group.visible = pose.visible;
    if (!pose.visible) {
      filaments.hideRange(fil);
      if (violetLight.current) violetLight.current.intensity = 0;
      if (goldLight.current) goldLight.current.intensity = 0;
      return;
    }
    const t = animate ? s.time : 0;
    const { place, ch, rest, lock, m, q, q2, e, v, w, pos, scl, o, c, pts } = scratch;

    // The symbol's surface for the current world (shared by both variants: same tone, same value).
    const L = lightAt(p);
    const sm = materials.sMetal;
    sm.color.copy(S_ON_DARK).lerp(S_ON_LIGHT, L);
    sm.metalness = 0.18 + 0.4 * L;
    sm.roughness = 0.5 - 0.08 * L;
    sm.envMapIntensity = 0.42;

    // Engine placement.
    e.set(pose.pitch, pose.yaw, 0, "YXZ");
    place.compose(v.set(...pose.position), q.setFromEuler(e), ONE);

    // Channels: placement × offset × rotation × base (the lower channel is the upper, turned 180°).
    pose.channels.forEach((cp, k) => {
      const g = channelGroups.current[k];
      e.set(cp.rx, cp.ry, cp.rz);
      q.setFromEuler(e).multiply(BASE[k]);
      rest[k].multiplyMatrices(place, m.compose(v.set(cp.x, cp.y, cp.z), q, ONE));
      lock[k].multiplyMatrices(place, m.makeRotationFromQuaternion(BASE[k]));
      const u = Math.min(1, Math.max(0, cp.arrive));
      if (u < 1 && !finale) {
        const f = flights[k];
        const ease = 1 - Math.pow(1 - u, 2.4);
        pos.copy(f.from).multiplyScalar((1 - ease) * (1 - ease));
        pos
          .addScaledVector(f.via, 2 * (1 - ease) * ease)
          .addScaledVector(v.set(cp.x, cp.y, cp.z), ease * ease);
        q2.copy(f.turn)
          .multiply(BASE[k])
          .slerp(q, smoothstep(0.2, 1, u));
        ch[k].multiplyMatrices(place, m.compose(pos, q2, ONE));
      } else {
        ch[k].copy(rest[k]);
      }
      if (g) {
        g.visible = u > 0;
        g.matrix.copy(ch[k]);
        g.matrixWorldNeedsUpdate = true;
      }
    });

    // The optical kernel. Elements (pose.wafers): 0 front bezel + iris, 1-3 computation planes,
    // 4 rear bezel + barrel. Each settles in along the axis; a founder signal turns its plane a
    // precise step; the aperture opens the iris and turns the planes like a combination lock.
    const el = pose.wafers;
    const arriveOf = (j: number) => Math.min(1, Math.max(0, el[j].arrive));
    const settleZ = (j: number) => (1 - arriveOf(j)) * (j % 2 ? -5 : 5);
    const shown = (j: number) => (arriveOf(j) > 0.001 ? 1 : 0.0001);
    const opening = Math.min(1, el[0].split / 1.3);
    const turn = (j: number) =>
      el[j].slide * 2.6 + (j % 2 ? 1 : -1) * 0.7 * Math.min(1, el[j].split / 1.3);
    if (bezels.current && barrel.current && planes.current && blades.current) {
      ([0, 4] as const).forEach((j, n) => {
        o.position.set(0, 0, el[j].z + settleZ(j));
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(shown(j));
        o.updateMatrix();
        bezels.current!.setMatrixAt(n, m.multiplyMatrices(place, o.matrix));
        if (j === 0 && lip.current) {
          lip.current.setMatrixAt(0, m);
          lip.current.instanceMatrix.needsUpdate = true;
        }
      });
      o.position.set(0, 0, (el[0].z + el[4].z) / 2 + settleZ(4));
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(shown(4));
      o.updateMatrix();
      barrel.current.setMatrixAt(0, m.multiplyMatrices(place, o.matrix));
      for (let j = 1; j <= 3; j++) {
        o.position.set(0, 0, el[j].z + settleZ(j));
        o.rotation.set(0, 0, turn(j));
        o.scale.setScalar(shown(j));
        o.updateMatrix();
        planes.current.setMatrixAt(j - 1, m.multiplyMatrices(place, o.matrix));
      }
      for (let k = 0; k < LENS.blades; k++) {
        bladeMatrix(k, opening, scratch.lm);
        scratch.lm.elements[14] += settleZ(0);
        if (shown(0) < 1) scratch.lm.scale(v.setScalar(0.0001));
        blades.current.setMatrixAt(k, m.multiplyMatrices(place, scratch.lm));
      }
      for (const mesh of [bezels.current, barrel.current, planes.current, blades.current])
        mesh.instanceMatrix.needsUpdate = true;
    }
    // Radial traces and inference pads on the planes: input, routing, processing - front to
    // back, each plane sweeping round in order (organised, never random).
    if (traces.current && pads.current) {
      LENS_TRACES.forEach((tr, i) => {
        const j = tr.plane + 1;
        const wf = el[j];
        const a = tr.angle + turn(j);
        const z = wf.z + settleZ(j) + 0.006;
        const rm = (tr.r0 + tr.r1) / 2;
        o.position.set(Math.cos(a) * rm, Math.sin(a) * rm, z);
        o.rotation.set(0, 0, a);
        o.scale.set(tr.r1 - tr.r0, 0.012, 0.006);
        if (shown(j) < 1) o.scale.setScalar(0.0001);
        o.updateMatrix();
        traces.current!.setMatrixAt(i, m.multiplyMatrices(place, o.matrix));
        o.position.set(Math.cos(a) * tr.r1, Math.sin(a) * tr.r1, z);
        o.scale.setScalar(shown(j));
        o.updateMatrix();
        pads.current!.setMatrixAt(i, m.multiplyMatrices(place, o.matrix));
        const order = tr.plane / 3 + (i % 9) / 27;
        const sweep = smoothstep(0, 1, wf.glow * 2.2 - order * 1.6);
        const wave = 0.5 + 0.5 * Math.sin(t * 2.1 - i * 0.61);
        traces.current!.setColorAt(
          i,
          c.copy(INDIGO).multiplyScalar(sweep * (0.14 + 0.3 * wf.glow)),
        );
        // The two founder signals each plane calibrates on flash gold as they are absorbed.
        const d0 = pose.docked[tr.plane * 2] ?? 0;
        const d1 = pose.docked[tr.plane * 2 + 1] ?? 0;
        const flash = Math.max(d0 * (1 - d0), d1 * (1 - d1)) * 4;
        c.copy(VIOLET)
          .multiplyScalar(sweep * (0.18 + 0.7 * wf.glow * wave))
          .lerp(GOLD, Math.min(1, flash));
        pads.current!.setColorAt(i, c);
      });
      for (const mesh of [traces.current, pads.current]) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    // Decision: the warm core behind the iris - through the pinhole, the logo light. It yields
    // as the iris opens (what the lens contains is seen instead).
    if (core.current) {
      const lum =
        (finale ? pose.seam : pose.kernel * (0.55 + 0.45 * pose.energy)) *
        (1 - smoothstep(0, 0.4, opening));
      o.position.set(0, 0, LENS.irisZ - 0.07 + settleZ(0));
      o.rotation.set(0, 0, 0);
      // In the emblem the core is a small, deep point of light — it never competes with the S.
      o.scale.setScalar(lum > 0.01 ? (finale ? 0.62 : 1) : 0.0001);
      o.updateMatrix();
      core.current.matrix.multiplyMatrices(place, o.matrix);
      core.current.matrixWorldNeedsUpdate = true;
      coreMaterial.color
        .copy(SEAM_GOLD)
        .multiplyScalar((finale ? 0.3 + 0.95 * lum : 0.4 + 1.4 * lum) * GLOW);
    }

    // Connectors: precision struts from each channel's inner edge into the counter.
    if (struts.current && collars.current) {
      let n = 0;
      for (let k = 0; k < 2; k++) {
        for (const u of STRUT_U) {
          // From the channel inner edge straight to the lens bezel.
          const [x, y] = chainAt(S_INNER, u);
          const r = Math.hypot(x, y);
          const nx = -x / r;
          const ny = -y / r;
          const len = Math.max(0.02, r * S_SCALE - LENS.outer - 0.03) * pose.connectors;
          o.position.set(x * S_SCALE, y * S_SCALE, 0);
          o.quaternion.setFromUnitVectors(Y_AXIS, v.set(nx, ny, 0));
          o.scale.set(1, Math.max(0.0001, len), 1);
          o.updateMatrix();
          struts.current.setMatrixAt(n, m.multiplyMatrices(ch[k], o.matrix));
          o.position.set(x * S_SCALE + nx * len, y * S_SCALE + ny * len, 0);
          o.scale.setScalar(pose.connectors > 0.02 ? 1 : 0.0001);
          o.updateMatrix();
          collars.current.setMatrixAt(n, m.multiplyMatrices(ch[k], o.matrix));
          n++;
        }
      }
      struts.current.instanceMatrix.needsUpdate = true;
      collars.current.instanceMatrix.needsUpdate = true;
    }

    // Ports on the outer edges: idle indigo → gold once the founder's signal has docked.
    if (sockets.current && portLights.current) {
      PORTS.forEach((pt, i) => {
        const { x, y, nx, ny } = portLocal(i);
        // A port exists only with its channel (never floating ahead of the metal).
        const present = pose.channels[pt.channel].arrive > 0.001 ? 1 : 0.0001;
        o.position.set(x * S_SCALE + nx * 0.2, y * S_SCALE + ny * 0.2, 0);
        o.quaternion.setFromUnitVectors(Y_AXIS, v.set(nx, ny, 0));
        o.scale.setScalar(present);
        o.updateMatrix();
        sockets.current!.setMatrixAt(i, m.multiplyMatrices(ch[pt.channel], o.matrix));
        o.position.z += 0.19;
        o.scale.set(0.34 * present, 0.06 * present, 0.02 * present);
        o.updateMatrix();
        portLights.current!.setMatrixAt(i, m.multiplyMatrices(ch[pt.channel], o.matrix));
        const d = pose.docked[i];
        c.copy(INDIGO)
          .multiplyScalar(0.4 * pose.kernel)
          .lerp(GOLD, d);
        portLights.current!.setColorAt(i, c.multiplyScalar(0.6 + 0.8 * d));
      });
      sockets.current.instanceMatrix.needsUpdate = true;
      portLights.current.instanceMatrix.needsUpdate = true;
      if (portLights.current.instanceColor) portLights.current.instanceColor.needsUpdate = true;
    }

    // The gold inner light, and the two constant-count lights. In the emblem the lit band blooms
    // only as the champagne edge closes — the light is the result, not the decoration.
    const band = finale ? smoothstep(0.7, 1, pose.seam) : pose.seam;
    // A thin champagne line, not a lit band: full colour on pearl (it is ink there), restrained
    // in the dark.
    seamMaterial.color
      .copy(SEAM_GOLD)
      .multiplyScalar(band * (0.42 + 0.4 * L) * (finale ? 1 : 1 + 0.1 * pose.pulse));
    for (const g of channelGroups.current) {
      const seam = g?.children.find((ch) => ch.userData.seam);
      if (seam) seam.visible = band > 0.01;
    }
    if (violetLight.current) {
      violetLight.current.position.setFromMatrixPosition(place);
      // Close to the aperture the kernel light yields: the lens is lit by its own traces.
      const near = finale ? 0 : smoothstep(0.4, 0.5, local(p, "passage"));
      violetLight.current.intensity =
        pose.kernel * (2 + pose.energy * 4 + pose.pulse * 3) * (1 - 0.9 * near) * GLOW;
    }
    if (goldLight.current) {
      goldLight.current.position.copy(v.set(0, 0, 0.9).applyMatrix4(place));
      goldLight.current.intensity = band * (finale ? 9 : 7) * GLOW;
    }

    // ---- Filaments ------------------------------------------------------------------
    renderFilaments(pose, fil.start, finale, p, t);
    filaments.hide(fil.start + 41);

    function cubicThrough(idx: number, a: Vector3, b: Vector3, c2: Vector3, d: Vector3) {
      filaments.curve(
        idx,
        a.x,
        a.y,
        a.z,
        (-5 * a.x + 18 * b.x - 9 * c2.x + 2 * d.x) / 6,
        (-5 * a.y + 18 * b.y - 9 * c2.y + 2 * d.y) / 6,
        (-5 * a.z + 18 * b.z - 9 * c2.z + 2 * d.z) / 6,
        (2 * a.x - 9 * b.x + 18 * c2.x - 5 * d.x) / 6,
        (2 * a.y - 9 * b.y + 18 * c2.y - 5 * d.y) / 6,
        (2 * a.z - 9 * b.z + 18 * c2.z - 5 * d.z) / 6,
        d.x,
        d.y,
        d.z,
      );
    }

    function spanTo(
      matrix: Matrix4,
      chain: readonly (readonly [number, number])[],
      u0: number,
      u1: number,
      z: number,
    ) {
      chainSpan(chain, u0, u1).forEach(([x, y], i) =>
        pts[i].set(x * S_SCALE, y * S_SCALE, z).applyMatrix4(matrix),
      );
    }

    function renderFilaments(
      pose: EnginePose,
      base: number,
      finale: boolean,
      p: number,
      t: number,
    ) {
      const front = CHANNEL.depth / 2 + CHANNEL.coverDepth + 0.05;
      // 0–15: the S drawn in light — reference channels (outer + inner, both channels), then
      // the inner ones stay as the gold seam once the metal is in place.
      const heads = finale ? [0, 0, 0] : voidHeads(p);
      // In the void the lines are faint traces; they gain presence as the S resolves.
      const gain = finale ? 1 : 0.5 + 0.5 * smoothstep(0, 0.3, local(p, "awakening"));
      for (let k = 0; k < 2; k++) {
        const bp = Math.min(1, Math.max(0, (pose.blueprint - k * 0.12) / 0.88));
        for (let ci = 0; ci < 2; ci++) {
          const innerChain = ci === 1;
          const run = VOID_RUNS.findIndex((r) => r.k === k && r.ci === ci);
          const drawn = Math.max(bp, run >= 0 ? heads[run] : 0);
          for (let sIdx = 0; sIdx < 4; sIdx++) {
            const idx = base + k * 8 + ci * 4 + sIdx;
            const grow = Math.min(1, Math.max(0, drawn * 4 - sIdx));
            if (finale && innerChain) {
              // The emblem's inner edge: first the violet trace (it calms with the outer one),
              // then the champagne edge drawing tip to tip — the S closes when it arrives.
              const seamGrow = Math.min(1, Math.max(0, pose.seam * 4 - sIdx));
              const trace = grow * (1 - pose.blueprintFade) * 0.6;
              const gold = seamGrow > 0.001;
              if (!gold && trace <= 0.01) {
                filaments.hide(idx);
                continue;
              }
              const mtx = pose.channels[k].arrive >= 1 ? ch[k] : lock[k];
              spanTo(mtx, S_INNER, sIdx / 4, (sIdx + 1) / 4, 0);
              const [nx, ny] = chainNormal(S_INNER, S_OUTER, (sIdx + 0.5) / 4);
              w.set(nx * 0.08, ny * 0.08, 0)
                .transformDirection(mtx)
                .multiplyScalar(0.08);
              pts.forEach((pt) => pt.add(w));
              cubicThrough(idx, pts[0], pts[1], pts[2], pts[3]);
              filaments.params(idx, {
                s1: gold ? seamGrow : grow,
                width: gold ? 0.024 : 0.026,
                intensity: gold ? 0.85 : trace,
                violet: gold ? 0 : 0.85,
                pulse: gold ? 0.25 : 1.4,
                phase: (k * 8 + ci * 4 + sIdx) * 0.07,
                speed: 0.4,
              });
              continue;
            }
            const fadeOuter = innerChain ? 0 : pose.blueprintFade;
            const seamOn = innerChain ? pose.seam : 0;
            const intensity =
              grow *
              ((1 - fadeOuter) * (finale ? 1.15 : 0.75) * gain * (innerChain ? 1 - pose.seam : 1) +
                seamOn * 1.1);
            if (intensity <= 0.01) {
              filaments.hide(idx);
              continue;
            }
            const chain = innerChain ? S_INNER : S_OUTER;
            // Before its channel arrives the blueprint sits where the metal will lock (in the
            // finale: the emblem's final place — the S is drawn in light, then the metal lands).
            const mtx = pose.channels[k].arrive >= 1 ? ch[k] : finale ? lock[k] : rest[k];
            spanTo(mtx, chain, sIdx / 4, (sIdx + 1) / 4, 0);
            if (innerChain) {
              // The seam rides just off the concave edge, into the counter.
              const [nx, ny] = chainNormal(S_INNER, S_OUTER, (sIdx + 0.5) / 4);
              w.set(nx * 0.08, ny * 0.08, 0)
                .transformDirection(mtx)
                .multiplyScalar(0.08);
              pts.forEach((pt) => pt.add(w));
            }
            cubicThrough(idx, pts[0], pts[1], pts[2], pts[3]);
            filaments.params(idx, {
              s1: grow,
              width: innerChain && seamOn > 0 ? 0.045 : finale ? 0.034 : 0.022,
              intensity,
              violet: innerChain ? 1 - seamOn : 0.85,
              pulse: innerChain ? 0.6 : 1.4,
              phase: (k * 8 + ci * 4 + sIdx) * 0.07,
              speed: 0.4,
            });
          }
        }
      }
      // 16–21: the S's centre channels — energy routed along each channel's face.
      for (let k = 0; k < 2; k++) {
        for (let sIdx = 0; sIdx < 3; sIdx++) {
          const idx = base + 16 + k * 3 + sIdx;
          const on = Math.min(1, Math.max(0, pose.route * 3 - sIdx));
          if (on <= 0.01 || pose.channels[k].arrive < 1) {
            filaments.hide(idx);
            continue;
          }
          // In the machined groove along the channel's face.
          const u0 = 0.07 + sIdx * 0.287;
          for (let q = 0; q < 4; q++)
            shellPoint(u0 + (0.287 * q) / 3, 0.42, 1, 0.012, pts[q]).applyMatrix4(ch[k]);
          cubicThrough(idx, pts[0], pts[1], pts[2], pts[3]);
          filaments.params(idx, {
            s1: on,
            width: 0.022,
            intensity: (0.38 + pose.energy * 0.3 + pose.pulse * 0.5) * (finale ? 1.4 : 1),
            violet: finale ? 0.15 : 0.9,
            pulse: 1.4,
            phase: k * 0.5 + sIdx * 0.17,
            speed: 0.55,
          });
        }
      }
      // 22–27: founder acquisition — a short stroke from the port into the S's own centre
      // channel as the signal docks (the S then carries it), width by the signal's weight.
      PORTS.forEach((pt, i) => {
        const idx = base + 22 + i;
        const d = pose.docked[i];
        if (d <= 0 || d >= 1 || finale || pose.channels[pt.channel].arrive < 1) {
          filaments.hide(idx);
          return;
        }
        // From the port on the rim, over the face, into the groove (the S then carries it).
        const B = shellPoint(pt.u, 0.42, 1, 0.012, pts[3]);
        const A = shellPoint(pt.u, 0, 1, 0, pts[0]).addScaledVector(rimNormal(pt.u, w), 0.3);
        A.z = 0.2;
        const C1 = pts[1].copy(A).lerp(B, 0.35);
        C1.z += 0.45;
        const C2 = pts[2].copy(B);
        C2.z += 0.2;
        for (const q of [A, C1, C2, B]) q.applyMatrix4(ch[pt.channel]);
        filaments.curve(idx, A.x, A.y, A.z, C1.x, C1.y, C1.z, C2.x, C2.y, C2.z, B.x, B.y, B.z);
        filaments.params(idx, {
          s0: smoothstep(0.55, 1, d),
          s1: smoothstep(0, 0.6, d),
          width: 0.016 + WEIGHTS[i] * 0.07,
          intensity: 0.9,
          pulse: 1.2,
          phase: i * 0.17,
          speed: 0.5,
        });
      });
      // 28-32: unused since the lens kernel.
      for (let j = 0; j < 5; j++) filaments.hide(base + 28 + j);
      // 33–35: VOID — the founder's signals, each a bright head riding one edge of the S and
      // drawing it (the line behind it is the blueprint, 0–15). 42–44: the tail across the
      // previous quarter when the head has just crossed into a new one. They are absorbed as
      // the S resolves.
      {
        const heads = voidHeads(p);
        const vv = local(p, "void");
        const fade = finale ? 0 : 1 - smoothstep(0.12, 0.24, local(p, "awakening"));
        VOID_RUNS.forEach((r, j) => {
          const idx = base + 33 + j;
          const tail = base + 42 + j;
          const h = heads[j];
          const appear = smoothstep(r.at, r.at + 0.1, vv);
          if (fade <= 0.001 || appear <= 0.001 || h <= 0.001 || h >= 0.999) {
            filaments.hide(idx);
            filaments.hide(tail);
            return;
          }
          const chain = r.ci ? S_INNER : S_OUTER;
          const qi = Math.min(3, Math.floor(h * 4));
          const u = h * 4 - qi;
          const len = 0.4;
          spanTo(rest[r.k], chain, qi / 4, (qi + 1) / 4, 0);
          cubicThrough(idx, pts[0], pts[1], pts[2], pts[3]);
          // On the pearl the head is drawn in ink: a fine, quiet stroke rather than a bright one.
          const glow = appear * fade * (2.2 + 0.4 * Math.sin(t * 1.7 + j)) * (1 - 0.6 * L);
          filaments.params(idx, {
            s0: Math.max(0, u - len),
            s1: u,
            width: 0.07 - 0.03 * L,
            intensity: glow,
            violet: j === 1 ? 0.8 : 0.15,
            pulse: 0,
          });
          if (u < len && qi > 0) {
            spanTo(rest[r.k], chain, (qi - 1) / 4, qi / 4, 0);
            cubicThrough(tail, pts[0], pts[1], pts[2], pts[3]);
            filaments.params(tail, {
              s0: 1 - (len - u),
              s1: 1,
              width: 0.07 - 0.03 * L,
              intensity: glow,
              violet: j === 1 ? 0.8 : 0.15,
              pulse: 0,
            });
          } else filaments.hide(tail);
        });
      }
      // 36: the gold signal that leads the camera into the aperture.
      {
        const idx = base + 36;
        if (pose.signal <= 0 || pose.signal >= 1 || finale) filaments.hide(idx);
        else {
          filaments.arc(idx, 0.05, 0.25, 16, 0.05, 0.1, -46);
          const head = pose.signal;
          filaments.params(idx, {
            s0: Math.max(0, head - 0.07),
            s1: head,
            width: 0.09,
            intensity: 2.2,
            pulse: 0,
          });
        }
      }
      // 37–40: inside the aperture, faint structure far ahead.
      for (let j = 0; j < 4; j++) {
        const idx = base + 37 + j;
        if (pose.hint <= 0) {
          filaments.hide(idx);
          continue;
        }
        const [x, y, z] = HINTS[j];
        filaments.arc(idx, x - 16, y, z, x + 16, y - 1.5, z - 6, 0, 2.5, 0);
        filaments.params(idx, {
          s0: 0.5 - 0.5 * pose.hint,
          s1: 0.5 + 0.5 * pose.hint,
          width: 0.07,
          intensity: pose.hint * 0.75,
          violet: j % 2 ? 0.7 : 0,
          pulse: 1.2,
          phase: j * 0.3,
          speed: 0.35,
        });
      }
    }
  });

  return (
    <>
      <group ref={root}>
        {[0, 1].map((k) => (
          <group
            key={k}
            matrixAutoUpdate={false}
            ref={(el) => {
              channelGroups.current[k] = el;
            }}
          >
            <mesh geometry={built.shell} material={shellMaterials} />
            <mesh geometry={built.detail} material={materials.graphite} />
            <mesh geometry={built.seam} material={seamMaterial} userData={{ seam: true }} />
          </group>
        ))}
        <instancedMesh
          ref={bezels}
          args={[built.bezel, materials.titanium, 2]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={lip}
          args={[built.lip, materials.champagne, 1]}
          frustumCulled={false}
          visible={!finale}
        />
        <instancedMesh
          ref={barrel}
          args={[built.barrel, barrelMaterial, 1]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={planes}
          args={[built.plane, materials.smoked, 3]}
          frustumCulled={false}
          renderOrder={2}
        />
        <instancedMesh
          ref={blades}
          args={[built.blade, materials.graphite, LENS.blades]}
          frustumCulled={false}
        />
        <mesh
          ref={core}
          geometry={built.core}
          material={coreMaterial}
          matrixAutoUpdate={false}
          frustumCulled={false}
        />
        <instancedMesh
          ref={traces}
          args={[built.unit, materials.energy, LENS_TRACES.length]}
          frustumCulled={false}
          visible={!finale}
        />
        <instancedMesh
          ref={pads}
          args={[built.pad, materials.energy, LENS_TRACES.length]}
          frustumCulled={false}
          visible={!finale}
        />
        <instancedMesh
          ref={struts}
          args={[built.strut, materials.titanium, 4]}
          frustumCulled={false}
          visible={!finale}
        />
        <instancedMesh
          ref={collars}
          args={[built.collar, materials.champagne, 4]}
          frustumCulled={false}
          visible={!finale}
        />
        <instancedMesh
          ref={sockets}
          args={[built.socket, materials.graphite, PORTS.length]}
          frustumCulled={false}
          visible={!finale}
        />
        <instancedMesh
          ref={portLights}
          args={[built.unit, materials.energy, PORTS.length]}
          frustumCulled={false}
          visible={!finale}
        />
      </group>
      {/* Always in the scene (intensity only): toggling a light changes the light count and
        forces every lit shader to recompile mid-scroll. */}
      <pointLight ref={violetLight} color="#8f7fe8" intensity={0} distance={14} decay={2} />
      <pointLight ref={goldLight} color="#f2c98c" intensity={0} distance={16} decay={2} />
    </>
  );
}
