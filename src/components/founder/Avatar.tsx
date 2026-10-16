import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AvatarProps {
  url: string | null;
  initials: string;
  size?: number;
  className?: string;
}

/** Custom photo → Google photo → initials. If the image fails to load (a
 * revoked Google URL, a deleted file) it falls back to initials rather than
 * showing a broken-image icon. */
export function Avatar({ url, initials, size = 36, className }: AvatarProps) {
  const { t } = useLocale();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  const showImage = Boolean(url) && !failed;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sol-champagne to-sol-violet font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.38)) }}
      data-testid="avatar"
      data-source={showImage ? "image" : "initials"}
    >
      {showImage ? (
        <img
          src={url ?? undefined}
          alt={t("avatar.alt")}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
