import { useState } from "react";
import { TriangleAlert } from "lucide-react";

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
  onAdd,
  onAskSol,
}: {
  assumptions: AssumptionDTO[];
  onOpenAssumption: (id: string) => void;
  onAdd: () => void;
  onAskSol: (item: { summary: string }) => void;
}) {
  const { t, locale } = useLocale();
  const [shown, setShown] = useState(PAGE);

  const items: Item[] = assumptions
    .flatMap((a) => a.evidence.map((e) => ({ e, a })))
    .sort(
      (x, y) =>
        y.e.occurredOn.localeCompare(x.e.occurredOn) || y.e.createdAt.localeCompare(x.e.createdAt),
    );

  if (items.length === 0) {
    return (
      <section aria-labelledby="stream-h" data-testid="evidence-stream-empty">
        <h2 id="stream-h" className="sol-eyebrow mb-3">
          {t("pf.stream.title")}
        </h2>
        <EmptyState
          title={t("pf.stream.empty.title")}
          body={t("pf.stream.empty.body")}
          action={
            <Button size="lg" onClick={onAdd}>
              {t("pf.addEvidenceCta")}
            </Button>
          }
        />
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
        {items.slice(0, shown).map(({ e, a }) => {
          const against = e.signal === "contradicts";
          return (
            <li
              key={e.id}
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
                    <dt className="font-semibold text-sol-secondary">{t("pf.stream.mission")}:</dt>
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
                  <span className="text-[0.875rem] text-sol-secondary">
                    {t("pf.stream.contradictsNote")}
                  </span>
                </div>
              )}
            </li>
          );
        })}
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
