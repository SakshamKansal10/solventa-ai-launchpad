import { describe, expect, it } from "vitest";

import { AVATAR_MAX_BYTES, squareCrop, validateAvatarFile } from "./avatar-image";

describe("validateAvatarFile", () => {
  it("accepts JPG, PNG and WEBP up to 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateAvatarFile({ type, size: 1024 })).toEqual({ ok: true });
    }
    expect(validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES })).toEqual({ ok: true });
  });

  it("rejects anything that is not one of those three types", () => {
    for (const type of ["image/gif", "image/svg+xml", "application/pdf", "image/heic", ""]) {
      expect(validateAvatarFile({ type, size: 1024 })).toEqual({ ok: false, reason: "type" });
    }
  });

  it("rejects files over 5 MB and empty files", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: AVATAR_MAX_BYTES + 1 })).toEqual({
      ok: false,
      reason: "size",
    });
    expect(validateAvatarFile({ type: "image/jpeg", size: 0 })).toEqual({
      ok: false,
      reason: "empty",
    });
  });
});

describe("squareCrop", () => {
  it("crops a landscape photo to its centre square and scales to 512", () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000, output: 512 });
  });

  it("crops a portrait photo to its centre square", () => {
    expect(squareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, side: 3000, output: 512 });
  });

  it("never upscales a small image", () => {
    expect(squareCrop(200, 300)).toEqual({ sx: 0, sy: 50, side: 200, output: 200 });
  });

  it("is safe for degenerate sizes", () => {
    const r = squareCrop(0, 0);
    expect(r.side).toBe(1);
    expect(r.output).toBe(1);
  });
});
