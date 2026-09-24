import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  deleteProofEvidence,
  getProofFileUrl,
  type AssumptionDTO,
  type EvidenceDTO,
} from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useInvalidateFounder } from "@/lib/queries";
import { Button } from "../ui";
import { formatDate, SignalBadge, StateBadge, useReasonText } from "./bits";

/** The full record for ONE assumption: the state and why, the evidence
 * timeline, how the state changed over time, and the next recommended test.
 * Nothing here is generated — every line is something the founder recorded or a
 * deterministic reading of it. */
export function AssumptionSheet({
  assumption,
  onOpenChange,
  onAddEvidence,
  onEditEvidence,
}: {
  assumption: AssumptionDTO | null;
  onOpenChange: (open: boolean) => void;
  onAddEvidence: (assumptionId: string) => void;
  onEditEvidence: (evidence: EvidenceDTO) => void;
}) {
  const { t, locale } = useLocale();
  const invalidate = useInvalidateFounder();
  const reason = useReasonText();
  const [toDelete, setToDelete] = useState<EvidenceDTO | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => deleteProofEvidence({ data: { id } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("pf.deleted"));
      setToDelete(null);
    },
    onError: (err) => {
      console.error("[proof] delete failed:", err);
      toast.error(t("pf.deleteError"));
    },
  });

  async function openFile(id: string) {
    try {
      const { url } = await getProofFileUrl({ data: { evidenceId: id } });
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error(t("pf.file.unavailable"));
    } catch (err) {
      console.error("[proof] file link failed:", err);
      toast.error(t("pf.file.unavailable"));
    }
  }

  const a = assumption;
  const typeLabel = (type: string) => t(`pf.type.${type}` as never);

  return (
    <>
      <Sheet open={Boolean(a)} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          data-testid="assumption-sheet"
          className="w-full overflow-y-auto border-sol-border bg-sol-surface p-6 sm:max-w-[560px] sm:p-8"
        >
          {a && (
            <>
              <SheetTitle className="pr-8 font-display text-[1.625rem] font-semibold leading-snug text-sol-ink">
                {a.title}
              </SheetTitle>
              <SheetDescription className="sr-only">{t("pf.detail.aria")}</SheetDescription>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <StateBadge state={a.state} />
                <span className="text-[0.9375rem] text-sol-secondary">
                  {t(`pf.category.${a.category}` as const)} ·{" "}
                  {t("pf.evidenceCount", { n: a.evidence.length })}
                </span>
              </div>

              <section className="mt-6" aria-labelledby="why-state">
                <h3 id="why-state" className="sol-eyebrow">
                  {t("pf.detail.whyState")}
                </h3>
                <p
                  className="mt-2 text-[1.0625rem] leading-relaxed text-sol-ink"
                  data-testid="state-reason"
                >
                  {reason(a.reason)}
                </p>
              </section>

              {a.whyItMatters && (
                <section className="mt-6" aria-labelledby="why-matters">
                  <h3 id="why-matters" className="sol-eyebrow">
                    {t("pf.detail.whyMatters")}
                  </h3>
                  <p className="mt-2 text-[1.0625rem] leading-relaxed text-sol-ink">
                    {a.whyItMatters}
                  </p>
                </section>
              )}

              <section className="mt-6" aria-labelledby="timeline">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="timeline" className="sol-eyebrow">
                    {t("pf.detail.timeline")}
                  </h3>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onAddEvidence(a.id)}
                    data-testid="sheet-add-evidence"
                  >
                    {t("pf.addEvidence")}
                  </Button>
                </div>
                {a.evidence.length === 0 ? (
                  <p className="mt-3 text-[1.0625rem] text-sol-secondary">
                    {t("pf.detail.noEvidence")}
                  </p>
                ) : (
                  <ol className="mt-4 flex flex-col gap-3">
                    {a.evidence.map((e) => (
                      <li
                        key={e.id}
                        className="rounded-2xl border border-sol-border bg-sol-ivory-light p-4"
                        data-testid="evidence-item"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <SignalBadge signal={e.signal} />
                            <span className="text-[0.9375rem] font-semibold text-sol-ink">
                              {typeLabel(e.type)}
                            </span>
                          </div>
                          <span className="text-[0.875rem] text-sol-secondary">
                            {formatDate(e.occurredOn, locale)}
                          </span>
                        </div>
                        {e.sourcePerson && (
                          <p className="mt-1.5 text-[0.9375rem] text-sol-secondary">
                            {e.sourcePerson}
                          </p>
                        )}
                        <p className="mt-2 whitespace-pre-line text-[1rem] leading-relaxed text-sol-ink">
                          {e.summary}
                        </p>
                        {e.taskTitle && (
                          <p className="mt-2 text-[0.875rem] text-sol-secondary">
                            {t("pf.fromMission", { title: e.taskTitle })}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {e.url && (
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-sol-violet-deep hover:underline"
                            >
                              {t("pf.link")}
                              <ExternalLink className="size-3.5" aria-hidden="true" />
                            </a>
                          )}
                          {e.hasFile && (
                            <button
                              type="button"
                              onClick={() => void openFile(e.id)}
                              className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-sol-violet-deep hover:underline"
                            >
                              <FileText className="size-3.5" aria-hidden="true" />
                              {e.fileName ?? t("pf.file.open")}
                            </button>
                          )}
                          <span className="ml-auto flex gap-1">
                            <button
                              type="button"
                              onClick={() => onEditEvidence(e)}
                              aria-label={t("common.edit")}
                              className="flex size-9 items-center justify-center rounded-full text-sol-secondary hover:bg-sol-ivory hover:text-sol-ink"
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setToDelete(e)}
                              aria-label={t("common.delete")}
                              data-testid="evidence-delete"
                              className="flex size-9 items-center justify-center rounded-full text-sol-secondary hover:bg-sol-warning-soft hover:text-sol-warning"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {a.history.length > 0 && (
                <section className="mt-6" aria-labelledby="history-h">
                  <h3 id="history-h" className="sol-eyebrow">
                    {t("pf.detail.history")}
                  </h3>
                  <ol className="mt-3 flex flex-col gap-2.5" data-testid="state-history">
                    {a.history.map((h) => (
                      <li key={h.evidenceId} className="text-[1rem] leading-snug text-sol-ink">
                        <span className="font-semibold">
                          {t(`pf.state.${h.from}` as const)} → {t(`pf.state.${h.to}` as const)}
                        </span>{" "}
                        <span className="text-sol-secondary">
                          · {formatDate(h.at, locale)} · {reason(h.reason)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {a.nextTest && (
                <section
                  className="mt-6 rounded-2xl bg-sol-violet-soft p-5"
                  aria-labelledby="next-test"
                >
                  <h3 id="next-test" className="sol-eyebrow text-sol-violet-deep">
                    {t("pf.detail.nextTest")}
                  </h3>
                  <p className="mt-2 text-[1.0625rem] leading-relaxed text-sol-ink">{a.nextTest}</p>
                </section>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pf.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("pf.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) remove.mutate(toDelete.id);
              }}
              disabled={remove.isPending}
              data-testid="confirm-delete-evidence"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
