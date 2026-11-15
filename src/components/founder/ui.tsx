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

/** The button language for dialogs, sheets, History and Settings — the v2 dashboard tokens
 * (the pages themselves use founder/dash/ui):
 *  primary   — cobalt pill, the single main action on a surface
 *  secondary — outlined pill, the alternative
 *  soft      — pearl pill (a quiet tertiary action)
 *  ghost     — text only
 *  champagne — white pill with ink text, the main action on a dark surface (name kept)
 * Every one has a visible disabled and loading state and a 2px cobalt focus ring. */
export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "champagne";
export type ButtonSize = "md" | "lg" | "sm";

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    // A long label wraps inside its container instead of running past the edge.
    "inline-flex max-w-full select-none items-center justify-center gap-2 text-center leading-tight rounded-full font-semibold transition-[color,background-color,border-color,transform] duration-[180ms] ease-[var(--sol-ease)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    size === "sm" && "min-h-11 px-5 py-2 text-[16px]",
    size === "md" && "min-h-12 px-6 py-2.5 text-[17px]",
    size === "lg" && "min-h-14 px-7 py-3 text-[18px]",
    variant === "primary" && "bg-sol-cobalt text-white hover:bg-sol-cobalt-deep",
    variant === "secondary" &&
      "border border-sol-ink/30 bg-white font-medium text-sol-ink hover:border-sol-ink/60",
    variant === "soft" && "bg-sol-ivory font-medium text-sol-ink hover:bg-sol-ivory-depth",
    variant === "ghost" && "font-medium text-sol-cobalt-deep hover:bg-sol-ivory",
    variant === "champagne" && "bg-white text-sol-ink hover:bg-sol-ivory",
    variant === "danger" &&
      "dash-warn-text border border-sol-warning/50 bg-sol-warning-soft hover:border-sol-warning",
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
    <Tag
      className={cn(
        // v2: the pearl supporting card — no border, no shadow (`feature` kept for callers).
        "rounded-[32px] bg-sol-ivory",
        feature && "bg-sol-ivory",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const PILL: Record<string, string> = {
  cobalt: "bg-white text-sol-cobalt-deep border-sol-cobalt/50",
  champagne: "bg-sol-champagne-soft text-sol-ink border-sol-champagne",
  neutral: "bg-white text-sol-secondary border-sol-ink/25",
  warning: "dash-warn-text bg-sol-warning-soft border-sol-warning/50",
  navy: "bg-sol-ink text-white border-sol-ink",
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
        "inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold",
        PILL[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("dash-label", className)}>{children}</p>;
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
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex min-w-0 flex-col gap-[18px]">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="dash-headline">{title}</h1>
        {subtitle && <p className="dash-lead max-w-[34em]">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-[24px] bg-sol-ivory", className)}
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
      className="flex flex-col items-start gap-4 rounded-[32px] border border-sol-warning/50 bg-sol-warning-soft p-[clamp(24px,2.8vw,40px)]"
    >
      <p className="dash-statement">{title ?? t("shell.error.title")}</p>
      <p className="dash-body text-sol-ink">{body ?? t("shell.error.body")}</p>
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
    <div className="flex flex-col items-start gap-4 rounded-[32px] bg-sol-ivory p-[clamp(24px,2.8vw,40px)]">
      <p className="dash-statement">{title}</p>
      {body && <p className="dash-body max-w-[36em]">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** A definition-style label/value pair used on cards (CUSTOMER / PAIN …). */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="dash-label">{label}</dt>
      <dd className="mt-1.5 text-[19px] leading-snug text-sol-ink">{children}</dd>
    </div>
  );
}
