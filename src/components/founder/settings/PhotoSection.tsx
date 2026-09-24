import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { removeAvatar, saveAvatar } from "@/lib/actions/settings";
import { AVATAR_TYPES, resizeAvatar, validateAvatarFile } from "@/lib/avatar-image";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useCurrentUserQuery } from "@/lib/queries";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Avatar } from "../Avatar";
import { Button, Card } from "../ui";

/** Custom photo → Google photo → initials. The picked file is validated, then
 * centre-cropped and re-encoded to ≤512px in the browser (which also strips
 * EXIF) before it goes to the owner-only `avatars` bucket. */
export function PhotoSection({ available }: { available: boolean }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const user = useCurrentUserQuery();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.currentUser });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const userId = user.data?.id;
      if (!userId) throw new Error("UNAUTHENTICATED");
      const { blob, extension } = await resizeAvatar(file);
      const path = `${userId}/avatar-${Date.now()}.${extension}`;
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: blob.type,
        upsert: false,
        cacheControl: "31536000",
      });
      if (uploadError) throw new Error(`UPLOAD_FAILED:${uploadError.message}`);
      await saveAvatar({ data: { path } });
    },
    onSuccess: async () => {
      await refresh();
      toast.success(t("set.photo.saved"));
    },
    onError: (err) => {
      console.error("[settings] photo upload failed:", err);
      setError(t("set.photo.errorUpload"));
    },
  });

  const remove = useMutation({
    mutationFn: () => removeAvatar(),
    onSuccess: async () => {
      await refresh();
      toast.success(t("set.photo.removed"));
    },
    onError: (err) => {
      console.error("[settings] photo removal failed:", err);
      setError(t("set.photo.errorUpload"));
    },
  });

  function onPick(file: File | null) {
    setError(null);
    if (!file) return;
    const check = validateAvatarFile(file);
    if (!check.ok) {
      setError(
        check.reason === "type"
          ? t("set.photo.errorType")
          : check.reason === "size"
            ? t("set.photo.errorSize")
            : t("set.photo.errorEmpty"),
      );
      return;
    }
    upload.mutate(file);
  }

  const avatar = user.data?.avatar;
  const busy = upload.isPending || remove.isPending;

  return (
    <Card
      className="flex flex-col gap-5 p-6 sm:p-7"
      aria-labelledby="photo-h"
      data-testid="photo-section"
    >
      <h2 id="photo-h" className="sol-h3">
        {t("set.photo.title")}
      </h2>
      <div className="flex flex-wrap items-center gap-6">
        <Avatar url={avatar?.url ?? null} initials={user.data?.initials ?? "S"} size={96} />
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-[1rem] text-sol-secondary" data-testid="photo-source">
            {t(`set.photo.source.${avatar?.source ?? "initials"}` as const)}
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              ref={inputRef}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="sr-only"
              data-testid="photo-input"
              aria-label={t("set.photo.upload")}
              tabIndex={-1}
              disabled={!available || busy}
              onChange={(e) => {
                onPick(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              loading={upload.isPending}
              disabled={!available || remove.isPending}
              data-testid="photo-upload"
            >
              {upload.isPending
                ? t("set.photo.uploading")
                : avatar?.source === "custom"
                  ? t("set.photo.change")
                  : t("set.photo.upload")}
            </Button>
            {avatar?.source === "custom" && (
              <Button
                variant="ghost"
                onClick={() => remove.mutate()}
                loading={remove.isPending}
                disabled={upload.isPending}
                data-testid="photo-remove"
              >
                {t("set.photo.remove")}
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="sol-support">{available ? t("set.photo.hint") : t("set.photo.unavailable")}</p>
      {error && (
        <p
          role="alert"
          className="text-[1rem] font-medium text-sol-warning"
          data-testid="photo-error"
        >
          {error}
        </p>
      )}
    </Card>
  );
}
