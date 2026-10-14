import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  Color,
  FogExp2,
  PMREMGenerator,
  ShaderMaterial,
  SphereGeometry,
  type DirectionalLight,
  type Mesh,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { sampleKeys } from "../timeline/timeline";
import { EXPOSURE_KEYS, FOG_KEYS } from "./atmosphere-keys";
import { COLORS } from "./layout";
import { useWorld } from "./WorldContext";

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const skyFragment = /* glsl */ `
uniform vec3 uLow;
uniform vec3 uHigh;
uniform float uLift;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float h = smoothstep(-0.35, 0.85, vDir.y);
  vec3 col = mix(uLow, uHigh, h) * uLift;
  // ±½ step of noise: no banding in the long dark gradients.
  col += (hash(gl_FragCoord.xy) - 0.5) / 400.0;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** Environment light, sky gradient, fog and the two key lights. */
export function Atmosphere() {
  const { store } = useWorld();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const sky = useRef<Mesh>(null);
  const key = useRef<DirectionalLight>(null);

  const skyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: {
          uLow: { value: new Color(COLORS.black) },
          uHigh: { value: new Color(COLORS.navy) },
          // Black that still holds detail: the deep navy of the sky is never crushed to nothing.
          uLift: { value: 0.6 },
        },
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const skyGeometry = useMemo(() => new SphereGeometry(900, 32, 16), []);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.38;
    scene.background = new Color(COLORS.black);
    scene.fog = new FogExp2(COLORS.black, 0.012);
    return () => {
      scene.environment = null;
      scene.fog = null;
      env.dispose();
      pmrem.dispose();
      room.dispose?.();
      skyMaterial.dispose();
      skyGeometry.dispose();
    };
  }, [gl, scene, skyMaterial, skyGeometry]);

  useFrame((state) => {
    const p = store.state.progress;
    const fog = scene.fog as FogExp2 | null;
    if (fog) fog.density = sampleKeys(FOG_KEYS, p);
    state.gl.toneMappingExposure = sampleKeys(EXPOSURE_KEYS, p);
    sky.current?.position.copy(state.camera.position);
  }, -1);

  return (
    <>
      <mesh ref={sky} geometry={skyGeometry} material={skyMaterial} renderOrder={-10} />
      <hemisphereLight args={["#2a3a55", "#05070c", 0.2]} />
      <directionalLight ref={key} color="#ffeed6" intensity={2.6} position={[-14, 16, 18]} />
      <directionalLight color="#9fb2d6" intensity={1.25} position={[14, 4, -20]} />
      <directionalLight color="#c9a873" intensity={0.35} position={[6, -14, 10]} />
    </>
  );
}
