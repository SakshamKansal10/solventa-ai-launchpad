/**
 * Device capability detection → which experience a visitor gets.
 *
 * `probeDevice` reads the browser once (client only). `classifyDevice` is a
 * pure decision so the rules are unit-tested and easy to tune: every result
 * carries the human-readable reasons it was chosen (shown in the dev HUD).
 */

/**
 * Three experiences, decided once per visit:
 *   full      the film at full cost — discrete GPU (or Apple silicon), ≥ 8 cores, ≥ 8 GB
 *   lite      the SAME film and scroll story at reduced cost (pixel ratio, no MSAA, simpler
 *             materials, fewer instances) — integrated graphics, modest CPUs, touch screens
 *   fallback  the still narrative — no WebGL2, software GPU, reduced motion, small or slow
 */
export type QualityTier = "full" | "lite";
export type ExperienceMode = QualityTier | "fallback";
/** `?tier=` override for testing — forces a tier, or the static fallback. */
export type TierOverride = QualityTier | "fallback";
/** Older review links used high / medium / low. */
export function normalizeTierOverride(
  v: "full" | "lite" | "fallback" | "high" | "medium" | "low" | undefined,
): TierOverride | undefined {
  if (v === "high" || v === "medium") return "full";
  if (v === "low") return "lite";
  return v;
}

export interface DeviceProfile {
  webgl2: boolean;
  /** Renderer string, e.g. "ANGLE (NVIDIA, …)" — null when unavailable. */
  gpu: string | null;
  cores: number | null;
  /** navigator.deviceMemory (Chromium only) — null elsewhere. */
  memoryGb: number | null;
  dpr: number;
  coarsePointer: boolean;
  viewportWidth: number;
  viewportHeight: number;
  saveData: boolean;
}

export interface Capability {
  mode: ExperienceMode;
  /** The rendering budget (QUALITY_PRESETS); "lite" when the mode is the fallback. */
  tier: QualityTier;
  reasons: string[];
}

/** The film (full or lite) rather than the still version. */
export const isFilm = (mode: ExperienceMode | "pending"): mode is QualityTier =>
  mode === "full" || mode === "lite";

// CPU rasterisers: WebGL "works" but a continuous 3D scene would crawl.
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

export function isSoftwareGpu(gpu: string | null): boolean {
  return gpu !== null && SOFTWARE_GPU.test(gpu);
}

// Integrated graphics shares memory bandwidth with the CPU: measured on a Radeon Vega APU, the
// densest scenes (the universe, the branching path) fall to ~40 fps on the high tier. Discrete
// GPUs, Intel Arc and Apple silicon keep the high tier.
const INTEGRATED_GPU =
  /\bintel\b(?!.*\barc\b)|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|radeon \d{3}m\b/i;

export function isIntegratedGpu(gpu: string | null): boolean {
  return gpu !== null && INTEGRATED_GPU.test(gpu);
}

export function classifyDevice(
  device: DeviceProfile,
  { reducedMotion, override }: { reducedMotion: boolean; override?: TierOverride | null },
): Capability {
  if (override === "fallback")
    return { mode: "fallback", tier: "lite", reasons: ["forced: fallback"] };
  if (!device.webgl2) return { mode: "fallback", tier: "lite", reasons: ["WebGL2 unavailable"] };
  if (override) return { mode: override, tier: override, reasons: [`forced: ${override}`] };
  // A scroll-driven camera flight is exactly the motion this setting asks us to avoid.
  if (reducedMotion) return { mode: "fallback", tier: "lite", reasons: ["prefers-reduced-motion"] };
  if (isSoftwareGpu(device.gpu))
    return { mode: "fallback", tier: "lite", reasons: ["software GPU"] };
  // Small screens and slow machines get the still version from the start (decided once).
  if (device.viewportWidth < 768)
    return { mode: "fallback", tier: "lite", reasons: ["viewport narrower than 768px"] };
  if (device.cores !== null && device.cores < 4)
    return { mode: "fallback", tier: "lite", reasons: ["fewer than 4 CPU cores"] };
  if (device.memoryGb !== null && device.memoryGb < 4)
    return { mode: "fallback", tier: "lite", reasons: ["less than 4 GB memory"] };

  // Full only where the whole budget is sustainable; everything else that can run the film
  // gets the same film at the lite budget (measured: an integrated Radeon Vega 3 holds p95
  // 33 ms on the old "medium" budget — see docs/redesign/perf).
  const reasons: string[] = [];
  let tier: QualityTier = "lite";
  if (device.saveData) reasons.push("data saver on");
  else if (device.coarsePointer) reasons.push("touch device");
  else if (isIntegratedGpu(device.gpu)) reasons.push("integrated graphics");
  else if (device.cores !== null && device.cores < 8) reasons.push("fewer than 8 CPU cores");
  else if (device.memoryGb !== null && device.memoryGb < 8) reasons.push("less than 8 GB memory");
  else {
    tier = "full";
    reasons.push("desktop, ≥ 8 cores, dedicated graphics");
  }
  return { mode: tier, tier, reasons };
}

/** Reads the current browser. Client only — call from an effect, never during SSR. */
export function probeDevice(): DeviceProfile {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  let webgl2 = false;
  let gpu: string | null = null;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (gl) {
      webgl2 = true;
      gpu = String(gl.getParameter(gl.RENDERER));
      // Chromium/WebKit report a generic "WebKit WebGL" here; Firefox already
      // returns the real renderer (and warns if the debug extension is used).
      if (/^webkit webgl$/i.test(gpu)) {
        const info = gl.getExtension("WEBGL_debug_renderer_info");
        if (info) gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    webgl2 = false;
  }
  return {
    webgl2,
    gpu,
    cores: nav.hardwareConcurrency || null,
    memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    dpr: window.devicePixelRatio || 1,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    saveData: Boolean(nav.connection?.saveData),
  };
}
