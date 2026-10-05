import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createLink } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** One button language for the whole logged-in product:
 *  primary   — navy, the single main action on a surface
 *  secondary — outlined, the alternative
 *  soft      — violet-soft surface + violet border (a noticeable tertiary action)
 *  ghost     — text only
 *  champagne — ivory-to-champagne, the single main action on a dark surface
 * Every one has a visible disabled and loading state. */
export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "champagne";
export type ButtonSize = "md" | "lg" | "sm";

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition-colors duration-[180ms] ease-[var(--sol-ease)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    size === "sm" && "min-h-10 px-4 text-[0.9375rem]",
    size === "md" && "min-h-12 px-6 text-[1rem]",
    size === "lg" && "min-h-14 px-8 text-[1.0625rem]",
    variant === "primary" && "bg-sol-navy text-white hover:bg-sol-navy-soft",
    variant === "secondary" &&
      "border border-sol-border-strong bg-sol-surface text-sol-ink hover:border-sol-violet/50",
    variant === "soft" &&
      "border border-sol-violet/40 bg-sol-violet-soft text-sol-violet-deep hover:border-sol-violet hover:bg-sol-violet-soft/70",
    variant === "ghost" && "text-sol-violet-deep hover:bg-sol-violet-soft",
    variant === "champagne" &&
      "bg-[linear-gradient(135deg,#FFFDFB_0%,#F2ECE2_55%,#DCC08B_100%)] text-sol-navy shadow-[0_10px_30px_rgba(220,192,139,0.22)] hover:brightness-[1.04]",
    variant === "danger" &&
      "border border-sol-warning/50 bg-sol-warning-soft text-sol-warning hover:border-sol-warning",
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses(variant, size), className)}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

interface AnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const ButtonAnchor = forwardRef<HTMLAnchorElement, AnchorProps>(function ButtonAnchor(
  { variant = "primary", size = "md", className, ...rest },
  ref,
) {
  return <a ref={ref} className={cn(buttonClasses(variant, size), className)} {...rest} />;
});

/** A real, type-checked router link that looks like a button. */
export const LinkButton = createLink(ButtonAnchor);

export function Card({
  children,
  className,
  feature = false,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  feature?: boolean;
  as?: "section" | "div" | "article" | "aside";
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  return (
    <Tag className={cn(feature ? "sol-card-feature" : "sol-card", className)} {...rest}>
      {children}
    </Tag>
  );
}

const PILL: Record<string, string> = {
  violet: "bg-sol-violet-soft text-sol-violet-deep border-sol-violet/25",
  champagne: "bg-sol-champagne-soft text-sol-champagne-deep border-sol-champagne/40",
  neutral: "bg-sol-ivory text-sol-secondary border-sol-border",
  warning: "bg-sol-warning-soft text-sol-warning border-sol-warning/30",
  navy: "bg-sol-navy text-white border-sol-navy",
};

export type PillTone = keyof typeof PILL;

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 text-[0.875rem] font-semibold",
        PILL[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("sol-eyebrow", className)}>{children}</p>;
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="sol-page-title">{title}</h1>
        {subtitle && <p className="sol-body sol-prose mt-3 text-sol-secondary">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-2xl bg-sol-ivory-depth/70", className)}
    />
  );
}

/** Route-level skeleton — shown instead of any (possibly stale) data while the
 * real data loads, so the wrong consultation is never flashed. */
export function PageSkeleton({ label }: { label?: string }) {
  const { t } = useLocale();
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">{label ?? t("common.loading")}</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-[min(28rem,80%)]" />
        <Skeleton className="h-5 w-[min(36rem,90%)]" />
      </div>
      <Skeleton className="h-72 w-full rounded-[1.5rem]" />
      <div className="grid gap-5 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

export function ErrorPanel({
  title,
  body,
  onRetry,
  retrying,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const { t } = useLocale();
  return (
    <div
      role="alert"
      data-testid="error-panel"
      className="flex flex-col items-start gap-3 rounded-[1.25rem] border border-sol-warning/40 bg-sol-warning-soft p-6"
    >
      <p className="sol-h3">{title ?? t("shell.error.title")}</p>
      <p className="sol-body sol-prose">{body ?? t("shell.error.body")}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} loading={retrying}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sol-card flex flex-col items-start gap-3 p-8">
      <p className="sol-h3">{title}</p>
      {body && <p className="sol-body sol-prose text-sol-secondary">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** A definition-style label/value pair used on cards (CUSTOMER / PAIN …). */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
        {label}
      </dt>
      <dd className="mt-1.5 text-[1.0625rem] leading-snug text-sol-ink">{children}</dd>
    </div>
  );
}
