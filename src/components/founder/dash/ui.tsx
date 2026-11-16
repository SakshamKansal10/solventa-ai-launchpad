import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createLink, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

import { dashPageFor } from "./tabs";

/**
 * Dashboard v2 building blocks (docs/redesign/briefs/3-dashboard-redesign.md).
 * Cobalt only on things you can press and on "you are here"; one navy block per page at most;
 * no card inside a card, no shadows, no gradients; nothing under 15px.
 */

type Tone = "primary" | "secondary";
type Size = "lg" | "md";

export function actionClasses(tone: Tone, { onNavy = false, size = "lg" as Size } = {}) {
  return cn(
    "inline-flex max-w-full select-none items-center justify-center rounded-full text-center leading-tight transition-[background-color,border-color,color,transform] duration-[180ms] ease-[var(--sol-ease)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    onNavy ? "focus-visible:outline-white" : "focus-visible:outline-sol-cobalt",
    size === "lg"
      ? "min-h-[68px] gap-3.5 px-[34px] py-3 text-[21px]"
      : "min-h-14 gap-2.5 px-6 py-2.5 text-[18px]",
    tone === "primary"
      ? cn(
          "font-semibold",
          onNavy
            ? "bg-white text-sol-ink hover:bg-sol-ivory"
            : "bg-sol-cobalt text-white hover:bg-sol-cobalt-deep",
        )
      : cn(
          "border font-medium",
          onNavy
            ? "border-white/40 text-white hover:border-white"
            : "border-sol-ink/30 text-sol-ink hover:border-sol-ink/60",
        ),
  );
}

export function Arrow({ className }: { className?: string }) {
  return (
    <ArrowRight
      className={cn("dash-arrow size-[22px] shrink-0", className)}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: Size;
  onNavy?: boolean;
  loading?: boolean;
  /** The arrow on the right (the page's primary action has one). */
  arrow?: boolean;
}

/** A real <button> in the v2 action style. Exactly one `tone="primary"` per page. */
export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  {
    tone = "primary",
    size = "lg",
    onNavy,
    loading,
    arrow = tone === "primary",
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(actionClasses(tone, { onNavy, size }), className)}
      {...rest}
    >
      {loading && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
      {children}
      {arrow && !loading && <Arrow />}
    </button>
  );
});

interface ActionAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  tone?: Tone;
  size?: Size;
  onNavy?: boolean;
  arrow?: boolean;
}

const ActionAnchor = forwardRef<HTMLAnchorElement, ActionAnchorProps>(function ActionAnchor(
  {
    tone = "primary",
    size = "lg",
    onNavy,
    arrow = tone === "primary",
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <a ref={ref} className={cn(actionClasses(tone, { onNavy, size }), className)} {...rest}>
      {children}
      {arrow && <Arrow />}
    </a>
  );
});

/** A type-checked router link in the v2 action style. */
export const ActionLink = createLink(ActionAnchor);

const TAG: Record<string, string> = {
  ink: "bg-sol-ink text-white",
  outline: "border border-sol-ink/30 text-sol-secondary",
  /** Gaps, estimates, failed checks. */
  warning: "dash-warn-text border border-sol-warning/50 bg-sol-warning-soft",
  /** Completed states and milestones. */
  done: "bg-sol-champagne-soft text-sol-ink border border-sol-champagne",
  navyOutline: "border border-white/40 text-white",
};

export function Tag({
  tone = "outline",
  children,
  className,
  ...rest
}: { tone?: keyof typeof TAG; children: ReactNode; className?: string } & Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children" | "className"
>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[38px] items-center gap-2 rounded-full px-4 text-[15px] font-semibold",
        TAG[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/** The small uppercase label (15px, 600, tracked, muted). Renders an <h2> by default because
 * on these pages it names the block below it. */
export function Label({
  as: Tag = "h2",
  children,
  className,
  ...rest
}: {
  as?: "h2" | "h3" | "p" | "span" | "div";
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">) {
  return (
    <Tag className={cn("dash-label", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Supporting card: the cool pearl surface, no border, no shadow. */
export function MistCard({
  as: Tag = "section",
  children,
  className,
  ...rest
}: {
  as?: "section" | "div" | "article" | "li";
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">) {
  return (
    <Tag
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-[32px] bg-sol-ivory p-[clamp(24px,2.8vw,40px)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** The page's one dark block. */
export function NavyBlock({
  as: Tag = "section",
  children,
  className,
  ...rest
}: {
  as?: "section" | "div" | "article";
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">) {
  return (
    <Tag
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-[40px] bg-sol-navy p-[clamp(24px,3.4vw,48px)] text-white",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const RowAnchor = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { title: string; note?: string; tag?: ReactNode }
>(function RowAnchor({ title, note, tag, className, ...rest }, ref) {
  return (
    <a
      ref={ref}
      className={cn(
        "group flex min-h-[104px] items-center justify-between gap-4 rounded-[32px] border border-sol-ink/20 px-[clamp(24px,2.8vw,40px)] py-5 text-sol-ink transition-colors hover:border-sol-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt",
        className,
      )}
      {...rest}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-3 font-display text-[clamp(22px,2.2vw,28px)] font-medium leading-tight tracking-[-0.015em]">
          {title}
          {tag}
        </span>
        {note && <span className="text-[17px] leading-snug text-sol-secondary">{note}</span>}
      </span>
      <Arrow className="text-sol-cobalt-deep" />
    </a>
  );
});

/** A quiet full-width row that leads somewhere (sub-pages, guides). */
export const LinkRow = createLink(RowAnchor);

/** A row that is not a link (an action handled on this page, or a TODO). */
export function QuietRow({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "className"
>) {
  return (
    <div
      {...rest}
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[32px] border border-sol-border px-[clamp(20px,2.6vw,32px)] py-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The page column: enter motion on its direct children (the headline first). */
export function DashPage({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "className"
>) {
  return (
    <div className={cn("dash-page flex flex-col gap-6 sm:gap-8", className)} {...rest}>
      {children}
    </div>
  );
}

/** Skeleton while a page's data (or code) loads. It names the page being opened — the page's
 * name from the navigation — so a tab switch shows the new page at once, never the old one under
 * a new highlight (owner, 2026-11-16). */
export function DashSkeleton({ label }: { label?: string }) {
  const { t } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const page = dashPageFor(pathname);
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8" data-testid="dash-skeleton">
      {page && (
        <p className="dash-label" data-testid="tab-heading">
          {t(page.label)}
        </p>
      )}
      <span className="sr-only">{label ?? t("common.loading")}</span>
      <div className="h-6 w-48 animate-pulse rounded-full bg-sol-ivory" />
      <div className="h-[clamp(88px,10vw,160px)] w-[min(44rem,92%)] animate-pulse rounded-[24px] bg-sol-ivory" />
      <div className="h-64 w-full animate-pulse rounded-[40px] bg-sol-ivory" />
    </div>
  );
}

export function DashError({ onRetry, retrying }: { onRetry?: () => void; retrying?: boolean }) {
  const { t } = useLocale();
  return (
    <div
      role="alert"
      data-testid="error-panel"
      className="flex flex-col items-start gap-4 rounded-[32px] border border-sol-warning/50 bg-sol-warning-soft p-[clamp(24px,2.8vw,40px)]"
    >
      <p className="dash-statement">{t("shell.error.title")}</p>
      <p className="dash-body text-sol-ink">{t("shell.error.body")}</p>
      {onRetry && (
        <ActionButton tone="secondary" size="md" arrow={false} onClick={onRetry} loading={retrying}>
          {t("common.retry")}
        </ActionButton>
      )}
    </div>
  );
}

/** "N of M" as segments: filled cobalt for done, an outlined cobalt one for the current. */
export function Segments({
  total,
  done,
  current,
  className,
  tone = "cobalt",
}: {
  total: number;
  done: number;
  current?: number | null;
  className?: string;
  tone?: "cobalt" | "champagne";
}) {
  return (
    <span aria-hidden="true" className={cn("flex w-full gap-1.5", className)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 flex-1 rounded-full",
            i < done
              ? tone === "champagne"
                ? "bg-sol-champagne"
                : "bg-sol-cobalt"
              : i === current
                ? "border-2 border-sol-cobalt"
                : "bg-sol-ivory-depth",
          )}
        />
      ))}
    </span>
  );
}
