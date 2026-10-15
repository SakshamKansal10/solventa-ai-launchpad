import { Check, Lightbulb, Rocket, Users, Wallet, type LucideIcon } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { Wordmark } from "../nav/Wordmark";
import { soundController } from "../sound/controller";

/**
 * ILLUSTRATIVE, READ-ONLY preview of the Solventia workspace — the cinematic world, become an
 * interface. Where the film resolves into clarity the surface turns pearl: the same Solventia
 * system, now human-facing. Built from the product's own vocabulary (Founder Fit pips) with
 * sample content for the demonstration founder. Real, semantic, keyboard-operable HTML; it reads
 * and writes no account data, and every value is labelled as illustrative.
 *
 * Colour: ink on pearl; champagne for conviction (the chosen direction, the next move, strong
 * fit); violet only for the live, reasoning state.
 */
/** Founder Fit for the sample direction — a level, never a number (the product's own pips). */
type FitStatus = "strong" | "moderate";
const FIT: { key: string; label: string; status: FitStatus; icon: LucideIcon }[] = [
  { key: "capability", label: "Capability", status: "strong", icon: Lightbulb },
  { key: "resources", label: "Resources", status: "strong", icon: Wallet },
  { key: "access", label: "Access", status: "moderate", icon: Users },
  { key: "ambition", label: "Ambition", status: "moderate", icon: Rocket },
];
const FIT_PIPS: Record<FitStatus, number> = { strong: 3, moderate: 2 };
const FIT_STATUS: Record<FitStatus, string> = { strong: "Strong fit", moderate: "Moderate fit" };

/** The demonstration founder's context. */
const CONTEXT = [
  { label: "Capital", value: "₹50,000" },
  { label: "Skills", value: "Digital development" },
  { label: "Time", value: "12 h / week" },
  { label: "Access", value: "Limited" },
  { label: "Experience", value: "Beginner" },
  { label: "Location", value: "India" },
];

const NARROWING = [360, 120, 36, 9, 3, 1];

const ROADMAP = [
  { stage: "Validate", state: "current" },
  { stage: "Build", state: "future" },
  { stage: "Elevate", state: "future" },
] as const;

const STEPS = [
  { id: "speak", label: "Speak to potential customers", state: "done" },
  { id: "problem", label: "Test the problem", state: "done" },
  { id: "pay", label: "Test willingness to pay", state: "current", note: "Revised after evidence" },
  { id: "prototype", label: "Create first prototype", state: "future" },
] as const;

/** Illustrative direction confidence: when selected, once the evidence landed, after adapting. */
const CONFIDENCE = [
  { at: "Selected", value: 0.62 },
  { at: "Contradicted", value: 0.41 },
  { at: "Adapted", value: 0.68 },
] as const;

const TABS = [
  { id: "direction", label: "Direction" },
  { id: "week", label: "This week" },
  { id: "evidence", label: "Evidence" },
] as const;

const INK = "text-[#12161F]";
const SECONDARY = "text-[#555C6B]";
const GOLD_TEXT = "text-[#77592A]";
const label = "font-mono text-[11px] uppercase tracking-[0.2em] text-[#5E6575]";
const card =
  "rounded-2xl border border-[#12161F]/[0.07] bg-white/80 shadow-[0_1px_2px_rgba(18,22,31,0.04)]";
const warm = "rounded-2xl border border-[#C9AA79]/45 bg-[#F4ECDD]";

/** Confidence through the evidence loop: a dip when reality disagreed, a recovery after adapting. */
function ConfidenceTrace() {
  const W = 120;
  const H = 30;
  const pts = CONFIDENCE.map((c, i) => [
    5 + (i * (W - 10)) / (CONFIDENCE.length - 1),
    H - 4 - ((c.value - 0.3) / 0.45) * (H - 8),
  ]);
  const last = CONFIDENCE[CONFIDENCE.length - 1];
  return (
    <figure
      className={`${card} shrink-0 px-4 py-3`}
      aria-label={`Illustrative direction confidence: ${CONFIDENCE.map((c) => `${c.value.toFixed(2)} ${c.at.toLowerCase()}`).join(", ")}`}
    >
      <div className="flex items-baseline justify-between gap-5" aria-hidden="true">
        <span className={label}>Confidence</span>
        <span className={`text-[20px] font-semibold tracking-[-0.02em] tabular-nums ${GOLD_TEXT}`}>
          {last.value.toFixed(2)}
        </span>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mt-1.5" aria-hidden="true">
        <polyline
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="rgba(18,22,31,0.28)"
          strokeWidth="1.25"
        />
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === pts.length - 1 ? 3.2 : 2.4}
            fill={i === 1 ? "#C2643C" : i === pts.length - 1 ? "#B8924F" : "#9AA0AD"}
          />
        ))}
      </svg>
    </figure>
  );
}

export function ProductPreview() {
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
      className={`flex h-full w-full flex-col overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#F8F6F1_0%,#EEEAE2_100%)] ${INK} shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_40px_120px_rgba(0,0,0,0.55)]`}
      style={{ fontFamily: "var(--font-tech)" }}
    >
      {/* System bar: the same identity as the site bar. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#12161F]/[0.07] px-5 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Wordmark size="sm" tone="ink" />
          <span aria-hidden="true" className="hidden h-4 w-px bg-[#12161F]/12 md:block" />
          <p className={`hidden items-center gap-2 text-[13px] md:flex ${SECONDARY}`}>
            <span aria-hidden="true" className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-[#6A5CE0]" />
              <span className="absolute -inset-1 rounded-full bg-[#6A5CE0]/20" />
            </span>
            Direction 02 <span aria-hidden="true">›</span> Validate{" "}
            <span aria-hidden="true">›</span> Week 3
          </p>
        </div>
        <p
          className={`rounded-full border border-[#12161F]/10 px-3 py-1 text-[12px] font-medium ${SECONDARY}`}
        >
          Illustrative preview · sample founder
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* What the system knows about the founder, and how far it narrowed. */}
        <aside
          aria-label="Founder context"
          className="hidden w-[236px] shrink-0 flex-col border-r border-[#12161F]/[0.07] bg-white/35 px-6 py-6 lg:flex"
        >
          <h4 className={label}>Your reality</h4>
          <dl className="mt-3 divide-y divide-[#12161F]/[0.06]">
            {CONTEXT.map((c) => (
              <div key={c.label} className="flex items-baseline justify-between gap-3 py-3">
                <dt className={`text-[13.5px] ${SECONDARY}`}>{c.label}</dt>
                <dd className="text-right text-[13.5px] font-medium">{c.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto" aria-label="Narrowed from 360 directions to 1">
            <h4 className={label}>Narrowed</h4>
            <ol
              className="mt-2.5 flex items-center gap-1.5 font-mono text-[11.5px] tabular-nums text-[#5E6575]"
              aria-hidden="true"
            >
              {NARROWING.map((n, i) => (
                <li key={n} className="flex items-center gap-1.5">
                  <span
                    className={
                      i === NARROWING.length - 1 ? `font-semibold ${GOLD_TEXT}` : undefined
                    }
                  >
                    {n}
                  </span>
                  {i < NARROWING.length - 1 && <span className="h-px w-2.5 bg-[#12161F]/15" />}
                </li>
              ))}
            </ol>
            <p className={`mt-2 text-[12px] leading-snug ${SECONDARY}`}>
              Against your context, then tested — not assumed.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-5 pt-4 sm:px-7 sm:pt-5">
            <div
              role="tablist"
              aria-label="Workspace views"
              className="inline-flex gap-1 rounded-full bg-[#12161F]/[0.045] p-1"
            >
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
                  onClick={() => {
                    setTab(tb.id);
                    soundController.ui();
                  }}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`rounded-full px-4 py-1.5 text-[0.875rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A5CE0] ${
                    tab === tb.id
                      ? `bg-white ${INK} shadow-[0_1px_3px_rgba(18,22,31,0.12)]`
                      : `${SECONDARY} hover:text-[#12161F]`
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-auto px-5 py-4 sm:px-7 sm:py-6">
            {tab === "direction" && (
              <div
                role="tabpanel"
                id={`${base}-panel-direction`}
                aria-labelledby={`${base}-tab-direction`}
                className="flex flex-1 flex-col"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <p className={label}>Chosen direction · 02</p>
                    <h3
                      className="mt-2.5 text-[1.6rem] font-semibold leading-[1.08] tracking-[-0.035em] text-balance sm:text-[1.95rem]"
                      style={{ fontFamily: "var(--font-tech)" }}
                    >
                      A digital service for local businesses
                    </h3>
                    <p className={`mt-2.5 text-[14px] ${SECONDARY}`}>
                      Chosen over Directions 01 and 03 on the same six signals.
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <ConfidenceTrace />
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className={`${card} p-5`}>
                    <h4 className={label}>Why it fits</h4>
                    <ul className="mt-3.5 space-y-2.5 text-[14.5px]">
                      {[
                        "Starts within ₹50,000",
                        "Uses your digital skills",
                        "Fits 12 hours a week",
                      ].map((line) => (
                        <li key={line} className="flex items-center gap-2.5">
                          <Check
                            className="size-3.5 text-[#B8924F]"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`${card} p-5`}>
                    <h4 className={label}>Founder fit</h4>
                    <ul className="mt-3.5 space-y-2.5" data-testid="fit-signals">
                      {FIT.map((row) => {
                        const Icon = row.icon;
                        const status = FIT_STATUS[row.status];
                        return (
                          <li key={row.key} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2.5 text-[14.5px]">
                              <Icon className="size-4 text-[#5E6575]" aria-hidden="true" />
                              {row.label}
                            </span>
                            <span role="img" aria-label={status} title={status}>
                              <span className="flex items-center gap-1" aria-hidden="true">
                                {[1, 2, 3].map((n) => (
                                  <span
                                    key={n}
                                    className={`h-1.5 w-5 rounded-full ${
                                      n > FIT_PIPS[row.status] ? "bg-[#12161F]/10" : "bg-[#C9AA79]"
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
                {/* The move that matters now — the strongest thing on the surface: this is what
                    the software tells the founder to do next. Where it sits on the path, below. */}
                <div className={`${warm} mt-auto px-6 py-5 max-sm:mt-4`}>
                  <div className="flex items-center justify-between gap-4">
                    <p
                      className={`font-mono text-[11px] font-medium uppercase tracking-[0.2em] ${GOLD_TEXT}`}
                    >
                      Your next move
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5E6575]">
                      Validate · Week 3
                    </p>
                  </div>
                  <p className="mt-2 text-[19px] font-semibold leading-snug tracking-[-0.02em]">
                    Test willingness to pay with a lighter starter offer.
                  </p>
                  <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Roadmap stages">
                    {ROADMAP.map((r) => (
                      <li key={r.stage}>
                        <span
                          aria-hidden="true"
                          className={`block h-[3px] rounded-full ${r.state === "current" ? "bg-[#B8924F]" : "bg-[#12161F]/12"}`}
                        />
                        <p
                          className={`mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] ${r.state === "current" ? GOLD_TEXT : "text-[#5E6575]"}`}
                        >
                          {r.stage}
                          {r.state === "current" && (
                            <span className="sr-only"> (current stage)</span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
            {tab === "week" && (
              <div role="tabpanel" id={`${base}-panel-week`} aria-labelledby={`${base}-tab-week`}>
                <p className={label}>Validate · this week</p>
                <nav aria-label="Validation path" className={`${card} mt-4 px-5 py-5`}>
                  <ol className="grid gap-4 sm:grid-cols-4">
                    {STEPS.map((s, i) => (
                      <li
                        key={s.id}
                        className="flex items-start gap-3 sm:flex-col sm:gap-2.5"
                        data-status={s.state}
                      >
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                            s.state === "done"
                              ? "bg-[#12161F] text-[#F8F6F1]"
                              : s.state === "current"
                                ? "border-2 border-[#B8924F] text-[#77592A]"
                                : "border border-[#12161F]/15 text-[#5E6575]"
                          }`}
                        >
                          {s.state === "done" ? (
                            <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-[13.5px] font-medium leading-snug ${s.state === "future" ? "text-[#5E6575]" : ""}`}
                          >
                            {s.label}
                            {s.state === "current" && (
                              <span className="sr-only"> (current step)</span>
                            )}
                          </span>
                          {"note" in s && (
                            <span className={`mt-0.5 block text-[12.5px] font-medium ${GOLD_TEXT}`}>
                              {s.note}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </nav>
                <div className={`${warm} mt-4 px-5 py-4`}>
                  <p className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${GOLD_TEXT}`}>
                    Today’s move
                  </p>
                  <p className="mt-1.5 text-[15px] font-medium tracking-[-0.01em]">
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
                  <li className={`${card} p-4`}>
                    <p className={label}>Assumption</p>
                    <p className="mt-2 text-[14px] font-medium">
                      Owners will pay for the full version
                    </p>
                    <p className="mt-3 inline-flex rounded-full bg-[#C2643C]/12 px-2.5 py-0.5 text-[12px] font-semibold text-[#A4482A]">
                      Contradicted
                    </p>
                    <p className="mt-3 font-mono text-[11px] text-[#5E6575]">
                      Confidence 0.62 → 0.41
                    </p>
                  </li>
                  <li className={`${card} p-4`}>
                    <p className={label}>Evidence · Wk 2</p>
                    <blockquote className="mt-2 text-[1.15rem] font-medium leading-snug tracking-[-0.02em]">
                      “I wouldn’t pay for this version.”
                    </blockquote>
                    <p className={`mt-3 text-[12px] ${SECONDARY}`}>
                      Illustrative customer response
                    </p>
                  </li>
                  <li className={`${warm} p-4`}>
                    <p
                      className={`font-mono text-[10.5px] uppercase tracking-[0.22em] ${GOLD_TEXT}`}
                    >
                      Adaptation · Wk 3
                    </p>
                    <p className="mt-2 text-[14px] font-medium">
                      Path updated: test a lighter starter offer first.
                    </p>
                    <p className={`mt-3 font-mono text-[11px] ${GOLD_TEXT}`}>
                      Confidence 0.41 → 0.68
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
