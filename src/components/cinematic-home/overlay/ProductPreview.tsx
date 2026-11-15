import { ArrowRight, Check } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { BrandLockup } from "@/components/brand/Brand";

import { soundController } from "../sound/controller";

/**
 * ILLUSTRATIVE, READ-ONLY preview of the Solventia workspace — the cinematic world, become the
 * product. It is the redesigned "Today" screen (redesign v2), drawn with the dashboard's own
 * design tokens: the white canvas, the pill navigation, one very large mission headline, the
 * cobalt action and mission numeral, the navy journey block. Sample content for the demonstration
 * founder; real, semantic, keyboard-operable HTML that reads and writes no account data, labelled
 * as illustrative. A static overlay (never the live dashboard components), sized in container
 * units so it is crisp at the scene's real size (1040 × 650 on desktop, 760 × 475, phones).
 */
const TABS = [
  { id: "today", label: "Today" },
  { id: "roadmap", label: "Roadmap" },
  { id: "proof", label: "Proof" },
] as const;

const MISSIONS = [
  { label: "List ten clinics that lose patients to missed follow-ups", state: "done" },
  {
    label: "Talk to five clinic owners about missed follow-ups",
    state: "current",
    note: "Revised after proof",
  },
  { label: "Decide: continue, revise or reconsider", state: "next" },
] as const;

const CHECKS = [
  { label: "Clinics lose patients to missed follow-ups", status: "Supported", tone: "good" },
  { label: "Owners would pay for reminders every month", status: "Contradicted", tone: "warn" },
  { label: "Front desks already send reminders by hand", status: "Not tested", tone: "quiet" },
] as const;

/** Type and spacing scale with the panel (1cqw = 1% of its width), never below legibility. */
const LABEL =
  "text-[clamp(10px,1.15cqw,12px)] font-semibold uppercase tracking-[0.08em] text-sol-secondary";
const META = "text-[clamp(11px,1.45cqw,15px)] text-sol-secondary";
const PILL =
  "inline-flex items-center rounded-full px-[clamp(10px,1.4cqw,16px)] min-h-[clamp(24px,3.1cqw,34px)] text-[clamp(10px,1.25cqw,13px)] font-semibold";

export function ProductPreview() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("today");
  const base = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next].id);
    soundController.ui();
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      aria-label="Illustrative Solventia workspace preview"
      data-testid="product-preview"
      className="@container relative flex h-full w-full flex-col overflow-hidden rounded-[clamp(14px,2cqw,22px)] bg-white text-sol-ink shadow-[0_0_0_1px_rgba(21,24,31,0.12)]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* The top bar: lockup, the pill navigation (a real tablist here), Ask Sol, the founder. */}
      <header className="flex shrink-0 items-center justify-between gap-3 px-[3.4cqw] pt-[2.2cqw]">
        <span className="hidden @[560px]:block">
          <BrandLockup preset="compact" />
        </span>
        <div
          role="tablist"
          aria-label="Workspace views"
          className="flex items-center gap-1 rounded-full bg-sol-pearl p-[clamp(3px,0.45cqw,5px)]"
        >
          {TABS.map((tb, i) => (
            <button
              key={tb.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tb.id}`}
              aria-selected={tab === tb.id}
              aria-controls={`${base}-panel-${tb.id}`}
              tabIndex={tab === tb.id ? 0 : -1}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => {
                setTab(tb.id);
                soundController.ui();
              }}
              className={`min-h-[clamp(26px,3.6cqw,38px)] rounded-full px-[clamp(12px,2cqw,22px)] text-[clamp(11px,1.45cqw,15px)] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt ${
                tab === tb.id ? "bg-sol-ink text-white" : "text-sol-secondary hover:text-sol-ink"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-[1cqw]" aria-hidden="true">
          <span
            className={`${PILL} hidden gap-2 border border-sol-ink/15 text-sol-ink @[560px]:inline-flex`}
          >
            <span className="size-[0.7cqw] min-h-[6px] min-w-[6px] rounded-full bg-sol-cobalt" />
            Ask Sol
          </span>
          <span className="grid size-[clamp(28px,4cqw,42px)] place-items-center rounded-full bg-sol-navy text-[clamp(10px,1.3cqw,14px)] font-semibold text-white">
            AV
          </span>
        </span>
      </header>

      {/* Always shown: every value on this surface is sample data. */}
      <p
        className={`${LABEL} px-[3.4cqw] pt-[1.6cqw] @[560px]:absolute @[560px]:right-[3.4cqw] @[560px]:top-[7.6cqw] @[560px]:p-0`}
      >
        Illustrative preview · sample founder
      </p>

      {tab === "today" && (
        <div
          role="tabpanel"
          id={`${base}-panel-today`}
          aria-labelledby={`${base}-tab-today`}
          className="flex min-h-0 flex-1 flex-col px-[3.4cqw] pt-[3.6cqw]"
        >
          <p className="text-[clamp(12px,1.75cqw,19px)] text-sol-muted">
            Hello, Asha. <span className="font-medium text-sol-ink">One thing to do today.</span>
          </p>
          <div className="mt-[2.4cqw] flex flex-wrap gap-2">
            <span className={`${PILL} bg-sol-ink text-white`}>Today&rsquo;s mission</span>
            <span className={`${PILL} border border-sol-ink/20 text-sol-secondary`}>~2 hrs</span>
          </div>
          <div className="mt-[1.6cqw] flex min-h-0 items-end justify-between gap-[3cqw]">
            <div className="flex min-w-0 flex-[1_1_0] flex-col gap-[1.6cqw]">
              <h3 className="max-w-[13em] text-[clamp(22px,5.3cqw,56px)] font-medium leading-[1.02] tracking-[-0.035em]">
                Talk to five clinic owners about missed follow-ups
              </h3>
              <p className="max-w-[30em] text-[clamp(11px,1.7cqw,18px)] leading-[1.45] text-sol-secondary">
                What you hear decides whether the reminder service is worth building.
              </p>
              <span
                className="mt-[0.6cqw] flex flex-wrap items-center gap-[1.2cqw]"
                aria-hidden="true"
              >
                <span className="inline-flex min-h-[clamp(30px,4.4cqw,46px)] items-center gap-2 rounded-full bg-sol-cobalt px-[2.4cqw] text-[clamp(11px,1.55cqw,16px)] font-semibold text-white">
                  Start mission
                  <ArrowRight className="size-[clamp(12px,1.6cqw,16px)]" />
                </span>
                <span className="hidden min-h-[clamp(30px,4.4cqw,46px)] items-center rounded-full border border-sol-ink/25 px-[2.4cqw] text-[clamp(11px,1.55cqw,16px)] font-medium text-sol-ink @[560px]:inline-flex">
                  See this week&rsquo;s 3 missions
                </span>
              </span>
            </div>
            <div
              className="hidden shrink-0 flex-col items-start gap-[0.8cqw] @[560px]:flex"
              aria-hidden="true"
            >
              <span className="text-[clamp(56px,12.5cqw,132px)] font-medium leading-[0.85] tracking-[-0.05em] text-sol-cobalt">
                02
              </span>
              <span className={META}>Mission 2 of 3 this week</span>
              <span className="flex w-full gap-[0.5cqw]">
                <span className="h-[0.55cqw] min-h-[4px] flex-1 rounded-full bg-sol-champagne" />
                <span className="h-[0.55cqw] min-h-[4px] flex-1 rounded-full border-2 border-sol-cobalt" />
                <span className="h-[0.55cqw] min-h-[4px] flex-1 rounded-full bg-sol-pearl" />
              </span>
            </div>
          </div>
          {/* The journey block, cut by the frame as on a real screen. */}
          <div
            className="mt-auto flex translate-y-[1.2cqw] items-start justify-between gap-3 rounded-t-[clamp(16px,2.6cqw,28px)] bg-sol-navy px-[3cqw] pb-[3.4cqw] pt-[2.4cqw] text-white"
            aria-hidden="true"
          >
            <span className="flex flex-col gap-[0.6cqw]">
              <span className="text-[clamp(15px,2.6cqw,28px)] font-medium tracking-[-0.02em]">
                Your 12 weeks
              </span>
              <span className="text-[clamp(10px,1.3cqw,14px)] text-white/70">
                Week 2 of 12 · Validate demand
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-[clamp(11px,1.4cqw,15px)] font-semibold">
              Open roadmap <ArrowRight className="size-[clamp(12px,1.5cqw,16px)]" />
            </span>
          </div>
        </div>
      )}

      {tab === "roadmap" && (
        <div
          role="tabpanel"
          id={`${base}-panel-roadmap`}
          aria-labelledby={`${base}-tab-roadmap`}
          className="flex flex-1 flex-col gap-[2cqw] px-[3.4cqw] pt-[3.6cqw]"
        >
          <p className={LABEL}>Week 2 of 12 · Validate demand</p>
          <h3 className="text-[clamp(18px,3.4cqw,36px)] font-medium leading-[1.08] tracking-[-0.03em]">
            This week&rsquo;s three missions
          </h3>
          <ol className="flex flex-col gap-[1.2cqw]">
            {MISSIONS.map((m, i) => (
              <li
                key={m.label}
                className={`flex items-center gap-[1.6cqw] rounded-[clamp(14px,2cqw,22px)] border px-[2cqw] py-[1.4cqw] ${
                  m.state === "current" ? "border-sol-cobalt" : "border-sol-border"
                }`}
              >
                <span
                  className={`grid size-[clamp(24px,3.2cqw,34px)] shrink-0 place-items-center rounded-full text-[clamp(11px,1.4cqw,15px)] font-semibold ${
                    m.state === "done"
                      ? "bg-sol-champagne text-sol-ink"
                      : m.state === "current"
                        ? "bg-sol-cobalt text-white"
                        : "bg-sol-pearl text-sol-secondary"
                  }`}
                >
                  {m.state === "done" ? (
                    <Check className="size-[1.6cqw] min-h-3 min-w-3" aria-label="Done" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    className={`text-[clamp(12px,1.75cqw,19px)] font-medium ${m.state === "done" ? "text-sol-muted" : "text-sol-ink"}`}
                  >
                    {m.label}
                  </span>
                  {"note" in m && <span className={META}>{m.note}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === "proof" && (
        <div
          role="tabpanel"
          id={`${base}-panel-proof`}
          aria-labelledby={`${base}-tab-proof`}
          className="flex flex-1 flex-col gap-[2cqw] px-[3.4cqw] pt-[3.6cqw]"
        >
          <p className={LABEL}>Things to check</p>
          <h3 className="text-[clamp(18px,3.4cqw,36px)] font-medium leading-[1.08] tracking-[-0.03em]">
            1 of 3 checked. One said no — and that is useful.
          </h3>
          <ul className="flex flex-col gap-[1.2cqw]">
            {CHECKS.map((c) => (
              <li
                key={c.label}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[clamp(14px,2cqw,22px)] bg-sol-pearl px-[2cqw] py-[1.4cqw]"
              >
                <span className="text-[clamp(12px,1.75cqw,19px)] font-medium">{c.label}</span>
                <span
                  className={`${PILL} ${
                    c.tone === "good"
                      ? "bg-sol-champagne/40 text-sol-ink"
                      : c.tone === "warn"
                        ? "dash-warn-text border border-sol-warning/50 bg-sol-warning-soft"
                        : "border border-sol-ink/15 text-sol-secondary"
                  }`}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
