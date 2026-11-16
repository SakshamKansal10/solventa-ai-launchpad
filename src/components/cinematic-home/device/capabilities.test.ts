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
  it("gives a capable desktop with dedicated graphics the full film", () => {
    expect(classifyDevice(desktop, motionOk)).toMatchObject({ mode: "full", tier: "full" });
    for (const gpu of [
      desktop.gpu,
      "ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "Apple M2 Pro",
      null,
    ]) {
      expect(classifyDevice({ ...desktop, gpu }, motionOk).mode).toBe("full");
    }
  });

  it("gives the same film at the lite budget to machines that pass the gates but cannot sustain full", () => {
    // Integrated graphics, even with many cores (the owner's laptop class: a Radeon Vega APU).
    for (const gpu of [
      "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon(TM) Vega 3 Graphics (0x000015D8) Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon 780M Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    ]) {
      expect(classifyDevice({ ...desktop, gpu }, motionOk)).toMatchObject({ mode: "lite" });
    }
    expect(classifyDevice({ ...desktop, cores: 4 }, motionOk).mode).toBe("lite");
    expect(classifyDevice({ ...desktop, memoryGb: 4 }, motionOk).mode).toBe("lite");
    expect(classifyDevice({ ...desktop, saveData: true }, motionOk).mode).toBe("lite");
  });

  it("serves phones and other screens narrower than 768px the still version", () => {
    expect(classifyDevice(phone, motionOk)).toMatchObject({ mode: "fallback" });
    expect(classifyDevice({ ...desktop, viewportWidth: 767 }, motionOk).mode).toBe("fallback");
    expect(classifyDevice({ ...desktop, viewportWidth: 768 }, motionOk).mode).toBe("full");
  });

  it("serves slow machines the still version: under 4 cores or under 4 GB", () => {
    expect(classifyDevice({ ...desktop, cores: 2 }, motionOk).mode).toBe("fallback");
    expect(classifyDevice({ ...desktop, memoryGb: 2 }, motionOk).mode).toBe("fallback");
    // Browsers that hide these numbers are not penalised for it.
    expect(classifyDevice({ ...desktop, cores: null, memoryGb: null }, motionOk).mode).toBe("full");
  });

  it("gives a large touch screen (tablet) the lite film", () => {
    const tablet = { ...phone, viewportWidth: 1024, viewportHeight: 1366, memoryGb: 4 };
    expect(classifyDevice(tablet, motionOk)).toMatchObject({ mode: "lite", tier: "lite" });
  });

  it("serves the static fallback for reduced motion, missing WebGL2 or a software GPU", () => {
    expect(classifyDevice(desktop, { reducedMotion: true }).mode).toBe("fallback");
    expect(classifyDevice({ ...desktop, webgl2: false }, motionOk).mode).toBe("fallback");
    expect(classifyDevice({ ...desktop, gpu: "Google SwiftShader" }, motionOk).mode).toBe(
      "fallback",
    );
  });

  it("honours a forced tier for testing, but never without WebGL2", () => {
    expect(classifyDevice(phone, { ...motionOk, override: "full" })).toMatchObject({
      mode: "full",
      tier: "full",
    });
    expect(classifyDevice(desktop, { reducedMotion: true, override: "lite" }).mode).toBe("lite");
    expect(classifyDevice(desktop, { ...motionOk, override: "fallback" }).mode).toBe("fallback");
    expect(
      classifyDevice({ ...desktop, webgl2: false }, { ...motionOk, override: "full" }).mode,
    ).toBe("fallback");
  });

  it("always explains its decision", () => {
    const profiles = [
      desktop,
      phone,
      { ...desktop, webgl2: false },
      { ...desktop, saveData: true },
      { ...desktop, cores: 2 },
    ];
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
