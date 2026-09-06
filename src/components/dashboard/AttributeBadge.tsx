import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A single icon + label + value pill — the visual replacement for a
 * sentence like "Starting capital: ₹5,000–10,000." Communicates the same
 * fact in one glance instead of a line of prose, and is the basic unit
 * every founder-intelligence surface (flagship card, alternatives,
 * business DNA) is built from. */
export function AttributeBadge({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  variant = "light",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "neutral" | "gold";
  variant?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-3.5 py-2",
        variant === "dark"
          ? tone === "gold"
            ? "border-gold/35 bg-gold/[0.1]"
            : "border-workspace-border bg-white/[0.04]"
          : tone === "gold"
            ? "border-gold/30 bg-gold/[0.08]"
            : "border-border/70 bg-card",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", tone === "gold" ? "text-gold" : "text-econ-green-active")}
        aria-hidden="true"
      />
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-[0.62rem] font-semibold uppercase tracking-[0.08em]",
            variant === "dark" ? "text-workspace-muted" : "text-dashboard-muted",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "text-[0.86rem] font-semibold",
            variant === "dark" ? "text-workspace-foreground" : "text-dashboard-heading",
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
