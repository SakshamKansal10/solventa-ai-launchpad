import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 3 * 1024 * 1024;

/** Every extension we might have written for this user in the past —
 * cleared together so switching image formats never leaves a stale file
 * behind in their storage folder. */
function allAvatarPaths(userId: string): string[] {
  return Object.values(ALLOWED_CONTENT_TYPES).map((ext) => `${userId}/avatar.${ext}`);
}

export const uploadAvatar = createServerFn({ method: "POST" })
  .validator(z.object({ dataUrl: z.string(), contentType: z.string() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    const ext = ALLOWED_CONTENT_TYPES[data.contentType];
    if (!ext) {
      throw new Error("Please upload a JPEG, PNG, or WebP image.");
    }

    const base64 = data.dataUrl.split(",")[1] ?? data.dataUrl;
    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength > MAX_BYTES) {
      throw new Error("That image is too large — please use one under 3MB.");
    }

    const path = `${user.id}/avatar.${ext}`;
    // Clear other extensions first so a re-upload in a different format
    // doesn't leave the old file sitting alongside it.
    await supabase.storage
      .from("avatars")
      .remove(allAvatarPaths(user.id).filter((p) => p !== path));

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new picture shows up immediately even though the
    // URL itself is otherwise identical to the last upload.
    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);
    if (updateError) throw new Error(updateError.message);

    return { avatarUrl };
  });

export const removeAvatar = createServerFn({ method: "POST" }).handler(async () => {
  const { supabase, user } = await requireUser();

  await supabase.storage.from("avatars").remove(allAvatarPaths(user.id));

  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) throw new Error(error.message);

  return { ok: true };
});
