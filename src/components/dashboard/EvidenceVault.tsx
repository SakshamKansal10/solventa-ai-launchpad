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
    <div className="rounded-xl border border-sol-border bg-sol-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-sol-champagne/30 bg-sol-champagne-soft/50 px-2.5 py-0.5 text-[0.7rem] font-semibold text-sol-champagne-deep">
            {EVIDENCE_CATEGORY_LABELS[entry.category]}
          </span>
          <span className="rounded-full bg-sol-ivory px-2.5 py-0.5 text-[0.7rem] font-medium text-sol-muted">
            {entry.entryType}
          </span>
          {entry.willingnessToPay === "yes" && (
            <span className="rounded-full bg-sol-champagne-soft px-2.5 py-0.5 text-[0.7rem] font-semibold text-sol-champagne-deep">
              Would pay
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete evidence"
          className="text-sol-muted transition-colors hover:text-sol-danger"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2.5 text-[0.95rem] leading-relaxed text-sol-ink">{entry.content}</p>
      {entry.keyQuote && (
        <p className="mt-2 flex items-start gap-1.5 text-[0.85rem] italic leading-relaxed text-sol-secondary">
          <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />“{entry.keyQuote}”
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem] text-sol-muted">
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
 * page only ever shows what was actually logged.
 *
 * Rendered nested inside the Opportunity page's own Proof section (which
 * already owns id="evidence"/scroll-mt-24 for DashboardShell's Proof nav
 * link) — this component deliberately does NOT declare its own id here,
 * to avoid a duplicate-id conflict in the DOM. */
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-champagne-deep">
            Evidence Vault
          </p>
          <p className="mt-1 text-[0.9rem] text-sol-secondary">
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
        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-sol-border bg-sol-border sm:grid-cols-3">
          {[
            { label: "Entries", value: summary.total },
            { label: "Interviews", value: summary.interviews },
            { label: "Paying signals", value: summary.payingSignals },
          ].map((cell) => (
            <div key={cell.label} className="bg-sol-surface px-4 py-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-sol-muted">
                {cell.label}
              </p>
              <p className="mt-0.5 font-display text-[1.15rem] font-semibold text-sol-ink">
                {cell.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-sol-border bg-sol-page/50 p-4">
          <div className="flex flex-wrap gap-1.5">
            {EVIDENCE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[0.8rem] font-medium",
                  category === c
                    ? "border-sol-violet bg-sol-violet-mist text-sol-violet-deep"
                    : "border-sol-border text-sol-secondary",
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
                  "rounded-full border px-3 py-1.5 text-[0.8rem] font-medium",
                  entryType === t.value
                    ? "border-sol-violet bg-sol-violet-mist text-sol-violet-deep"
                    : "border-sol-border text-sol-secondary",
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
            className="min-h-20 resize-none text-[0.9rem]"
          />
          {entryType === "interview" && (
            <>
              <Input
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                placeholder="Who did you talk to? (e.g. restaurant owner)"
                className="text-[0.9rem]"
              />
              <Input
                value={keyQuote}
                onChange={(e) => setKeyQuote(e.target.value)}
                placeholder="A key quote (optional)"
                className="text-[0.9rem]"
              />
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.8rem] text-sol-secondary">Pain:</span>
                  {PAIN_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPainSeverity(p.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[0.76rem]",
                        painSeverity === p.value
                          ? "border-sol-violet bg-sol-violet-mist text-sol-violet-deep"
                          : "border-sol-border text-sol-secondary",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.8rem] text-sol-secondary">Would pay:</span>
                  {WTP_OPTIONS.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => setWillingnessToPay(w.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[0.76rem]",
                        willingnessToPay === w.value
                          ? "border-sol-champagne bg-sol-champagne-soft text-sol-champagne-deep"
                          : "border-sol-border text-sol-secondary",
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
          <p className="text-[0.85rem] text-sol-secondary">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-sol-border px-4 py-6 text-center text-[0.9rem] text-sol-secondary">
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
    </div>
  );
}
