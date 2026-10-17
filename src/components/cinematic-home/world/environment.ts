import {
  BackSide,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  OrthographicCamera,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  type Material,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** The PMREM internals (three 0.186) that let its filter shaders be compiled before it renders. */
interface PmremInternals {
  _setSize?: (size: number) => void;
  _allocateTargets?: () => WebGLRenderTarget;
  _blurMaterial?: Material | null;
  _ggxMaterial?: Material | null;
  _lodMeshes?: Mesh[];
}

/**
 * The studio environment (a prefiltered RoomEnvironment) — built WITHOUT stalling the page.
 *
 * PMREM renders the room into a half-float target with no tone mapping, then filters it with its
 * blur and GGX shaders. Rendered straight away, each of those programs compiles synchronously on
 * first use — over a second for the GGX filter alone on a modest GPU, a second in which nothing on
 * the page can answer the visitor. So every program it will use (the room's materials, its
 * background box, its two filters) is compiled first, in parallel, in that exact render state —
 * on the very geometry and camera kind PMREM draws them with, since the program key also reads
 * the geometry (an empty stand-in geometry lacks `position` and yields a different program).
 * Programs are shared by key, so fromScene() then renders without waiting on the GPU driver.
 * (If a future three changes those internals, it simply falls back to building straight away.)
 *
 * `cancelled` is asked once the programs are ready: a stage that has gone meanwhile (the visitor
 * left the page) gets nothing built — its renderer has released those programs, so building now
 * would compile them all again, synchronously, on whatever page came next. Resolves to null then.
 */
export async function buildStudioEnvironment(
  gl: WebGLRenderer,
  sigma: number,
  cancelled: () => boolean = () => false,
): Promise<{ texture: Texture; dispose: () => void } | null> {
  const pmrem = new PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const internals = pmrem as unknown as PmremInternals;
  const boxGeometry = new BoxGeometry();
  const backgroundStandIn = new MeshBasicMaterial({
    side: BackSide,
    depthWrite: false,
    depthTest: false,
  });

  if (
    typeof internals._setSize === "function" &&
    typeof internals._allocateTargets === "function"
  ) {
    internals._setSize(256);
    const target = internals._allocateTargets();
    // The filters: drawn on PMREM's own planes with an orthographic camera.
    const filters = new Scene();
    const planes = internals._lodMeshes?.[0]?.geometry ?? boxGeometry;
    for (const material of [internals._blurMaterial, internals._ggxMaterial])
      if (material) filters.add(new Mesh(planes, material));
    // The room and the background box it is drawn inside: a cube camera's perspective.
    const studio = new Scene();
    studio.add(new Mesh(boxGeometry, backgroundStandIn));
    const flat = new OrthographicCamera();
    const cube = new PerspectiveCamera(90, 1, 0.1, 100);
    const previousTarget = gl.getRenderTarget();
    const previousToneMapping = gl.toneMapping;
    gl.setRenderTarget(target);
    gl.toneMapping = NoToneMapping;
    // compileAsync creates its programs synchronously, so the render state can be restored at once.
    const compiled = Promise.all([
      gl.compileAsync(filters, flat),
      gl.compileAsync(studio, cube),
      gl.compileAsync(room, cube),
    ]);
    gl.setRenderTarget(previousTarget);
    gl.toneMapping = previousToneMapping;
    await compiled.catch(() => undefined);
    target.dispose();
  }
  if (cancelled()) {
    backgroundStandIn.dispose();
    boxGeometry.dispose();
    pmrem.dispose();
    room.dispose?.();
    return null;
  }

  const texture = pmrem.fromScene(room, sigma).texture;
  // Only now may the stand-in go: until fromScene had used its program, disposing it would have
  // released that program from the cache.
  backgroundStandIn.dispose();
  boxGeometry.dispose();
  return {
    texture,
    dispose: () => {
      texture.dispose();
      pmrem.dispose();
      room.dispose?.();
    },
  };
}
