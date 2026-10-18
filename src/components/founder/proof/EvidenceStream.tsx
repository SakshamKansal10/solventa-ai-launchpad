import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Inbox, TriangleAlert } from "lucide-react";

import type { AssumptionDTO, EvidenceDTO } from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Button, EmptyState, Pill } from "../ui";
import { formatDate } from "./bits";

type Item = { e: EvidenceDTO; a: AssumptionDTO };

const PAGE = 8;

/** Every piece of evidence across every assumption, newest first — what it was,
 * when, what was said, which assumption it speaks to, which mission produced it
 * and which way it points. Evidence that contradicts an assumption is shown as
 * plainly as evidence that supports it. */
export function EvidenceStream({
  assumptions,
  onOpenAssumption,
  onAskSol,
  compact = false,
}: {
  assumptions: AssumptionDTO[];
  onOpenAssumption: (id: string) => void;
  onAskSol: (item: { summary: string }) => void;
  /** Slim sidebar card: the latest few items as a timeline. */
  compact?: boolean;
}) {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(PAGE);

  const items: Item[] = assumptions
    .flatMap((a) => a.evidence.map((e) => ({ e, a })))
    .sort(
      (x, y) =>
        y.e.occurredOn.localeCompare(x.e.occurredOn) || y.e.createdAt.localeCompare(x.e.createdAt),
    );

  if (compact) {
    return (
      <section
        aria-labelledby="stream-h"
        className="flex flex-col gap-4 rounded-[1.25rem] border border-sol-border bg-sol-surface p-5"
        data-testid={items.length === 0 ? "evidence-stream-empty" : "evidence-stream"}
      >
        <h2 id="stream-h" className="sol-h-sm flex items-center gap-3 text-sol-ink">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sol-violet-soft text-sol-violet-deep">
            <Inbox className="size-[18px]" aria-hidden="true" />
          </span>
          {t("pf.stream.title")}
        </h2>
        {items.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[0.9375rem] text-sol-secondary">{t("pf.stream.empty.body")}</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-4 border-l border-sol-border pl-4">
            {items.slice(0, 3).map(({ e, a }) => {
              const against = e.signal === "contradicts";
              return (
                <li
                  key={e.id}
                  data-testid="stream-item"
                  data-signal={e.signal}
                  className="relative"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-[1.3125rem] top-1.5 size-2.5 rounded-full",
                      against ? "bg-sol-warning" : "bg-sol-violet",
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="neutral">{t(`pf.type.${e.type}` as const)}</Pill>
                    <span className="text-[0.875rem] text-sol-secondary">
                      {formatDate(e.occurredOn, locale)}
                    </span>
                    {against && <Pill tone="warning">{t("pf.stream.contradicts")}</Pill>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenAssumption(a.id)}
                    className={cn(
                      "mt-2 block w-full rounded-xl px-3 py-2 text-left text-[0.9375rem] leading-snug text-sol-ink",
                      against ? "bg-sol-warning-soft/60" : "bg-sol-violet-soft/60",
                    )}
                  >
                    {e.title ?? e.summary}
                  </button>
                  {e.sourcePerson && (
                    <p className="mt-1.5 text-[0.875rem] text-sol-secondary">{e.sourcePerson}</p>
                  )}
                  {against && (
                    <Button
                      size="sm"
                      variant="soft"
                      className="mt-2"
                      onClick={() => onAskSol({ summary: e.summary })}
                      data-testid="stream-ask-sol"
                    >
                      {t("pf.stream.askSol")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section aria-labelledby="stream-h" data-testid="evidence-stream-empty">
        <h2 id="stream-h" className="sol-eyebrow mb-3">
          {t("pf.stream.title")}
        </h2>
        <EmptyState title={t("pf.stream.empty.title")} body={t("pf.stream.empty.body")} />
      </section>
    );
  }

  return (
    <section
      aria-labelledby="stream-h"
      className="flex flex-col gap-4"
      data-testid="evidence-stream"
    >
      <h2 id="stream-h" className="sol-eyebrow">
        {t("pf.stream.title")}
      </h2>
      <ol className="flex flex-col gap-3">
        {/* New evidence slides in at the top and the rest move down to make room;
            nothing animates on first load. */}
        <AnimatePresence initial={false}>
          {items.slice(0, shown).map(({ e, a }) => {
            const against = e.signal === "contradicts";
            return (
              <motion.li
                key={e.id}
                layout={reduceMotion ? false : "position"}
                initial={reduceMotion ? false : { opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                data-testid="stream-item"
                data-signal={e.signal}
                className={cn(
                  "rounded-2xl border p-5",
                  against
                    ? "border-sol-warning/50 bg-sol-warning-soft/60"
                    : "border-sol-border bg-sol-surface",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Pill tone="neutral">{t(`pf.type.${e.type}` as const)}</Pill>
                  <span className="text-[0.9375rem] font-semibold text-sol-secondary">
                    {formatDate(e.occurredOn, locale)}
                  </span>
                  <Pill
                    tone={against ? "warning" : e.signal === "supports" ? "champagne" : "neutral"}
                  >
                    {against && <TriangleAlert className="size-3.5" aria-hidden="true" />}
                    {t(`pf.stream.${e.signal}` as const)}
                  </Pill>
                </div>
                {e.title && (
                  <p className="mt-3 text-[1.0625rem] font-semibold leading-snug text-sol-ink">
                    {e.title}
                  </p>
                )}
                <p
                  className={cn(
                    "text-[1.0625rem] leading-relaxed text-sol-ink",
                    e.title ? "mt-1" : "mt-3",
                  )}
                >
                  “{e.summary}”
                </p>
                {e.sourcePerson && (
                  <p className="mt-1 text-[0.9375rem] text-sol-secondary">— {e.sourcePerson}</p>
                )}
                <dl className="mt-3 flex flex-col gap-1.5 text-[0.9375rem]">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-sol-secondary">
                      {t(against ? "pf.stream.contradicts" : "pf.stream.supports")}:
                    </dt>
                    <dd>
                      <button
                        type="button"
                        onClick={() => onOpenAssumption(a.id)}
                        className="text-left font-semibold text-sol-violet-deep underline-offset-4 hover:underline"
                      >
                        {a.title}
                      </button>
                    </dd>
                  </div>
                  {e.taskTitle && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-semibold text-sol-secondary">
                        {t("pf.stream.mission")}:
                      </dt>
                      <dd className="text-sol-ink">{e.taskTitle}</dd>
                    </div>
                  )}
                </dl>
                {against && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => onAskSol({ summary: e.summary })}
                      data-testid="stream-ask-sol"
                    >
                      {t("pf.stream.askSol")}
                    </Button>
                  </div>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      {items.length > shown && (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => setShown((n) => n + PAGE)}
        >
          {t("pf.showMore")}
        </Button>
      )}
    </section>
  );
}
