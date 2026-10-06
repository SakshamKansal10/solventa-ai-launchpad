import { useId, useRef, useState, type KeyboardEvent } from "react";

import { FIT_ICONS, FIT_PIPS } from "@/components/founder/dashboard/fit-constants";
import { StepPath, type PathStep } from "@/components/founder/dashboard/graphics";
import type { FitRow } from "@/lib/fit/matrix";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * ILLUSTRATIVE, READ-ONLY preview of the Solventia workspace as a founder
 * intelligence system — the cinematic world, become an interface. Built from
 * the product's own vocabulary and components (Founder Fit pips, the step
 * path) with sample content for the demonstration founder. Real, semantic,
 * keyboard-operable HTML; it reads and writes no account data, and every
 * value is labelled as illustrative.
 */
const reason = { code: "illustrative", params: {} };
const FIT: FitRow[] = [
  { key: "capability", status: "strong", reason },
  { key: "resources", status: "strong", reason },
  { key: "access", status: "moderate", reason },
  { key: "ambition", status: "moderate", reason },
];

/** The demonstration founder's context, with each signal's weight in the illustrative model. */
const CONTEXT = [
  { label: "Capital", value: "₹50,000", weight: 0.22 },
  { label: "Skills", value: "Digital development", weight: 0.22 },
  { label: "Time", value: "12 h / week", weight: 0.16 },
  { label: "Access", value: "Limited", weight: 0.16 },
  { label: "Experience", value: "Beginner", weight: 0.14 },
  { label: "Location", value: "India", weight: 0.1 },
];

const NARROWING = [360, 120, 36, 9, 3, 1];

const ROADMAP = [
  { stage: "Validate", line: "Discover what reality supports", state: "current" },
  { stage: "Build", line: "Turn evidence into execution", state: "future" },
  { stage: "Elevate", line: "Improve what proves valuable", state: "future" },
] as const;

const STEPS: PathStep[] = [
  { id: "speak", label: "Speak to potential customers", state: "done" },
  { id: "problem", label: "Test the problem", state: "done" },
  { id: "pay", label: "Test willingness to pay", state: "current", note: "Revised after evidence" },
  { id: "prototype", label: "Create first prototype", state: "future" },
];

const LEARNING = [
  { tag: "Evidence", text: "“I wouldn’t pay for this version.”", tone: "text-[#c9c2f5]" },
  { tag: "Assumption", text: "Full version price — contradicted", tone: "text-[#f0b79a]" },
  { tag: "Adapted", text: "Test a lighter starter offer first", tone: "text-[#e9cf98]" },
];

const TABS = [
  { id: "direction", label: "Direction" },
  { id: "week", label: "This week" },
  { id: "evidence", label: "Evidence" },
] as const;

const label = "font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#8f98ab]";

export function ProductPreview() {
  const { t } = useLocale();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("direction");
  const base = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      aria-label="Illustrative Solventia workspace preview"
      data-testid="product-preview"
      className="flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0a0f19] text-[#ece7dd] shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
      style={{ fontFamily: "var(--font-tech)" }}
    >
      {/* System bar */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-[#8b7ff2]" />
            <span className="absolute -inset-1 rounded-full bg-[#8b7ff2]/25" />
          </span>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#d9cfbe]">
            Solventia · Founder OS
          </p>
          <p className="hidden font-mono text-[11px] tracking-[0.12em] text-[#8f98ab] md:block">
            Direction 02 <span aria-hidden="true">›</span> Validate{" "}
            <span aria-hidden="true">›</span> Week 3
          </p>
        </div>
        <p className="rounded-full border border-white/12 px-3 py-1 text-[11.5px] font-medium text-[#c8c2b6]">
          Illustrative preview · sample founder
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Founder context + learning log: what the system knows, and what it has learned. */}
        <aside
          aria-label="Founder context"
          className="hidden w-[248px] shrink-0 flex-col gap-5 border-r border-white/[0.07] px-5 py-5 lg:flex"
        >
          <div>
            <h4 className={label}>Founder context</h4>
            <ul className="mt-3 space-y-2.5">
              {CONTEXT.map((c) => (
                <li key={c.label}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] text-[#a9b0bf]">{c.label}</span>
                    <span className="text-[12.5px] font-medium text-[#ece7dd]">{c.value}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2" aria-hidden="true">
                    <span className="h-[3px] flex-1 rounded-full bg-white/[0.07]">
                      <span
                        className="block h-full rounded-full bg-[#8b7ff2]"
                        style={{ width: `${(c.weight / 0.22) * 100}%` }}
                      />
                    </span>
                    <span className="w-7 text-right font-mono text-[10.5px] text-[#8f98ab]">
                      {c.weight.toFixed(2).slice(1)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto">
            <h4 className={label}>Learning log</h4>
            <ol className="mt-3 space-y-2.5 border-l border-white/10 pl-3">
              {LEARNING.map((l) => (
                <li key={l.tag}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8f98ab]">
                    {l.tag}
                  </p>
                  <p className={`text-[12.5px] leading-snug ${l.tone}`}>{l.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div role="tablist" aria-label="Workspace views" className="flex gap-1 px-4 pt-3 sm:px-6">
            {TABS.map((tb, i) => (
              <button
                key={tb.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                type="button"
                id={`${base}-tab-${tb.id}`}
                aria-selected={tab === tb.id}
                aria-controls={`${base}-panel-${tb.id}`}
                tabIndex={tab === tb.id ? 0 : -1}
                onClick={() => setTab(tb.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={`rounded-full px-4 py-1.5 text-[0.875rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b7ff2] ${
                  tab === tb.id
                    ? "bg-[#ece7dd] text-[#0a0f19]"
                    : "text-[#a9b0bf] hover:bg-white/[0.06] hover:text-[#ece7dd]"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-5">
            {tab === "direction" && (
              <div
                role="tabpanel"
                id={`${base}-panel-direction`}
                aria-labelledby={`${base}-tab-direction`}
              >
                <p className={label}>Chosen direction · 02</p>
                <h3 className="mt-1.5 font-display text-[1.45rem] leading-tight text-[#f3eee4] sm:text-[1.9rem]">
                  A digital service for local businesses
                </h3>
                {/* The selection trace: the same narrowing the visitor just watched. */}
                <div className="mt-4" aria-label="Narrowed from 360 directions to 1">
                  <ol
                    className="flex items-center gap-1.5 font-mono text-[11.5px] text-[#a9b0bf]"
                    aria-hidden="true"
                  >
                    {NARROWING.map((n, i) => (
                      <li key={n} className="flex items-center gap-1.5">
                        <span className={i === NARROWING.length - 1 ? "text-[#e9cf98]" : undefined}>
                          {n}
                        </span>
                        {i < NARROWING.length - 1 && (
                          <span className="h-px w-4 bg-white/20 sm:w-7" />
                        )}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-1.5 text-[12.5px] text-[#8f98ab]">
                    Narrowed against your context, compared, then sent to be tested — not assumed.
                  </p>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <h4 className={label}>Why it fits</h4>
                    <ul className="mt-3 space-y-2 text-[13.5px] text-[#d4cfc5]">
                      <li>Starts within ₹50,000</li>
                      <li>Uses your digital development skills</li>
                      <li>Fits 12 hours a week</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <h4 className={label}>Founder fit</h4>
                    <ul className="mt-3 space-y-2.5" data-testid="fit-signals">
                      {FIT.map((row) => {
                        const Icon = FIT_ICONS[row.key];
                        const status = t(`fit.status.${row.status}` as MessageKey);
                        return (
                          <li key={row.key} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2.5 text-[13.5px] text-[#ece7dd]">
                              <Icon className="size-4 text-[#e3c68e]" aria-hidden="true" />
                              {t(`fit.row.${row.key}` as MessageKey)}
                            </span>
                            <span role="img" aria-label={status} title={status}>
                              <span className="flex items-center gap-1" aria-hidden="true">
                                {[1, 2, 3].map((n) => (
                                  <span
                                    key={n}
                                    className={`h-1.5 w-5 rounded-full ${
                                      n > FIT_PIPS[row.status]
                                        ? "bg-white/10"
                                        : row.status === "strong"
                                          ? "bg-[#e3c68e]"
                                          : "bg-[#8b7ff2]"
                                    }`}
                                  />
                                ))}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                {/* Execution: where this direction is on its path, and the move that matters now. */}
                <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className={label}>Roadmap</h4>
                    <p className="font-mono text-[10.5px] tracking-[0.16em] text-[#8f98ab]">
                      Revised after evidence
                    </p>
                  </div>
                  <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Roadmap stages">
                    {ROADMAP.map((r) => (
                      <li key={r.stage}>
                        <span
                          aria-hidden="true"
                          className={`block h-[3px] rounded-full ${r.state === "current" ? "bg-[#8b7ff2]" : "bg-white/10"}`}
                        />
                        <p
                          className={`mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em] ${r.state === "current" ? "text-[#c9c2f5]" : "text-[#8f98ab]"}`}
                        >
                          {r.stage}
                          {r.state === "current" && (
                            <span className="sr-only"> (current stage)</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-[#d4cfc5]">{r.line}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 border-t border-white/[0.06] pt-3 text-[13px] text-[#ece7dd]">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#e3c68e]">
                      Current move ·{" "}
                    </span>
                    Test willingness to pay with a lighter starter offer.
                  </p>
                </div>
              </div>
            )}
            {tab === "week" && (
              <div role="tabpanel" id={`${base}-panel-week`} aria-labelledby={`${base}-tab-week`}>
                <p className={label}>Validate · this week</p>
                <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-5 sm:px-5">
                  <StepPath steps={STEPS} ariaLabel="Validation path" />
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#e3c68e]/25 bg-[#e3c68e]/[0.06] p-4">
                  <span
                    className="mt-1 size-1.5 shrink-0 rounded-full bg-[#e3c68e]"
                    aria-hidden="true"
                  />
                  <p className="text-[13.5px] text-[#ece7dd]">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#e3c68e]">
                      Today’s move ·{" "}
                    </span>
                    Ask three clinic owners what a lighter starter version would need to do.
                  </p>
                </div>
              </div>
            )}
            {tab === "evidence" && (
              <div
                role="tabpanel"
                id={`${base}-panel-evidence`}
                aria-labelledby={`${base}-tab-evidence`}
              >
                <p className={label}>Assumption → evidence → adaptation</p>
                <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                  <li className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <p className={label}>Assumption</p>
                    <p className="mt-2 text-[14px] font-medium text-[#ece7dd]">
                      Owners will pay for the full version
                    </p>
                    <p className="mt-3 inline-flex rounded-full bg-[#f0b79a]/12 px-2.5 py-0.5 text-[12px] font-semibold text-[#f0b79a]">
                      Contradicted
                    </p>
                  </li>
                  <li className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <p className={label}>Evidence</p>
                    <blockquote className="mt-2 font-display text-[1.2rem] italic leading-snug text-[#f3eee4]">
                      “I wouldn’t pay for this version.”
                    </blockquote>
                  </li>
                  <li className="rounded-xl border border-[#e3c68e]/25 bg-[#e3c68e]/[0.06] p-4">
                    <p className={label}>Adaptation</p>
                    <p className="mt-2 text-[14px] text-[#ece7dd]">
                      Path updated: test a lighter starter offer first.
                    </p>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
