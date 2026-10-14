import { describe, expect, it } from "vitest";

import { classifyDevice, isSoftwareGpu, type DeviceProfile } from "./capabilities";

const desktop: DeviceProfile = {
  webgl2: true,
  gpu: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
  cores: 12,
  memoryGb: 8,
  dpr: 1,
  coarsePointer: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  saveData: false,
};
const phone: DeviceProfile = {
  ...desktop,
  gpu: "Apple GPU",
  cores: 6,
  memoryGb: null,
  dpr: 3,
  coarsePointer: true,
  viewportWidth: 390,
  viewportHeight: 844,
};
const motionOk = { reducedMotion: false };

describe("classifyDevice", () => {
  it("gives a capable desktop the high tier", () => {
    expect(classifyDevice(desktop, motionOk)).toMatchObject({ mode: "webgl", tier: "high" });
  });

  it("gives a modest desktop the medium tier", () => {
    expect(classifyDevice({ ...desktop, cores: 4 }, motionOk)).toMatchObject({ tier: "medium" });
    expect(classifyDevice({ ...desktop, memoryGb: 4 }, motionOk)).toMatchObject({ tier: "medium" });
  });

  it("keeps integrated graphics on the medium tier, even with many cores", () => {
    for (const gpu of [
      "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon(TM) Vega 3 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon 780M Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    ]) {
      expect(classifyDevice({ ...desktop, gpu }, motionOk)).toMatchObject({ tier: "medium" });
    }
    for (const gpu of [
      desktop.gpu,
      "ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "Apple M2 Pro",
      null,
    ]) {
      expect(classifyDevice({ ...desktop, gpu }, motionOk)).toMatchObject({ tier: "high" });
    }
  });

  it("gives phones the medium tier, and low-memory phones the low tier", () => {
    expect(classifyDevice(phone, motionOk)).toMatchObject({ mode: "webgl", tier: "medium" });
    expect(classifyDevice({ ...phone, memoryGb: 2 }, motionOk)).toMatchObject({ tier: "low" });
  });

  it("drops to the low tier when the visitor has data saver on", () => {
    expect(classifyDevice({ ...desktop, saveData: true }, motionOk)).toMatchObject({ tier: "low" });
  });

  it("serves the static fallback for reduced motion, missing WebGL2 or a software GPU", () => {
    expect(classifyDevice(desktop, { reducedMotion: true }).mode).toBe("fallback");
    expect(classifyDevice({ ...desktop, webgl2: false }, motionOk).mode).toBe("fallback");
    expect(classifyDevice({ ...desktop, gpu: "Google SwiftShader" }, motionOk).mode).toBe(
      "fallback",
    );
  });

  it("honours a forced tier for testing, but never without WebGL2", () => {
    expect(classifyDevice(phone, { ...motionOk, override: "high" })).toMatchObject({
      mode: "webgl",
      tier: "high",
    });
    expect(classifyDevice(desktop, { reducedMotion: true, override: "low" }).mode).toBe("webgl");
    expect(classifyDevice(desktop, { ...motionOk, override: "fallback" }).mode).toBe("fallback");
    expect(
      classifyDevice({ ...desktop, webgl2: false }, { ...motionOk, override: "high" }).mode,
    ).toBe("fallback");
  });

  it("always explains its decision", () => {
    const profiles = [desktop, phone, { ...desktop, webgl2: false }, { ...phone, saveData: true }];
    for (const p of profiles) {
      expect(classifyDevice(p, motionOk).reasons.length).toBeGreaterThan(0);
    }
  });
});

describe("isSoftwareGpu", () => {
  it("recognises CPU rasterisers and nothing else", () => {
    for (const gpu of [
      "Google SwiftShader",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "Microsoft Basic Render Driver",
    ]) {
      expect(isSoftwareGpu(gpu)).toBe(true);
    }
    for (const gpu of [desktop.gpu, "Apple GPU", "Mali-G78", null]) {
      expect(isSoftwareGpu(gpu)).toBe(false);
    }
  });
});
