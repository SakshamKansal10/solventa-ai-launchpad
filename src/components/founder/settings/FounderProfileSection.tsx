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
import { Button, EmptyState, LinkButton } from "../ui";

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

  // The founder's own words where there are some (named skills, resources, interests — the first
  // three, then "+n"), never just a count.
  const named = (names: string[]) =>
    names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", ");
  const skills = (a.skills ?? []).filter((x) => x.level !== null).map((x) => L.skill(x.name));
  const access = (a.access ?? []).filter((x) => x !== "none").map((x) => L.label("access", x));
  const interests = (a.interests ?? []).map((x) => L.label("interests", x));

  return (row: RowDef): string => {
    const parts: string[] = [];
    if (row.key === "basics" && a.age) parts.push(t("set.founder.age", { n: a.age }));
    for (const key of row.facts) {
      if (key === "skills" && skills.length > 0) {
        parts.push(named(skills));
        continue;
      }
      if (key === "access" && access.length > 0) {
        parts.push(named(access));
        continue;
      }
      const f = facts.find((x) => x.key === key);
      if (f) parts.push(f.value);
    }
    if (row.key === "motivation") {
      if (a.commitment) parts.push(L.label("commitment", a.commitment));
      if (interests.length > 0) parts.push(named(interests));
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
      <ul className="flex flex-col border-t border-[#171A27]/10" data-testid="founder-rows">
        {ROWS.map((row) => (
          <li key={row.key} className="border-b border-[#171A27]/10">
            <button
              type="button"
              onClick={() => setEditing(row)}
              data-testid={`edit-${row.key}`}
              aria-label={`${t("set.founder.edit")}: ${t(row.label)}`}
              className="group flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 text-left transition-colors hover:bg-[#171A27]/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9]"
            >
              <span className="min-w-0">
                <span className="block text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
                  {t(row.label)}
                </span>
                <span
                  className="mt-2 block text-[clamp(1.25rem,1.05rem+0.6vw,1.6rem)] font-semibold leading-snug text-[#171A27]"
                  data-testid={`founder-row-${row.key}`}
                >
                  {summary(row)}
                </span>
              </span>
              <span className="text-[1rem] font-semibold text-[#171A27] underline-offset-[6px] group-hover:underline">
                {t("set.founder.edit")}
              </span>
            </button>
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
    <section
      id="founder-section"
      className="flex flex-col gap-6"
      aria-labelledby="founder-h"
      data-testid="founder-section"
    >
      <h2 id="founder-h" className="sr-only">
        {t("set.founder.title")}
      </h2>

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
    </section>
  );
}
