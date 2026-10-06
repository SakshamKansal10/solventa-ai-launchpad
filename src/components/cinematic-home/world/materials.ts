import {
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
} from "three";

import type { QualityPreset } from "../performance/quality";
import { COLORS } from "./layout";

/**
 * The material language (shared, created once per canvas):
 *   pearl     — warm ivory ceramic, soft clear-coat sheen, never plastic
 *   champagne — brushed champagne metal (needs the studio environment to read)
 *   midnight  — near-black engineered structure
 *   glass     — optical layers: faint body, bright reflective edges
 *   energy    — unlit, tinted per instance (instanceColor) for internal light
 *   violet    — restrained internal intelligence
 */
export interface Materials {
  /** Instanced pieces that dissolve per instance (alpha in instanceColor.r, alpha-hashed). */
  pearlDissolve: MeshStandardMaterial;
  glassDissolve: MeshPhysicalMaterial;
  pearl: MeshStandardMaterial;
  champagne: MeshStandardMaterial;
  midnight: MeshStandardMaterial;
  glass: MeshPhysicalMaterial;
  energy: MeshBasicMaterial;
  violet: MeshBasicMaterial;
  all: Material[];
}

export function createMaterials(preset: QualityPreset): Materials {
  const pearl = preset.physicalMaterials
    ? new MeshPhysicalMaterial({
        color: "#E7E1D3",
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.42,
        clearcoatRoughness: 0.34,
        sheen: 0.25,
        sheenColor: new Color("#fff3e2"),
        sheenRoughness: 0.55,
      })
    : new MeshStandardMaterial({ color: "#E7E1D3", roughness: 0.5, metalness: 0 });
  const champagne = new MeshStandardMaterial({
    color: COLORS.champagne,
    metalness: 1,
    roughness: 0.26,
  });
  const midnight = new MeshStandardMaterial({
    color: COLORS.midnight,
    metalness: 0.6,
    roughness: 0.42,
  });
  const glass = new MeshPhysicalMaterial({
    color: "#d9e2ee",
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.09,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    side: DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.6,
  });
  const pearlDissolve = withInstanceAlpha(pearl.clone());
  pearlDissolve.alphaHash = true;
  const glassDissolve = withInstanceAlpha(glass.clone());
  // Provisional architecture must still read: a little more body than the core's optics.
  glassDissolve.opacity = 0.2;
  const energy = new MeshBasicMaterial({ color: "#ffffff" });
  const violet = new MeshBasicMaterial({ color: COLORS.violetGlow });
  return {
    pearlDissolve,
    glassDissolve,
    pearl,
    champagne,
    midnight,
    glass,
    energy,
    violet,
    all: [pearl, champagne, midnight, glass, energy, violet, pearlDissolve, glassDissolve],
  };
}

/**
 * Reads per-instance ALPHA from instanceColor.r (rgb is restored), so one
 * instanced mesh can dissolve piece by piece: glass ↔ ceramic in place.
 */
function withInstanceAlpha<T extends MeshStandardMaterial>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      [
        "#include <color_fragment>",
        "#ifdef USE_INSTANCING_COLOR",
        "  float instAlpha = vColor.r;",
        "  diffuseColor.rgb /= max(instAlpha, 0.001);",
        "  diffuseColor.a *= instAlpha;",
        "#endif",
      ].join("\n"),
    );
  };
  material.customProgramCacheKey = () => "instance-alpha";
  return material;
}
