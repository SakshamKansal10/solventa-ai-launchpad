import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { removeAvatar, uploadAvatar } from "@/lib/actions/avatar";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateDashboardText } from "@/lib/i18n/dashboard-dictionary";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AvatarUploader({
  avatarUrl,
  name,
  email,
}: {
  avatarUrl: string | null;
  name: string | null;
  email: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["current-user"] }),
      queryClient.invalidateQueries({ queryKey: ["settings-data"] }),
    ]);
  }

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(tr("Please upload a JPEG, PNG, or WebP image."));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(tr("That image is too large — please use one under 3MB."));
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      await uploadAvatar({ data: { dataUrl, contentType: file.type } });
      await refresh();
      toast.success(tr("Profile picture updated."));
    } catch (err) {
      console.error("[avatar] upload failed:", err);
      toast.error(tr("Couldn't upload that picture — try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await removeAvatar();
      await refresh();
      toast.success(tr("Profile picture removed."));
    } catch (err) {
      console.error("[avatar] remove failed:", err);
      toast.error(tr("Couldn't remove that picture — try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <UserAvatar avatarUrl={avatarUrl} name={name} email={email} size="lg" />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="size-5 animate-spin text-white" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-sol-violet-deep hover:underline disabled:opacity-60"
          >
            <Camera className="size-3.5" aria-hidden="true" />
            {avatarUrl ? tr("Change picture") : tr("Upload picture")}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-sol-secondary hover:text-sol-danger disabled:opacity-60"
            >
              <X className="size-3.5" aria-hidden="true" />
              {tr("Remove")}
            </button>
          )}
        </div>
        <p className="text-[0.72rem] text-sol-secondary">{tr("JPEG, PNG, or WebP — up to 3MB.")}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
