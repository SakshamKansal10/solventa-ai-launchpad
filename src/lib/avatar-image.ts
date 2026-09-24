/** Profile-photo rules shared by the picker and its tests. The storage bucket
 * accepts anything the owner uploads, so the limits that matter (type, size,
 * output dimensions) are enforced here in the browser AND by the bucket. */

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_OUTPUT_SIZE = 512;

export type AvatarValidation = { ok: true } | { ok: false; reason: "type" | "size" | "empty" };

export function validateAvatarFile(file: { type: string; size: number }): AvatarValidation {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type))
    return { ok: false, reason: "type" };
  if (file.size <= 0) return { ok: false, reason: "empty" };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, reason: "size" };
  return { ok: true };
}

/** Centre square crop of the source, scaled so the output is at most
 * `AVATAR_OUTPUT_SIZE` on a side and never upscaled. */
export function squareCrop(width: number, height: number, max = AVATAR_OUTPUT_SIZE) {
  const side = Math.max(1, Math.min(width, height));
  return {
    sx: Math.floor((width - side) / 2),
    sy: Math.floor((height - side) / 2),
    side,
    output: Math.min(max, side),
  };
}

/** Decodes, centre-crops to a square and re-encodes (WEBP, JPEG as a fallback
 * for browsers that cannot encode WEBP). Re-encoding also drops EXIF, so a
 * photo's location never leaves the device. Browser only. */
export async function resizeAvatar(file: File): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, side, output } = squareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = output;
    canvas.height = output;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, output, output);

    const encode = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    const webp = await encode("image/webp", 0.88);
    if (webp && webp.type === "image/webp") return { blob: webp, extension: "webp" };
    const jpeg = await encode("image/jpeg", 0.88);
    if (!jpeg) throw new Error("ENCODE_FAILED");
    return { blob: jpeg, extension: "jpg" };
  } finally {
    bitmap.close();
  }
}
