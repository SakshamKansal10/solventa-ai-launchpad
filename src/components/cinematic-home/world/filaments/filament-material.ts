import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, type DataTexture } from "three";

import { COLORS } from "../layout";

/**
 * Screen-facing ribbons built entirely in the vertex shader from the
 * FilamentPool data texture. Thin filaments never shimmer: below ~1.4 px the
 * ribbon keeps a 1.4 px width and fades instead. Additive, fog-aware (it fades
 * to nothing in the distance rather than to the fog colour), tone-mapped.
 */
const vertexShader = /* glsl */ `
uniform sampler2D uData;
uniform float uTime;
uniform float uPxScale;
attribute float aFil;
attribute float aT;
attribute float aSide;
varying float vSide;
varying float vAlpha;
varying float vEnergy;
varying float vViolet;
varying float vDepth;

vec4 fetchTexel(int f, int i) { return texelFetch(uData, ivec2(i, f), 0); }
vec3 bez(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  float u = 1.0 - t;
  return u*u*u*a + 3.0*u*u*t*b + 3.0*u*t*t*c + t*t*t*d;
}
vec3 bezd(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  float u = 1.0 - t;
  return 3.0*u*u*(b - a) + 6.0*u*t*(c - b) + 3.0*t*t*(d - c);
}

void main() {
  int f = int(aFil + 0.5);
  vec4 t0 = fetchTexel(f, 0);
  vec4 t1 = fetchTexel(f, 1);
  vec4 t2 = fetchTexel(f, 2);
  vec4 t3 = fetchTexel(f, 3);
  vec4 t4 = fetchTexel(f, 4);
  float s0 = t0.w;
  float s1 = t1.w;
  float width = t2.w;
  float intensity = t3.w;
  vSide = aSide;
  vViolet = t4.z;
  if (s1 <= s0 + 0.0001 || intensity <= 0.0 || width <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0;
    vEnergy = 0.0;
    vDepth = 0.0;
    return;
  }
  float tt = mix(s0, s1, aT);
  vec3 p = bez(t0.xyz, t1.xyz, t2.xyz, t3.xyz, tt);
  vec3 d = bezd(t0.xyz, t1.xyz, t2.xyz, t3.xyz, tt);
  if (dot(d, d) < 1e-10) d = t3.xyz - t0.xyz + vec3(1e-4);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 tv = normalize(mat3(modelViewMatrix) * d);
  vec3 side = cross(tv, normalize(mv.xyz));
  float sl = length(side);
  side = sl > 1e-5 ? side / sl : vec3(1.0, 0.0, 0.0);
  float dist = max(-mv.z, 0.001);
  // Tips taper — every filament starts and ends like a drawn line, not a cut tube.
  float taper = mix(0.25, 1.0, smoothstep(0.0, 0.07, tt - s0)) * mix(0.25, 1.0, smoothstep(0.0, 0.07, s1 - tt));
  float w = width * taper;
  float minW = 1.4 * uPxScale * dist;
  float alpha = 1.0;
  if (w < minW) { alpha = w / minW; w = minW; }
  mv.xyz += side * (w * 0.5 * aSide);
  gl_Position = projectionMatrix * mv;
  float head = fract(uTime * t4.w + t4.y);
  float dp = tt - head;
  float pulse = t4.x * exp(-dp * dp / 0.0016);
  vAlpha = alpha;
  // Capped so bright filaments stay champagne instead of clipping to white.
  vEnergy = min(intensity * (1.0 + pulse * 2.6), 1.35);
  vDepth = dist;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uGold;
uniform vec3 uViolet;
uniform float uFogDensity;
varying float vSide;
varying float vAlpha;
varying float vEnergy;
varying float vViolet;
varying float vDepth;

void main() {
  if (vAlpha <= 0.0) discard;
  float x = abs(vSide);
  float body = 1.0 - smoothstep(0.45, 1.0, x);
  float core = 1.0 - smoothstep(0.0, 0.4, x);
  float fog = exp(-uFogDensity * uFogDensity * vDepth * vDepth);
  // Filaments passing the lens dissolve instead of sweeping across the frame.
  fog *= smoothstep(0.5, 3.2, vDepth);
  vec3 col = mix(uGold, uViolet, vViolet);
  col = col * vEnergy + vec3(1.0, 0.94, 0.84) * core * 0.08 * vEnergy;
  gl_FragColor = vec4(col, body * vAlpha * fog);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createFilamentMaterial(data: DataTexture): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uData: { value: data },
      uTime: { value: 0 },
      uPxScale: { value: 0.001 },
      uFogDensity: { value: 0.02 },
      uGold: { value: new Color(COLORS.gold) },
      uViolet: { value: new Color(COLORS.violetGlow) },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    // Ribbons face the camera, so their winding flips with the view: never cull them.
    side: DoubleSide,
  });
}
