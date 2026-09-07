import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Quote, Trash2 } from "lucide-react";
import {
  addEvidence,
  deleteEvidence,
  getEvidence,
  EVIDENCE_CATEGORIES,
  EVIDENCE_CATEGORY_LABELS,
  type EvidenceEntry,
} from "@/lib/actions/evidence";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ENTRY_TYPES = [
  { value: "interview" as const, label: "Interview" },
  { value: "note" as const, label: "Note" },
  { value: "observation" as const, label: "Observation" },
];

const PAIN_OPTIONS = [
  { value: "low" as const, label: "Low" },
  { value: "medium" as const, label: "Medium" },
  { value: "high" as const, label: "High" },
];

const WTP_OPTIONS = [
  { value: "no" as const, label: "No" },
  { value: "maybe" as const, label: "Maybe" },
  { value: "yes" as const, label: "Yes" },
];

function EvidenceCard({ entry, onDelete }: { entry: EvidenceEntry; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-gold/30 bg-gold/[0.08] px-2.5 py-0.5 text-[0.7rem] font-semibold text-dashboard-heading">
            {EVIDENCE_CATEGORY_LABELS[entry.category]}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[0.7rem] font-medium text-dashboard-muted">
            {entry.entryType}
          </span>
          {entry.willingnessToPay === "yes" && (
            <span className="rounded-full bg-econ-green-soft px-2.5 py-0.5 text-[0.7rem] font-semibold text-econ-green-deep">
              Would pay
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete evidence"
          className="text-dashboard-muted transition-colors hover:text-destructive"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2.5 text-[0.85rem] leading-relaxed text-dashboard-body">{entry.content}</p>
      {entry.keyQuote && (
        <p className="mt-2 flex items-start gap-1.5 text-[0.8rem] italic leading-relaxed text-dashboard-muted">
          <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />“{entry.keyQuote}”
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-dashboard-muted">
        {entry.customerType && <span>{entry.customerType}</span>}
        {entry.painSeverity && <span>Pain: {entry.painSeverity}</span>}
        {entry.existingWorkaround && <span>Workaround: {entry.existingWorkaround}</span>}
      </div>
    </div>
  );
}

/** The Evidence Vault — structured, founder-submitted real-world signal
 * per opportunity, organized by category. Every count shown is real
 * (never AI-invented); no "validated" claim is ever made here — this
 * page only ever shows what was actually logged. */
export function EvidenceVault({ opportunityId }: { opportunityId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["evidence", opportunityId],
    queryFn: () => getEvidence({ data: { opportunityId } }),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState<(typeof EVIDENCE_CATEGORIES)[number]>("problem");
  const [entryType, setEntryType] = useState<"interview" | "note" | "observation">("note");
  const [content, setContent] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [keyQuote, setKeyQuote] = useState("");
  const [painSeverity, setPainSeverity] = useState<"low" | "medium" | "high" | undefined>();
  const [willingnessToPay, setWillingnessToPay] = useState<"no" | "maybe" | "yes" | undefined>();

  const addMutation = useMutation({
    mutationFn: () =>
      addEvidence({
        data: {
          opportunityId,
          category,
          entryType,
          content: content.trim(),
          customerType: customerType.trim() || undefined,
          keyQuote: keyQuote.trim() || undefined,
          painSeverity: entryType === "interview" ? painSeverity : undefined,
          willingnessToPay: entryType === "interview" ? willingnessToPay : undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence", opportunityId] });
      setFormOpen(false);
      setContent("");
      setCustomerType("");
      setKeyQuote("");
      setPainSeverity(undefined);
      setWillingnessToPay(undefined);
    },
    onError: (err) => {
      console.error("[evidence] add failed:", err);
      toast.error("Couldn't save that — try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvidence({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evidence", opportunityId] }),
    onError: (err) => {
      console.error("[evidence] delete failed:", err);
      toast.error("Couldn't remove that — try again.");
    },
  });

  const entries = query.data?.entries ?? [];
  const summary = query.data?.summary;

  return (
    <section id="evidence" className="scroll-mt-24 mt-8 border-t border-border/60 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-econ-green-active">Evidence Vault</p>
          <p className="mt-1 text-[0.85rem] text-muted-foreground">
            Real-world signal you've actually collected — interviews, observations, pricing
            reactions. Never AI-generated.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setFormOpen((v) => !v)}>
          <Plus className="size-4" aria-hidden="true" />
          Add Evidence
        </Button>
      </div>

      {summary && summary.total > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-3">
          {[
            { label: "Entries", value: summary.total },
            { label: "Interviews", value: summary.interviews },
            { label: "Paying signals", value: summary.payingSignals },
          ].map((cell) => (
            <div key={cell.label} className="bg-card px-4 py-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {cell.label}
              </p>
              <p className="mt-0.5 font-display text-[1.15rem] font-semibold text-primary">
                {cell.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="flex flex-wrap gap-1.5">
            {EVIDENCE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[0.78rem] font-medium",
                  category === c
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {EVIDENCE_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {ENTRY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setEntryType(t.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[0.78rem] font-medium",
                  entryType === t.value
                    ? "border-econ-green-active bg-econ-green-soft text-econ-green-deep"
                    : "border-border text-muted-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What did you learn or observe?"
            className="min-h-20 resize-none text-[0.85rem]"
          />
          {entryType === "interview" && (
            <>
              <Input
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                placeholder="Who did you talk to? (e.g. restaurant owner)"
                className="text-[0.85rem]"
              />
              <Input
                value={keyQuote}
                onChange={(e) => setKeyQuote(e.target.value)}
                placeholder="A key quote (optional)"
                className="text-[0.85rem]"
              />
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.76rem] text-muted-foreground">Pain:</span>
                  {PAIN_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPainSeverity(p.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[0.72rem]",
                        painSeverity === p.value
                          ? "border-gold bg-gold/10 text-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.76rem] text-muted-foreground">Would pay:</span>
                  {WTP_OPTIONS.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => setWillingnessToPay(w.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[0.72rem]",
                        willingnessToPay === w.value
                          ? "border-econ-green-active bg-econ-green-soft text-econ-green-deep"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div>
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!content.trim() || addMutation.isPending}
            >
              {addMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              Save Evidence
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {query.isLoading ? (
          <p className="text-[0.82rem] text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-[0.85rem] text-muted-foreground">
            No evidence logged yet. Talk to a real customer, then add what you learned here.
          </p>
        ) : (
          entries.map((entry) => (
            <EvidenceCard
              key={entry.id}
              entry={entry}
              onDelete={() => deleteMutation.mutate(entry.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
