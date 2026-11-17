import { describe, expect, it } from "vitest";

import {
  chooseFilmPath,
  isSoftwareGpu,
  normalizeOverrides,
  type DeviceProfile,
} from "./capabilities";

const device = (over: Partial<DeviceProfile> = {}): DeviceProfile => ({
  webgl2: true,
  gpu: "ANGLE (Apple, Apple A15 GPU)",
  dpr: 3,
  viewportWidth: 390,
  viewportHeight: 844,
  ...over,
});

describe("chooseFilmPath — the same cinematic page for everyone", () => {
  it("gives every device with WebGL2 the live film at full quality: phones, small and slow screens included", () => {
    for (const d of [
      device(),
      device({ viewportWidth: 1920, viewportHeight: 1080, dpr: 1, gpu: "Intel UHD 620" }),
      device({ gpu: "AMD Radeon(TM) Vega 3 Graphics" }),
      device({ gpu: "ANGLE (Google, SwiftShader)" }),
    ]) {
      const c = chooseFilmPath(d, { reducedMotion: false });
      expect(c.path).toBe("live");
      expect(c.tier).toBe("full");
    }
  });

  it("plays the recorded film when WebGL2 is unavailable", () => {
    expect(chooseFilmPath(device({ webgl2: false, gpu: null }), { reducedMotion: false })).toEqual({
      path: "recorded",
      tier: "full",
      reasons: ["WebGL2 unavailable"],
    });
  });

  it("uses the reduced-motion path (crossfades) for prefers-reduced-motion, WebGL or not", () => {
    expect(chooseFilmPath(device(), { reducedMotion: true }).path).toBe("reduced");
    expect(chooseFilmPath(device({ webgl2: false }), { reducedMotion: true }).path).toBe("reduced");
  });

  it("honours review overrides, but never a live film without WebGL2", () => {
    expect(
      chooseFilmPath(device(), { reducedMotion: false, override: { path: "recorded" } }).path,
    ).toBe("recorded");
    expect(
      chooseFilmPath(device({ webgl2: false }), {
        reducedMotion: false,
        override: { path: "live" },
      }).path,
    ).toBe("recorded");
    expect(
      chooseFilmPath(device(), { reducedMotion: false, override: { tier: "lite" } }),
    ).toMatchObject({ path: "live", tier: "lite" });
  });

  it("always explains its decision", () => {
    expect(chooseFilmPath(device(), { reducedMotion: false }).reasons.length).toBeGreaterThan(0);
  });
});

describe("normalizeOverrides", () => {
  it("maps ?tier and ?film, including the old links", () => {
    expect(normalizeOverrides("fallback", undefined)).toEqual({ path: "recorded" });
    expect(normalizeOverrides("high", undefined)).toEqual({ tier: "full" });
    expect(normalizeOverrides("low", "reduced")).toEqual({ tier: "lite", path: "reduced" });
    expect(normalizeOverrides(undefined, "debug")).toEqual({});
  });
});

describe("isSoftwareGpu", () => {
  it("recognises CPU rasterisers and nothing else", () => {
    expect(isSoftwareGpu("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))")).toBe(true);
    expect(isSoftwareGpu("Apple M2")).toBe(false);
    expect(isSoftwareGpu(null)).toBe(false);
  });
});
