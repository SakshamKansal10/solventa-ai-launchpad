import { useId, useState, type ReactNode } from "react";
import { ArrowRight, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * THE FOUNDER OS DESIGN SYSTEM — the product's own editorial language, continuous with the
 * homepage: a warm pearl canvas, near-black ink, deep navy for the one action, Solventia's
 * trajectory blue for paths and flows, champagne only for what is resolved or current.
 *
 * Every screen: ONE dominant question, ONE dominant visual, ONE primary action. Hierarchy comes
 * from scale, weight, position and space — never from fading important text.
 */

export const OS = {
  ink: "#171A27",
  secondary: "#454B59",
  navy: "#0B1F3B",
  champagne: "#B8924F",
  champagneDeep: "#7A5B2B",
  blue: "#2F62D9",
  hair: "rgba(23, 26, 39, 0.1)",
} as const;

/** The display face (Geist, as on the homepage), with Devanagari covered by the site's sans. */
const DISPLAY = "font-os";

/** Small chapter line above a heading — readable, never faint. */
export function OsEyebrow({
  children,
  className,
  tone = "ink",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tone?: "ink" | "champagne" | "blue";
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...rest}
      className={cn(
        "text-[0.875rem] font-semibold uppercase leading-none tracking-[0.12em]",
        tone === "ink" && "text-[#3C4250]",
        tone === "champagne" && "text-[#7A5B2B]",
        tone === "blue" && "text-[#2448A8]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** The one dominant statement of a screen. */
export function OsDisplay({
  children,
  className,
  as: Tag = "h1",
  size = "hero",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "p";
  /** hero: a short statement · title: a direction's (often long) name · section: a heading. */
  size?: "hero" | "title" | "section";
} & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <Tag
      className={cn(
        DISPLAY,
        "font-medium uppercase text-[#171A27] [text-wrap:balance]",
        size === "hero" &&
          "text-[clamp(2.35rem,1.2rem+4vw,5.25rem)] leading-[0.95] tracking-[-0.04em]",
        size === "title" &&
          "text-[clamp(2.05rem,1.15rem+2.5vw,3.85rem)] leading-[0.98] tracking-[-0.035em]",
        size === "section" &&
          "text-[clamp(1.6rem,1.05rem+1.7vw,2.6rem)] leading-[1] tracking-[-0.03em]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A deliberate sentence — the plain-language line under a heading. */
export function OsLead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "max-w-[46ch] text-[clamp(1.0625rem,0.98rem+0.35vw,1.3rem)] leading-[1.45] text-[#2A2F3B]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Short points — the only way detail is written. */
export function OsPoints({
  points,
  className,
  tone = "ink",
}: {
  points: string[];
  className?: string;
  tone?: "ink" | "champagne";
}) {
  if (points.length === 0) return null;
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {points.map((p) => (
        <li key={p} className="flex items-start gap-3 text-[1.0625rem] leading-snug text-[#171A27]">
          <span
            aria-hidden="true"
            className={cn(
              "mt-[0.55em] size-1.5 shrink-0 rounded-full",
              tone === "champagne" ? "bg-[#B8924F]" : "bg-[#171A27]",
            )}
          />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

/** Classes for the ONE primary action of a surface (deep navy, generous, unmistakable). */
export const primaryActionClass =
  "inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#0B1F3B] px-7 text-[1.0625rem] font-semibold tracking-[-0.005em] text-white transition-[background-color,transform] duration-200 hover:bg-[#18305A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2F62D9] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

/** A quiet secondary path — text with an arrow. */
export const textActionClass =
  "inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-[1rem] font-semibold text-[#171A27] underline-offset-[6px] transition-colors hover:text-[#2448A8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9]";

export function ActionArrow({ className }: { className?: string }) {
  return <ArrowRight className={cn("size-[18px] shrink-0", className)} aria-hidden="true" />;
}

/** A hairline frame for a visual — no heavy shadow, no glass. */
export function OsFrame({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-[#171A27]/[0.09] bg-white/70",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * The Flash Card — detail lives here, never on the main canvas. Closed: a label and one
 * headline. Open: the short points (and an optional action). Expands smoothly in place; a real
 * button with aria-expanded, keyboard-operable.
 */
export function FlashCard({
  label,
  headline,
  points,
  action,
  defaultOpen = false,
  className,
  testId,
}: {
  label: string;
  headline: string;
  points: string[];
  action?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div
      data-testid={testId}
      data-open={open}
      className={cn(
        "rounded-[20px] border bg-white/80 transition-colors duration-200",
        open ? "border-[#171A27]/20" : "border-[#171A27]/[0.09] hover:border-[#171A27]/20",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 rounded-[20px] px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9] sm:px-6 sm:py-5"
      >
        <span className="min-w-0">
          <span className="block text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
            {label}
          </span>
          <span className="mt-1.5 block text-[1.1875rem] font-semibold leading-snug text-[#171A27]">
            {headline}
          </span>
        </span>
        <Plus
          className={cn(
            "mt-1 size-5 shrink-0 text-[#171A27] transition-transform duration-300 ease-[var(--sol-ease)]",
            open && "rotate-45",
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={id}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[var(--sol-ease)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="flex flex-col gap-4 px-5 pb-5 sm:px-6">
            <OsPoints points={points} />
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A compact numbered priority (max three per screen). */
export function Priority({
  n,
  title,
  done = false,
  active = false,
  onOpen,
  testId,
}: {
  n: number;
  title: string;
  done?: boolean;
  active?: boolean;
  onOpen?: () => void;
  testId?: string;
}) {
  const body = (
    <>
      <span
        className={cn(
          "font-os text-[1.75rem] font-medium leading-none tracking-[-0.03em] tabular-nums",
          done ? "text-[#B8924F]" : active ? "text-[#171A27]" : "text-[#5B6170]",
        )}
      >
        {String(n).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 text-[1.0625rem] font-semibold leading-snug",
          done ? "text-[#454B59] line-through decoration-[#B8924F]/60" : "text-[#171A27]",
        )}
      >
        {title}
      </span>
      {onOpen && <ActionArrow className="mt-1 text-[#171A27]" />}
    </>
  );
  const cls =
    "flex w-full items-start gap-5 border-t border-[#171A27]/[0.09] py-5 text-left first:border-t-0";
  return onOpen ? (
    <button
      type="button"
      data-testid={testId}
      onClick={onOpen}
      className={cn(
        cls,
        "rounded-lg transition-colors hover:bg-[#171A27]/[0.025] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9]",
      )}
    >
      {body}
    </button>
  ) : (
    <div data-testid={testId} className={cls}>
      {body}
    </div>
  );
}

/** A labelled fact, read large (value) under a readable label. */
export function OsFact({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
        {label}
      </dt>
      <dd className="mt-1.5 text-[1.125rem] font-semibold leading-snug text-[#171A27]">{value}</dd>
    </div>
  );
}
