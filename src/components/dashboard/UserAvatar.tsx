import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "S";
}

const SIZE_CLASSES = {
  sm: { avatar: "size-9", text: "text-[0.8rem]" },
  lg: { avatar: "size-16", text: "text-[1.4rem]" },
} as const;

/** The one avatar rendering used everywhere a founder's picture can show —
 * header dropdown, dashboard sidebar, settings — so uploading a picture in
 * one place is reflected identically everywhere else. Falls back to the
 * same gradient-initials badge every one of those call sites already used
 * before a real picture existed. */
export function UserAvatar({
  avatarUrl,
  name,
  email,
  size = "sm",
  className,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  const sizeClasses = SIZE_CLASSES[size];
  return (
    <Avatar className={cn(sizeClasses.avatar, className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback
        className={cn("font-display font-semibold text-white", sizeClasses.text)}
        style={{ background: "linear-gradient(135deg, var(--sol-champagne), var(--sol-violet))" }}
      >
        {initials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
