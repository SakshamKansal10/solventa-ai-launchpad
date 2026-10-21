import {
  ArrowRight,
  Check,
  Clock3,
  Compass,
  FlaskConical,
  History,
  Map as MapIcon,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { BrandLockup } from "@/components/brand/Brand";

import { soundController } from "../sound/controller";

/**
 * ILLUSTRATIVE, READ-ONLY preview of the Solventia workspace — the cinematic world, become the
 * product. It is drawn in the Founder OS's own language (the Command Center: its sidebar, the
 * display heading, the navy summary, the Today's-move card) so the film hands over to the real
 * thing. "Your next move" is the strongest element on the surface. Sample content for the
 * demonstration founder; real, semantic, keyboard-operable HTML that reads and writes no account
 * data, every value labelled as illustrative.
 *
 * Framed by a hairline, never a heavy shadow or glass. Ink on pearl; champagne for conviction
 * (the next move, the current stage); violet only for the active section.
 */
const NAV: { label: string; icon: LucideIcon; active?: boolean }[] = [
  { label: "Command Center", icon: Compass, active: true },
  { label: "Opportunities", icon: Target },
  { label: "Roadmap", icon: MapIcon },
  { label: "Proof", icon: FlaskConical },
  { label: "History", icon: History },
  { label: "Settings", icon: Settings },
];

/** The execution path of the sample roadmap (the product's seven phases), and where we are. */
const PATH = ["Direction", "Problem", "Payment", "Offer", "Delivery", "Repeatability", "Growth"];
const PATH_AT = 2;

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

const INK = "text-[#15181F]";
const SECONDARY = "text-[#555C68]";
const GOLD_TEXT = "text-[#7A5B2B]";
const label = "text-[12px] font-semibold uppercase tracking-[0.16em] text-[#666C77]";
const card = "rounded-2xl border border-[#15181F]/[0.08] bg-white/70";
const DISPLAY = "font-display font-semibold tracking-[-0.01em]";

/** Confidence through the evidence loop: a dip when reality disagreed, a recovery after adapting. */
function ConfidenceTrace() {
  const W = 92;
  const H = 26;
  const pts = CONFIDENCE.map((c, i) => [
    4 + (i * (W - 8)) / (CONFIDENCE.length - 1),
    H - 4 - ((c.value - 0.3) / 0.45) * (H - 8),
  ]);
  const last = CONFIDENCE[CONFIDENCE.length - 1];
  return (
    <figure
      className="flex items-end gap-3"
      aria-label={`Illustrative direction confidence: ${CONFIDENCE.map((c) => `${c.value.toFixed(2)} ${c.at.toLowerCase()}`).join(", ")}`}
    >
      <span
        aria-hidden="true"
        className="text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#E4CB98]"
      >
        {last.value.toFixed(2)}
      </span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <polyline
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="rgba(241,238,230,0.35)"
          strokeWidth="1.25"
        />
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === pts.length - 1 ? 3 : 2.2}
            fill={i === 1 ? "#D9825E" : i === pts.length - 1 ? "#E4CB98" : "#8C93A1"}
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
      className={`flex h-full w-full overflow-hidden rounded-[18px] bg-[#F8F6F1] ${INK} shadow-[0_0_0_1px_rgba(21,24,31,0.12)]`}
    >
      {/* The Command Center's sidebar (illustrative: these are not links). */}
      <aside
        aria-label="Workspace sections"
        className="hidden w-[196px] shrink-0 flex-col border-r border-[#15181F]/[0.08] bg-[#F2EFE8] px-3.5 py-5 lg:flex"
      >
        <div className="px-2">
          <BrandLockup preset="compact" signature={false} />
        </div>
        <ul className="mt-7 flex flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <li
                key={n.label}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] ${
                  n.active ? "bg-[#6A5CE0]/[0.09] font-medium text-[#4C3FC2]" : SECONDARY
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {n.label}
                {n.active && <span className="sr-only"> (current section)</span>}
              </li>
            );
          })}
        </ul>
        <div className="mt-auto flex items-center gap-2.5 border-t border-[#15181F]/[0.08] px-1.5 pt-4">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-[#15181F] text-[12px] font-semibold text-[#F8F6F1]"
          >
            SF
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[13px] font-medium">Sample founder</span>
            <span className={`block text-[12px] ${SECONDARY}`}>Validate · week 3</span>
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#15181F]/[0.08] px-5 py-3 sm:px-7">
          <p className="text-[14px] font-medium">Command Center</p>
          <p
            className={`rounded-full border border-[#15181F]/10 px-3 py-1 text-[12px] font-medium ${SECONDARY}`}
          >
            Illustrative preview · sample founder
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-auto px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[13.5px] ${SECONDARY}`}>Good morning.</p>
              <h3 className={`mt-0.5 text-[1.75rem] leading-[1.1] sm:text-[2.05rem] ${DISPLAY}`}>
                Your next move is clear.
              </h3>
            </div>
            <div
              role="tablist"
              aria-label="Workspace views"
              className="inline-flex gap-1 rounded-full bg-[#15181F]/[0.05] p-1"
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
                  className={`rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A5CE0] ${
                    tab === tb.id
                      ? `bg-white ${INK} shadow-[0_0_0_1px_rgba(21,24,31,0.08)]`
                      : `${SECONDARY} hover:text-[#15181F]`
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "direction" && (
            <div
              role="tabpanel"
              id={`${base}-panel-direction`}
              aria-labelledby={`${base}-tab-direction`}
              className="mt-4 flex flex-1 flex-col gap-3.5 sm:mt-5"
            >
              {/* The move that matters now — the strongest thing on the surface. */}
              <div className="rounded-2xl border border-[#C9AA79]/50 border-l-[3px] border-l-[#B8924F] bg-[#FBF8F2] px-5 py-4 sm:px-6 sm:py-5">
                <p className={`text-[12px] font-semibold uppercase tracking-[0.2em] ${GOLD_TEXT}`}>
                  Your next move
                </p>
                <p className={`mt-1.5 text-[1.45rem] leading-[1.12] sm:text-[1.9rem] ${DISPLAY}`}>
                  Test willingness to pay with a lighter starter offer.
                </p>
                <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full border border-[#15181F]/10 px-2.5 py-1 text-[12px] font-medium">
                    Validate · Week 3
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-[#15181F]/10 px-2.5 py-1 text-[12px] ${SECONDARY}`}
                  >
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    ~2 hrs
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-[#0B1F3B] px-4 text-[13px] font-semibold text-white max-sm:hidden"
                  >
                    Start mission
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </div>

              {/* The Command Center's navy summary: the direction, the week, the confidence, the path. */}
              <div className="rounded-2xl bg-[#0B1424] px-5 py-4 text-[#F1EEE6] sm:px-6">
                <div className="grid gap-4 sm:grid-cols-[1.4fr_0.7fr_auto] sm:items-end">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9AA3B3]">
                      Active direction
                    </p>
                    <p className="mt-1 text-[14.5px] font-semibold leading-snug">
                      A digital service for local businesses
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9AA3B3]">
                      Current week
                    </p>
                    <p className="mt-1 text-[14.5px] font-semibold">Week 03</p>
                  </div>
                  <div className="max-sm:hidden">
                    <ConfidenceTrace />
                  </div>
                </div>
                <ol
                  className="mt-4 hidden grid-cols-7 gap-1 border-t border-white/10 pt-3.5 md:grid"
                  aria-label="Execution path"
                >
                  {PATH.map((step, i) => (
                    <li key={step} className="flex flex-col items-center gap-1.5 text-center">
                      <span
                        aria-hidden="true"
                        className={`flex size-6 items-center justify-center rounded-full text-[12px] font-semibold ${
                          i < PATH_AT
                            ? "bg-[#C9AA79] text-[#0B1424]"
                            : i === PATH_AT
                              ? "bg-[#6A5CE0] text-white"
                              : "border border-white/25 text-[#9AA3B3]"
                        }`}
                      >
                        {i < PATH_AT ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                      </span>
                      <span
                        className={`text-[12px] ${i === PATH_AT ? "font-semibold text-white" : "text-[#9AA3B3]"}`}
                      >
                        {step}
                        {i === PATH_AT && <span className="sr-only"> (you are here)</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          {tab === "week" && (
            <div
              role="tabpanel"
              id={`${base}-panel-week`}
              aria-labelledby={`${base}-tab-week`}
              className="mt-4 sm:mt-5"
            >
              <p className={label}>Validate · this week</p>
              <nav aria-label="Validation path" className={`${card} mt-3 px-5 py-5`}>
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
                            ? "bg-[#15181F] text-[#F8F6F1]"
                            : s.state === "current"
                              ? "border-2 border-[#B8924F] text-[#7A5B2B]"
                              : "border border-[#15181F]/15 text-[#666C77]"
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
                          className={`block text-[13.5px] font-medium leading-snug ${s.state === "future" ? "text-[#666C77]" : ""}`}
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
              <div className="mt-3 rounded-2xl border border-[#C9AA79]/50 border-l-[3px] border-l-[#B8924F] bg-[#FBF8F2] px-5 py-4">
                <p className={`text-[12px] font-semibold uppercase tracking-[0.2em] ${GOLD_TEXT}`}>
                  Today’s move
                </p>
                <p className={`mt-1 text-[1.3rem] leading-snug ${DISPLAY}`}>
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
              className="mt-4 sm:mt-5"
            >
              <p className={label}>Assumption → evidence → adaptation</p>
              <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                <li className={`${card} p-4`}>
                  <p className={label}>Assumption</p>
                  <p className="mt-2 text-[14px] font-medium">
                    Owners will pay for the full version
                  </p>
                  <p className="mt-3 inline-flex rounded-full bg-[#C2643C]/12 px-2.5 py-0.5 text-[12px] font-semibold text-[#A4482A]">
                    Contradicted
                  </p>
                  <p className="mt-3 text-[12px] tabular-nums text-[#666C77]">
                    Confidence 0.62 → 0.41
                  </p>
                </li>
                <li className={`${card} p-4`}>
                  <p className={label}>Evidence · Wk 2</p>
                  <blockquote className={`mt-2 text-[1.25rem] leading-snug ${DISPLAY}`}>
                    “I wouldn’t pay for this version.”
                  </blockquote>
                  <p className={`mt-3 text-[12px] ${SECONDARY}`}>Illustrative customer response</p>
                </li>
                <li className="rounded-2xl border border-[#C9AA79]/50 bg-[#FBF8F2] p-4">
                  <p
                    className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${GOLD_TEXT}`}
                  >
                    Adaptation · Wk 3
                  </p>
                  <p className="mt-2 text-[14px] font-medium">
                    Path updated: test a lighter starter offer first.
                  </p>
                  <p className={`mt-3 text-[12px] tabular-nums ${GOLD_TEXT}`}>
                    Confidence 0.41 → 0.68
                  </p>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
