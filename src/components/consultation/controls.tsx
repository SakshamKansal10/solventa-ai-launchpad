import { useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, CircleHelp, Search, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Opt } from "./ui";

/* Question-specific controls. Every one keeps the data-testid (`opt-<name>-<id>`)
 * and the radio / checkbox semantics of the generic option grid it replaces, so a
 * different-looking control is never a different-behaving one. */

/* ---------------------------------------------------------------- StepScale */

/** An ordered answer drawn as a scale: capital, income, turnover (range) and
 * risk, relocation (continuum). The track fills up to the chosen stop; hovering
 * or focusing a stop previews its label; arrow keys move along it. */
export function StepScale({
  name,
  options,
  value,
  onChange,
  variant = "range",
  startLabel,
  endLabel,
  placeholder,
  showStopLabels,
}: {
  name: string;
  options: Opt[];
  value: string | undefined;
  onChange: (id: string) => void;
  variant?: "range" | "continuum";
  startLabel?: string;
  endLabel?: string;
  placeholder?: string;
  /** Continuum only: print every stop's label under the track (sm+). */
  showStopLabels?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const n = options.length;
  const idx = options.findIndex((o) => o.id === value);
  const [hover, setHover] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = hover ?? idx;
  const fill = idx < 0 ? 0 : n > 1 ? idx / (n - 1) : 1;

  function go(next: number) {
    const clamped = Math.min(n - 1, Math.max(0, next));
    onChange(options[clamped].id);
    refs.current[clamped]?.focus();
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(idx < 0 ? 0 : idx + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(idx < 0 ? 0 : idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(n - 1);
    }
  }

  const trackBase =
    variant === "continuum"
      ? "bg-gradient-to-r from-sol-champagne/35 via-sol-violet/25 to-sol-violet/55"
      : "bg-sol-ivory-depth";

  return (
    <div className="flex flex-col gap-4" data-variant={variant}>
      {variant === "range" && (
        <p
          className="min-h-[2.75rem] font-display text-[clamp(1.5rem,1.2rem+1vw,1.875rem)] font-semibold leading-tight text-sol-ink"
          aria-live="polite"
          data-testid={`scale-readout-${name}`}
        >
          {shown >= 0 ? (
            <span className={cn(hover !== null && hover !== idx && "text-sol-secondary")}>
              {options[shown].label}
            </span>
          ) : (
            <span className="text-[1.0625rem] font-medium text-sol-secondary">{placeholder}</span>
          )}
        </p>
      )}

      <div
        role="radiogroup"
        className="relative"
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 h-2 -translate-y-1/2 rounded-full",
            trackBase,
          )}
          style={{ left: `${50 / n}%`, right: `${50 / n}%` }}
        >
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sol-champagne to-sol-violet"
            initial={false}
            animate={{ width: `${fill * 100}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
        <div className="relative flex">
          {options.map((o, i) => {
            const selected = i === idx;
            const passed = idx >= 0 && i <= idx;
            return (
              <button
                key={o.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={o.label}
                tabIndex={selected || (idx < 0 && i === 0) ? 0 : -1}
                data-testid={`opt-${name}-${o.id}`}
                onClick={() => onChange(o.id)}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/50"
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 transition-all duration-200",
                    selected
                      ? "size-8 border-sol-violet bg-sol-violet text-white shadow-[0_6px_16px_rgba(114,87,216,0.35)]"
                      : passed
                        ? "size-4 border-sol-violet bg-sol-violet"
                        : "size-4 border-sol-border-strong bg-sol-surface group-hover:border-sol-violet/60",
                  )}
                >
                  {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between gap-4 text-[0.8125rem] font-semibold text-sol-secondary">
        <span>{startLabel ?? options[0].label}</span>
        <span className="text-right">{endLabel ?? options[n - 1].label}</span>
      </div>

      {variant === "continuum" && showStopLabels && (
        <ul className="hidden sm:flex" aria-hidden="true">
          {options.map((o, i) => (
            <li
              key={o.id}
              className={cn(
                "min-w-0 flex-1 px-1 text-center text-[0.8125rem] leading-tight transition-colors",
                i === idx ? "font-semibold text-sol-ink" : "text-sol-secondary",
              )}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}

      {variant === "continuum" && (
        <p
          className="min-h-[3.25rem] rounded-2xl border border-sol-violet/25 bg-sol-violet-soft px-4 py-3 text-[1.0625rem] font-semibold text-sol-ink sm:hidden"
          aria-live="polite"
        >
          {shown >= 0 ? options[shown].label : placeholder}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ SegmentedScale */

const COLS: Record<number, string> = {
  8: "sm:grid-cols-4",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

/** One connected bar of segments with rising level bars — for "how much" answers
 * such as weekly hours, time horizon and team size. */
export function SegmentedScale({
  name,
  options,
  value,
  onChange,
  noBarsFor = [],
}: {
  name: string;
  options: Opt[];
  value: string | undefined;
  onChange: (id: string) => void;
  /** Options that are not a point on the scale (e.g. "Other") and carry no bars. */
  noBarsFor?: string[];
}) {
  const n = options.length;
  const scaled = options.filter((o) => !noBarsFor.includes(o.id));
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-1.5 rounded-[1.25rem] bg-sol-ivory p-1.5",
        n <= 3 ? "grid-cols-3" : "grid-cols-2",
        COLS[n] ?? "sm:grid-cols-3",
      )}
    >
      {options.map((o, i) => {
        const selected = value === o.id;
        const pos = scaled.findIndex((x) => x.id === o.id);
        const level = pos < 0 ? 0 : 1 + Math.round((pos / Math.max(1, scaled.length - 1)) * 4);
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`opt-${name}-${o.id}`}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex min-h-[4.75rem] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center text-[0.9375rem] font-semibold leading-tight transition-all duration-[180ms]",
              selected
                ? "bg-sol-violet text-white shadow-[0_8px_20px_rgba(114,87,216,0.3)]"
                : "text-sol-ink hover:bg-sol-surface",
            )}
          >
            <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">
              {(level === 0 ? [] : [1, 2, 3, 4, 5]).map((b) => (
                <span
                  key={b}
                  style={{ height: `${28 + b * 14}%` }}
                  className={cn(
                    "w-1.5 rounded-sm transition-colors",
                    b <= level
                      ? selected
                        ? "bg-white"
                        : "bg-sol-violet/70"
                      : selected
                        ? "bg-white/30"
                        : "bg-sol-border-strong",
                  )}
                />
              ))}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- ChipCloud */

export interface ChipGroup {
  label: string;
  ids: string[];
}

/** Multi-select as compact pills, optionally searchable and grouped — for
 * experience domains, interests, access and roles. */
export function ChipCloud({
  name,
  options,
  value,
  onToggle,
  groups,
  searchPlaceholder,
  emptyLabel,
}: {
  name: string;
  options: Opt[];
  value: string[] | undefined;
  onToggle: (id: string) => void;
  groups?: ChipGroup[];
  /** When set, a search box filters the chips. */
  searchPlaceholder?: string;
  emptyLabel?: string;
}) {
  const list = value ?? [];
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const byId = new Map(options.map((o) => [o.id, o]));
  const visible = (o: Opt) => !q || o.label.toLowerCase().includes(q);

  const chip = (o: Opt) => {
    const selected = list.includes(o.id);
    return (
      <button
        key={o.id}
        type="button"
        role="checkbox"
        aria-checked={selected}
        data-testid={`opt-${name}-${o.id}`}
        onClick={() => onToggle(o.id)}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[1rem] font-medium transition-all duration-[180ms]",
          selected
            ? "border-sol-violet bg-sol-violet text-white shadow-[0_6px_16px_rgba(114,87,216,0.25)]"
            : "border-sol-border bg-sol-surface text-sol-ink hover:-translate-y-px hover:border-sol-violet/50",
        )}
      >
        {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
        {o.label}
      </button>
    );
  };

  const shown = options.filter(visible);

  return (
    <div className="flex flex-col gap-4" role="group">
      {searchPlaceholder && (
        <label className="relative block">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sol-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-12 w-full rounded-2xl border border-sol-border bg-sol-surface pl-11 pr-4 text-[1rem] text-sol-ink placeholder:text-sol-secondary/70 focus-visible:border-sol-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/30"
          />
        </label>
      )}
      {shown.length === 0 && emptyLabel && (
        <p className="text-[1rem] text-sol-secondary">{emptyLabel}</p>
      )}
      {groups ? (
        groups.map((g) => {
          const items = g.ids.map((id) => byId.get(id)).filter((o): o is Opt => !!o && visible(o));
          if (items.length === 0) return null;
          return (
            <div key={g.label} className="flex flex-col gap-2.5">
              {g.label && (
                <p className="text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                  {g.label}
                </p>
              )}
              <div className="flex flex-wrap gap-2">{items.map(chip)}</div>
            </div>
          );
        })
      ) : (
        <div className="flex flex-wrap gap-2">{shown.map(chip)}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ DirectionCards */

/** Large, icon-led cards for "which way are you heading" answers — ambition,
 * scale, motivation and team shape. Single-select. */
export function DirectionCards({
  name,
  options,
  value,
  onChange,
  icons,
  columns = 2,
}: {
  name: string;
  options: Opt[];
  value: string | undefined;
  onChange: (id: string) => void;
  icons: Record<string, LucideIcon>;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-3",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-3",
      )}
    >
      {options.map((o) => {
        const selected = value === o.id;
        const Icon = icons[o.id] ?? CircleHelp;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`opt-${name}-${o.id}`}
            onClick={() => onChange(o.id)}
            className={cn(
              "group flex min-h-[4.5rem] items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-[180ms]",
              selected
                ? "border-sol-violet bg-sol-violet-soft shadow-[0_10px_26px_rgba(114,87,216,0.16)]"
                : "border-sol-border bg-sol-surface hover:-translate-y-px hover:border-sol-violet/45",
            )}
          >
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors",
                selected
                  ? "bg-sol-violet text-white"
                  : "bg-sol-champagne-soft text-sol-champagne-deep group-hover:bg-sol-violet-soft group-hover:text-sol-violet-deep",
              )}
            >
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-[1.0625rem] font-semibold leading-snug text-sol-ink">
              {o.label}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                selected
                  ? "border-sol-violet bg-sol-violet text-white"
                  : "border-sol-border-strong",
              )}
            >
              {selected && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- GroupedChecklist */

/** A plain checklist, grouped under headings — for constraints, where the answer
 * is "which of these apply", not a set of equally weighted choices. */
export function GroupedChecklist({
  name,
  options,
  value,
  onToggle,
  groups,
}: {
  name: string;
  options: Opt[];
  value: string[] | undefined;
  onToggle: (id: string) => void;
  groups: ChipGroup[];
}) {
  const list = value ?? [];
  const byId = new Map(options.map((o) => [o.id, o]));
  return (
    <div className="flex flex-col gap-5" role="group">
      {groups.map((g) => {
        const items = g.ids.map((id) => byId.get(id)).filter((o): o is Opt => !!o);
        if (items.length === 0) return null;
        return (
          <div key={g.label}>
            {g.label && (
              <p className="mb-2 text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                {g.label}
              </p>
            )}
            <div className="divide-y divide-sol-border overflow-hidden rounded-2xl border border-sol-border bg-sol-surface">
              {items.map((o) => {
                const selected = list.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    data-testid={`opt-${name}-${o.id}`}
                    onClick={() => onToggle(o.id)}
                    className={cn(
                      "flex min-h-[3.25rem] w-full items-center gap-3.5 px-4 py-3 text-left text-[1.0625rem] font-medium transition-colors",
                      selected
                        ? "bg-sol-violet-soft/70 text-sol-ink"
                        : "text-sol-ink hover:bg-sol-ivory/60",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        selected
                          ? "border-sol-violet bg-sol-violet text-white"
                          : "border-sol-border-strong bg-sol-surface",
                      )}
                    >
                      {selected && <Check className="size-4" strokeWidth={3} />}
                    </span>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
