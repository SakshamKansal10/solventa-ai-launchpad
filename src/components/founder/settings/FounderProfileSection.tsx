import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useLabels } from "@/components/consultation/labels";
import { useProfileFacts } from "@/components/consultation/ProfileSignals";
import { ScreenView } from "@/components/consultation/ScreenView";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ConsultationAnswers, ScreenKey } from "@/lib/consultation/model";
import { ConsultationProvider, useConsultation } from "@/lib/consultation/store";
import { reanalyzeFromCurrentProfile, updateFounderProfileAnswers } from "@/lib/actions/profile";
import type { SettingsData } from "@/lib/actions/settings";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import { Button, Card, EmptyState, LinkButton } from "../ui";

interface RowDef {
  key: string;
  label: MessageKey;
  screens: ScreenKey[];
  facts: string[];
}

/** Each row opens the SAME questions the founder answered in the consultation
 * (never a bespoke free-text form), limited to the screens that own that
 * topic. `position` appears in two rows because which questions it asks
 * depends on the founder's status. */
const ROWS: RowDef[] = [
  {
    key: "basics",
    label: "set.founder.row.basics",
    screens: ["basics", "position"],
    facts: ["status"],
  },
  {
    key: "location",
    label: "set.founder.row.location",
    screens: ["location"],
    facts: ["location"],
  },
  {
    key: "education",
    label: "set.founder.row.education",
    screens: ["education"],
    facts: ["education"],
  },
  { key: "time", label: "set.founder.row.time", screens: ["languagesTime"], facts: ["time"] },
  {
    key: "skills",
    label: "set.founder.row.skills",
    screens: ["skills", "domains", "execution"],
    facts: ["skills"],
  },
  {
    key: "resources",
    label: "set.founder.row.resources",
    screens: ["capital", "access", "position"],
    facts: ["capital", "access", "income", "business"],
  },
  { key: "risk", label: "set.founder.row.risk", screens: ["riskRoles"], facts: ["risk", "team"] },
  {
    key: "motivation",
    label: "set.founder.row.motivation",
    screens: ["commitment", "interests"],
    facts: [],
  },
  {
    key: "limits",
    label: "set.founder.row.limits",
    screens: ["refuseRelocation", "constraints"],
    facts: [],
  },
  {
    key: "ambition",
    label: "set.founder.row.ambition",
    screens: ["scaleHorizon", "incomeHope"],
    facts: ["scale", "horizon"],
  },
];

function useRowSummary() {
  const { t, tp } = useLocale();
  const L = useLabels();
  const facts = useProfileFacts();
  const { answers: a } = useConsultation();

  return (row: RowDef): string => {
    const parts: string[] = [];
    if (row.key === "basics" && a.age) parts.push(t("set.founder.age", { n: a.age }));
    for (const key of row.facts) {
      const f = facts.find((x) => x.key === key);
      if (f) parts.push(f.value);
    }
    if (row.key === "motivation") {
      if (a.commitment) parts.push(L.label("commitment", a.commitment));
      const n = (a.interests ?? []).length;
      if (n > 0) parts.push(tp("set.founder.interestsCount", n));
    }
    if (row.key === "limits") {
      const n = (a.constraints ?? []).filter((c) => c !== "none").length + (a.refuse ?? []).length;
      if (n > 0) parts.push(tp("set.founder.constraintsCount", n));
      else if ((a.constraints ?? []).includes("none")) parts.push(t("common.none"));
    }
    return parts.length > 0 ? parts.join(" · ") : t("set.founder.notSet");
  };
}

function SheetFlow({ saving }: { saving: boolean }) {
  const { t } = useLocale();
  const c = useConsultation();
  const isFirst = c.index === 0;
  const isLast = c.index === c.screens.length - 1;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6" data-testid="founder-edit-flow">
      <div className="flex-1 overflow-y-auto pb-2" data-testid={`edit-screen-${c.current?.key}`}>
        {c.current ? <ScreenView screenKey={c.current.key} /> : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-sol-border pt-4">
        <Button variant="ghost" onClick={c.goBack} disabled={isFirst || saving}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("common.back")}
        </Button>
        <Button
          onClick={c.goNext}
          disabled={!c.canContinue}
          loading={isLast && saving}
          data-testid="founder-edit-next"
        >
          {isLast ? t("set.founder.save") : t("common.continue")}
        </Button>
      </div>
    </div>
  );
}

function EditSheet({
  row,
  answers,
  onClose,
}: {
  row: RowDef | null;
  answers: ConsultationAnswers;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();

  const save = useMutation({
    mutationFn: (next: ConsultationAnswers) =>
      updateFounderProfileAnswers({
        data: { answers: next as Record<string, unknown>, replace: true },
      }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: qk.settings }), invalidate()]);
      toast.success(t("set.founder.saved"));
      onClose();
    },
    onError: (err) => {
      console.error("[settings] founder profile save failed:", err);
      toast.error(t("set.founder.saveError"));
    },
  });

  return (
    <Sheet open={Boolean(row)} onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-hidden bg-sol-pearl p-5 sm:max-w-[40rem] sm:p-8"
        data-testid="founder-edit-sheet"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="sol-h3">
            {row ? t("set.founder.sheetTitle", { section: t(row.label) }) : ""}
          </SheetTitle>
          <SheetDescription className="text-[1rem] text-sol-secondary">
            {t("set.founder.sheetBody")}
          </SheetDescription>
        </SheetHeader>
        {row && (
          <ConsultationProvider
            key={row.key}
            initialAnswers={answers}
            restrictTo={row.screens}
            persist={false}
            onFinishRestricted={(next) => save.mutate(next)}
          >
            <SheetFlow saving={save.isPending} />
          </ConsultationProvider>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Rows({ answers }: { answers: ConsultationAnswers }) {
  const { t } = useLocale();
  const summary = useRowSummary();
  const [editing, setEditing] = useState<RowDef | null>(null);

  return (
    <>
      <ul className="flex flex-col divide-y divide-sol-border" data-testid="founder-rows">
        {ROWS.map((row) => (
          <li
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4"
          >
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-semibold text-sol-secondary">{t(row.label)}</p>
              <p
                className="mt-0.5 text-[1.0625rem] leading-snug text-sol-ink"
                data-testid={`founder-row-${row.key}`}
              >
                {summary(row)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(row)}
              data-testid={`edit-${row.key}`}
              aria-label={`${t("set.founder.edit")}: ${t(row.label)}`}
            >
              {t("set.founder.edit")}
            </Button>
          </li>
        ))}
      </ul>
      <EditSheet row={editing} answers={answers} onClose={() => setEditing(null)} />
    </>
  );
}

export function FounderProfileSection({ data }: { data: SettingsData }) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const invalidate = useInvalidateFounder();
  const queryClient = useQueryClient();

  const reanalyze = useMutation({
    mutationFn: () => reanalyzeFromCurrentProfile({ data: { locale } }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: qk.settings }), invalidate()]);
      toast.success(t("set.founder.reanalyzed"));
      void navigate({ to: "/dashboard" });
    },
    onError: (err) => {
      console.error("[settings] re-analyze failed:", err);
      toast.error(t("set.founder.reanalyzeError"));
    },
  });

  const answers = data.answers as ConsultationAnswers | null;
  // A fresh provider whenever the saved answers change, so every row summary
  // re-reads them.
  const providerKey = useMemo(() => JSON.stringify(answers ?? {}), [answers]);

  return (
    <Card
      className="flex flex-col gap-5 p-6 sm:p-7"
      aria-labelledby="founder-h"
      data-testid="founder-section"
    >
      <div>
        <h2 id="founder-h" className="sol-h3">
          {t("set.founder.title")}
        </h2>
        <p className="sol-support mt-1 max-w-[60ch]">{t("set.founder.subtitle")}</p>
      </div>

      {data.profileChangedSinceDirections && (
        <div
          role="status"
          data-testid="profile-changed-banner"
          className="flex flex-col gap-3 rounded-2xl border border-sol-violet/30 bg-sol-violet-soft p-5"
        >
          <p className="text-[1.125rem] font-semibold text-sol-ink">
            {t("set.founder.changedTitle")}
          </p>
          <p className="text-[1rem] leading-relaxed text-sol-ink">{t("set.founder.changedBody")}</p>
          <Button
            className="self-start"
            onClick={() => reanalyze.mutate()}
            loading={reanalyze.isPending}
            data-testid="reanalyze"
          >
            {reanalyze.isPending ? t("set.founder.reanalyzing") : t("set.founder.reanalyze")}
          </Button>
        </div>
      )}

      {!data.hasConsultation ? (
        <EmptyState
          title={t("set.founder.none")}
          action={
            <LinkButton to="/consultation" variant="primary">
              {t("set.founder.start")}
            </LinkButton>
          }
        />
      ) : !answers ? (
        <div
          className="flex flex-col gap-3 rounded-2xl bg-sol-ivory p-5"
          data-testid="legacy-profile"
        >
          <p className="text-[1.125rem] font-semibold text-sol-ink">
            {t("set.founder.legacyTitle")}
          </p>
          <p className="text-[1rem] leading-relaxed text-sol-secondary">
            {t("set.founder.legacyBody")}
          </p>
          <LinkButton
            to="/consultation"
            search={{ edit: true }}
            variant="primary"
            className="self-start"
          >
            {t("set.founder.legacyCta")}
          </LinkButton>
        </div>
      ) : (
        <ConsultationProvider key={providerKey} initialAnswers={answers} persist={false}>
          <Rows answers={answers} />
        </ConsultationProvider>
      )}
    </Card>
  );
}
