import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addProofEvidence,
  EVIDENCE_TYPES,
  updateProofEvidence,
  type AssumptionDTO,
  type EvidenceDTO,
} from "@/lib/actions/proof";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useCurrentUserQuery, useInvalidateFounder } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Button } from "../ui";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
];
const NEEDS_PERSON = new Set(["interview", "quote", "payment"]);

interface Draft {
  assumptionId: string;
  type: (typeof EVIDENCE_TYPES)[number];
  person: string;
  date: string;
  summary: string;
  signal: "supports" | "neutral" | "contradicts";
  url: string;
}

const today = () => new Date().toISOString().slice(0, 10);

function draftKey(opportunityId: string) {
  return `solventia-evidence-draft-${opportunityId}`;
}

/** Add (or edit) one piece of evidence. Preselects the assumption — and, when
 * launched from a mission, records the mission and week too. An unsaved draft
 * survives a failed save (and a closed dialog) in sessionStorage, so a
 * network blip never costs a founder what they just typed. */
export function EvidenceDialog({
  open,
  onOpenChange,
  opportunityId,
  assumptions,
  presetAssumptionId,
  taskId,
  weekId,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  assumptions: AssumptionDTO[];
  presetAssumptionId?: string | null;
  taskId?: string | null;
  weekId?: string | null;
  editing?: EvidenceDTO | null;
}) {
  const { t } = useLocale();
  const invalidate = useInvalidateFounder();
  const user = useCurrentUserQuery();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const initial: Draft = useMemo(() => {
    if (editing) {
      return {
        assumptionId: editing.assumptionId ?? assumptions[0]?.id ?? "",
        type: editing.type,
        person: editing.sourcePerson ?? "",
        date: editing.occurredOn,
        summary: editing.summary,
        signal: editing.signal,
        url: editing.url ?? "",
      };
    }
    let saved: Draft | null = null;
    try {
      const raw = window.sessionStorage.getItem(draftKey(opportunityId));
      if (raw) saved = JSON.parse(raw) as Draft;
    } catch {
      saved = null;
    }
    const preset = presetAssumptionId ?? assumptions[0]?.id ?? "";
    return {
      assumptionId: presetAssumptionId ?? saved?.assumptionId ?? preset,
      type: saved?.type ?? "interview",
      person: saved?.person ?? "",
      date: saved?.date ?? today(),
      summary: saved?.summary ?? "",
      signal: saved?.signal ?? "supports",
      url: saved?.url ?? "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, presetAssumptionId, opportunityId, open]);

  const [draft, setDraft] = useState<Draft>(initial);
  useEffect(() => {
    if (open) {
      setDraft(initial);
      setFile(null);
      setFileError(null);
    }
  }, [open, initial]);

  // Keep the unsaved draft while the dialog is open (new evidence only).
  useEffect(() => {
    if (!open || editing) return;
    try {
      window.sessionStorage.setItem(draftKey(opportunityId), JSON.stringify(draft));
    } catch {
      // Storage unavailable — the in-memory draft still survives a failed save.
    }
  }, [draft, open, editing, opportunityId]);

  const save = useMutation({
    mutationFn: async () => {
      let filePath: string | undefined;
      let fileName: string | undefined;
      if (file && !editing) {
        const userId = user.data?.id;
        if (!userId) throw new Error("UNAUTHENTICATED");
        const safe = file.name.replace(/[^\w.-]+/g, "_").slice(0, 120);
        filePath = `${userId}/${crypto.randomUUID()}/${safe}`;
        fileName = file.name.slice(0, 200);
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.storage.from("proof-files").upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error(`UPLOAD_FAILED:${error.message}`);
      }
      if (editing) {
        await updateProofEvidence({
          data: {
            id: editing.id,
            assumptionId: draft.assumptionId,
            evidenceType: draft.type,
            sourcePerson: draft.person || null,
            occurredOn: draft.date,
            summary: draft.summary,
            signal: draft.signal,
            url: draft.url.trim() || null,
          },
        });
        return null;
      }
      return addProofEvidence({
        data: {
          opportunityId,
          assumptionId: draft.assumptionId,
          evidenceType: draft.type,
          sourcePerson: draft.person || undefined,
          occurredOn: draft.date,
          summary: draft.summary,
          signal: draft.signal,
          url: draft.url.trim() || undefined,
          filePath,
          fileName,
          taskId: taskId ?? undefined,
          weekId: weekId ?? undefined,
        },
      });
    },
    onSuccess: async (result) => {
      try {
        window.sessionStorage.removeItem(draftKey(opportunityId));
      } catch {
        // ignore
      }
      await invalidate();
      if (result && result.before !== result.after) {
        toast.success(
          t("pf.saved.changed", {
            from: t(`pf.state.${result.before}` as const),
            to: t(`pf.state.${result.after}` as const),
          }),
        );
      } else {
        toast.success(t("pf.saved"));
      }
      onOpenChange(false);
    },
    onError: (err) => {
      console.error("[proof] saving evidence failed:", err);
      toast.error(t("pf.saveError"));
    },
  });

  const valid =
    draft.assumptionId &&
    draft.summary.trim().length > 0 &&
    draft.summary.length <= 2000 &&
    (!draft.url.trim() || /^https?:\/\//i.test(draft.url.trim()));

  function pickFile(f: File | null) {
    setFileError(null);
    if (!f) return setFile(null);
    if (!ALLOWED_FILE_TYPES.includes(f.type)) return setFileError(t("pf.file.type"));
    if (f.size > MAX_FILE_BYTES) return setFileError(t("pf.file.size"));
    setFile(f);
  }

  const field = "flex flex-col gap-1.5";
  const label = "text-[0.9375rem] font-semibold text-sol-ink";
  const input =
    "min-h-12 w-full rounded-2xl border border-sol-border bg-sol-surface px-4 text-[1rem] text-sol-ink focus-visible:border-sol-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="evidence-dialog"
        className="max-h-[92dvh] overflow-y-auto rounded-3xl border-sol-border bg-sol-surface p-6 sm:max-w-[560px] sm:p-8"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-[1.75rem] font-semibold text-sol-ink">
            {editing ? t("pf.dialog.editTitle") : t("pf.dialog.title")}
          </DialogTitle>
          <DialogDescription className="text-[1rem] text-sol-secondary">
            {t("pf.dialog.body")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-2 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !save.isPending) save.mutate();
          }}
        >
          <div className={field}>
            <label htmlFor="ev-assumption" className={label}>
              {t("pf.dialog.assumption")}
            </label>
            <select
              id="ev-assumption"
              data-testid="ev-assumption"
              className={input}
              value={draft.assumptionId}
              onChange={(e) => setDraft({ ...draft, assumptionId: e.target.value })}
            >
              {assumptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className={field}>
              <label htmlFor="ev-type" className={label}>
                {t("pf.dialog.type")}
              </label>
              <select
                id="ev-type"
                data-testid="ev-type"
                className={input}
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })}
              >
                {EVIDENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`pf.type.${type}` as const)}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="ev-date" className={label}>
                {t("common.date")}
              </label>
              <input
                id="ev-date"
                type="date"
                max={today()}
                className={input}
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
          </div>

          <div className={field}>
            <label htmlFor="ev-person" className={label}>
              {t("pf.dialog.person")}{" "}
              {!NEEDS_PERSON.has(draft.type) && (
                <span className="font-medium text-sol-secondary">({t("common.optional")})</span>
              )}
            </label>
            <input
              id="ev-person"
              data-testid="ev-person"
              className={input}
              maxLength={120}
              placeholder={t("pf.dialog.personPlaceholder")}
              value={draft.person}
              onChange={(e) => setDraft({ ...draft, person: e.target.value })}
            />
          </div>

          <div className={field}>
            <label htmlFor="ev-summary" className={label}>
              {t("pf.dialog.what")}
            </label>
            <textarea
              id="ev-summary"
              data-testid="ev-summary"
              rows={4}
              maxLength={2000}
              className={cn(input, "py-3")}
              placeholder={t("pf.dialog.whatPlaceholder")}
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            />
          </div>

          <fieldset className={field}>
            <legend className={label}>{t("pf.dialog.signal")}</legend>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
              {(["supports", "neutral", "contradicts"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={draft.signal === s}
                  data-testid={`ev-signal-${s}`}
                  onClick={() => setDraft({ ...draft, signal: s })}
                  className={cn(
                    "min-h-12 rounded-2xl border px-3 text-[1rem] font-semibold transition-colors",
                    draft.signal === s
                      ? s === "contradicts"
                        ? "border-sol-warning bg-sol-warning-soft text-sol-warning"
                        : "border-sol-violet bg-sol-violet-soft text-sol-violet-deep"
                      : "border-sol-border bg-sol-surface text-sol-ink hover:border-sol-violet/45",
                  )}
                >
                  {t(`pf.signal.${s}` as const)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className={field}>
            <label htmlFor="ev-url" className={label}>
              {t("pf.dialog.url")}{" "}
              <span className="font-medium text-sol-secondary">({t("common.optional")})</span>
            </label>
            <input
              id="ev-url"
              type="url"
              inputMode="url"
              className={input}
              placeholder="https://"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          </div>

          {!editing && (
            <div className={field}>
              <span className={label}>
                {t("pf.dialog.file")}{" "}
                <span className="font-medium text-sol-secondary">({t("common.optional")})</span>
              </span>
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(",")}
                className="sr-only"
                id="ev-file"
                data-testid="ev-file"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip className="size-4" aria-hidden="true" />
                  {t("pf.dialog.chooseFile")}
                </Button>
                {file && (
                  <span className="inline-flex items-center gap-2 text-[0.9375rem] text-sol-ink">
                    {file.name}
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      aria-label={t("common.remove")}
                      className="rounded-full p-1 text-sol-secondary hover:bg-sol-ivory"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                )}
              </div>
              <p className="text-[0.875rem] text-sol-secondary">{t("pf.file.hint")}</p>
              {fileError && (
                <p role="alert" className="text-[0.9375rem] text-sol-warning">
                  {fileError}
                </p>
              )}
            </div>
          )}

          {save.isError && (
            <p
              role="alert"
              className="rounded-2xl bg-sol-warning-soft px-4 py-3 text-[1rem] text-sol-ink"
            >
              {t("pf.saveError")}
            </p>
          )}

          <div className="mt-1 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!valid} data-testid="ev-save">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
