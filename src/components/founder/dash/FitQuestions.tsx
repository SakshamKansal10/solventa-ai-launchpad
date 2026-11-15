import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ActionButton, ActionLink, QuietRow } from "@/components/founder/dash/ui";
import { getFitQuestions, type FitQuestionsDTO } from "@/lib/actions/fit-questions";
import { updateFounderProfileAnswers } from "@/lib/actions/profile";
import type { SkillEntry } from "@/lib/consultation/model";
import { formatBracketLabel, getBracketsForCountry } from "@/lib/consultation/brackets";
import { getCurrencyForCountry } from "@/lib/country-currency";
import {
  ACCESS_IDS,
  EXCLUSIVE_NONE,
  HOURS_IDS,
  SCALE_IDS,
  SKILL_LEVEL_IDS,
  skillSlug,
} from "@/lib/consultation/options";
import type { Contradiction, GapField } from "@/lib/fit/gaps";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useInvalidateFounder } from "@/lib/queries";
import { cn } from "@/lib/utils";

const FIT_QUESTIONS_KEY = ["fit-questions"] as const;

export function useFitQuestions(enabled: boolean) {
  return useQuery({
    queryKey: FIT_QUESTIONS_KEY,
    queryFn: () => getFitQuestions(),
    enabled,
    staleTime: 60_000,
  });
}

const chipCls = (on: boolean) =>
  cn(
    "inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-5 text-[17px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sol-cobalt",
    on ? "border-sol-ink bg-sol-ink text-white" : "border-sol-ink/25 bg-white text-sol-ink",
  );

const inputCls =
  "min-h-12 rounded-2xl border border-sol-ink/20 bg-white px-4 text-[17px] text-sol-ink focus-visible:border-sol-cobalt focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sol-cobalt";

function Question({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[20px] font-semibold leading-[1.35] text-sol-ink">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

interface Draft {
  access: string[];
  capitalBracket: number | null;
  skills: SkillEntry[];
  weeklyHours: string | null;
  scale: string | null;
}

/** The answers the founder gave, as a patch onto the latest consultation's answers. */
function toPatch(missing: GapField[], d: Draft): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (missing.includes("access") && d.access.length) patch.access = d.access;
  if (missing.includes("capital") && d.capitalBracket !== null)
    patch.capitalBracket = d.capitalBracket;
  const skills = d.skills.filter((s) => s.level !== null);
  if (missing.includes("skills") && skills.length) patch.skills = skills;
  if (missing.includes("hours") && d.weeklyHours) patch.weeklyHours = d.weeklyHours;
  if (missing.includes("scale") && d.scale) patch.scale = d.scale;
  return patch;
}

/**
 * "Answer now" on Directions (redesign-v2 part 4, feature 5): two to four short questions for
 * exactly the answers that leave a fit factor "Not known yet". Saved onto the latest
 * consultation; the fit recalculates from them on the next read.
 */
export function FitQuestionsPanel({ data, onDone }: { data: FitQuestionsDTO; onDone: () => void }) {
  const { t, td, locale } = useLocale();
  const invalidate = useInvalidateFounder();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>({
    access: [],
    capitalBracket: null,
    skills: [],
    weeklyHours: null,
    scale: null,
  });
  const [custom, setCustom] = useState("");
  const { missing } = data;
  const patch = toPatch(missing, draft);
  const skillLevelMissing = draft.skills.some((s) => s.level === null);

  const save = useMutation({
    mutationFn: () => updateFounderProfileAnswers({ data: { answers: patch } }),
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: FIT_QUESTIONS_KEY }),
      ]);
      toast.success(t("v2.ask.saved"));
      onDone();
    },
    onError: (err) => {
      console.error("[directions] saving fit answers failed:", err);
      toast.error(t("v2.ask.error"));
    },
  });

  const toggleAccess = (id: string) =>
    setDraft((d) => {
      const none = EXCLUSIVE_NONE.access;
      if (d.access.includes(id)) return { ...d, access: d.access.filter((x) => x !== id) };
      if (id === none) return { ...d, access: [none] };
      return { ...d, access: [...d.access.filter((x) => x !== none), id] };
    });
  const toggleSkill = (name: string) =>
    setDraft((d) =>
      d.skills.some((s) => s.name === name)
        ? { ...d, skills: d.skills.filter((s) => s.name !== name) }
        : { ...d, skills: [...d.skills, { name, level: null, usedInReal: false }] },
    );
  const setSkill = (name: string, change: Partial<SkillEntry>) =>
    setDraft((d) => ({
      ...d,
      skills: d.skills.map((s) => (s.name === name ? { ...s, ...change } : s)),
    }));
  const skillLabel = (n: string) => td(`skill.${skillSlug(n)}`, undefined, n);
  const skillNames = Array.from(
    new Set([...data.skillOptions, ...draft.skills.map((s) => s.name)]),
  );
  const currency = getCurrencyForCountry(data.country).code;

  return (
    <form
      className="flex flex-col gap-8 rounded-[32px] border border-sol-border bg-white px-[clamp(20px,2.6vw,32px)] py-7"
      data-testid="fit-questions"
      onSubmit={(e) => {
        e.preventDefault();
        if (Object.keys(patch).length && !skillLevelMissing) save.mutate();
      }}
    >
      <p className="text-[18px] text-sol-secondary">{t("v2.ask.lead")}</p>

      {missing.includes("access") && (
        <Question legend={t("q.access.title")}>
          <div className="flex flex-wrap gap-2">
            {ACCESS_IDS.map((id) => (
              <label key={id} className={chipCls(draft.access.includes(id))}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={draft.access.includes(id)}
                  onChange={() => toggleAccess(id)}
                  data-testid={`ask-access-${id}`}
                />
                {td(`opt.access.${id}`)}
              </label>
            ))}
          </div>
        </Question>
      )}

      {missing.includes("capital") && (
        <Question legend={t("q.capital.title")}>
          <div className="flex flex-wrap gap-2">
            {getBracketsForCountry("capital", data.country).map((b, i) => (
              <label key={i} className={chipCls(draft.capitalBracket === i)}>
                <input
                  type="radio"
                  name="ask-capital"
                  className="sr-only"
                  checked={draft.capitalBracket === i}
                  onChange={() => setDraft((d) => ({ ...d, capitalBracket: i }))}
                  data-testid={`ask-capital-${i}`}
                />
                {formatBracketLabel(b, currency, locale)}
              </label>
            ))}
          </div>
        </Question>
      )}

      {missing.includes("skills") && (
        <>
          <Question legend={t("q.skills.title")}>
            <p className="-mt-1 text-[17px] text-sol-secondary">{t("q.skills.helper")}</p>
            <div className="flex flex-wrap gap-2">
              {skillNames.map((n) => {
                const on = draft.skills.some((s) => s.name === n);
                return (
                  <label key={n} className={chipCls(on)}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => toggleSkill(n)}
                      data-testid="ask-skill"
                    />
                    {skillLabel(n)}
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className={cn(inputCls, "min-w-0 flex-[1_1_220px]")}
                value={custom}
                maxLength={60}
                placeholder={t("v2.ask.skillOther")}
                aria-label={t("v2.ask.skillOther")}
                onChange={(e) => setCustom(e.target.value)}
                data-testid="ask-skill-custom"
              />
              <ActionButton
                type="button"
                tone="secondary"
                size="md"
                arrow={false}
                disabled={!custom.trim()}
                onClick={() => {
                  const name = custom.trim();
                  if (name && !draft.skills.some((s) => s.name === name)) toggleSkill(name);
                  setCustom("");
                }}
              >
                {t("v2.ask.add")}
              </ActionButton>
            </div>
          </Question>
          {draft.skills.length > 0 && (
            <Question legend={t("q.skills.level")}>
              <ul className="flex flex-col gap-3">
                {draft.skills.map((s) => (
                  <li key={s.name} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="min-w-[10em] text-[18px] font-medium text-sol-ink">
                      {skillLabel(s.name)}
                    </span>
                    <select
                      className={inputCls}
                      value={s.level ?? ""}
                      aria-label={`${t("q.skills.level")} ${skillLabel(s.name)}`}
                      onChange={(e) =>
                        setSkill(s.name, {
                          level: (e.target.value || null) as SkillEntry["level"],
                        })
                      }
                      data-testid="ask-skill-level"
                    >
                      <option value="">—</option>
                      {SKILL_LEVEL_IDS.map((l) => (
                        <option key={l} value={l}>
                          {td(`q.skills.level.${l}`)}
                        </option>
                      ))}
                    </select>
                    <label className="inline-flex min-h-12 items-center gap-2 text-[17px] text-sol-ink">
                      <input
                        type="checkbox"
                        className="size-5 accent-sol-navy"
                        checked={s.usedInReal}
                        onChange={(e) => setSkill(s.name, { usedInReal: e.target.checked })}
                      />
                      {t("q.skills.usedInReal")}
                    </label>
                  </li>
                ))}
              </ul>
              {skillLevelMissing && (
                <p className="text-[17px] text-sol-secondary">{t("q.skills.needLevel")}</p>
              )}
            </Question>
          )}
        </>
      )}

      {missing.includes("hours") && (
        <Question legend={t("q.hours.label")}>
          <div className="flex flex-wrap gap-2">
            {HOURS_IDS.map((id) => (
              <label key={id} className={chipCls(draft.weeklyHours === id)}>
                <input
                  type="radio"
                  name="ask-hours"
                  className="sr-only"
                  checked={draft.weeklyHours === id}
                  onChange={() => setDraft((d) => ({ ...d, weeklyHours: id }))}
                  data-testid={`ask-hours-${id}`}
                />
                {td(`opt.hours.${id}`)}
              </label>
            ))}
          </div>
        </Question>
      )}

      {missing.includes("scale") && (
        <Question legend={t("q.scale.label")}>
          <div className="flex flex-wrap gap-2">
            {SCALE_IDS.map((id) => (
              <label key={id} className={chipCls(draft.scale === id)}>
                <input
                  type="radio"
                  name="ask-scale"
                  className="sr-only"
                  checked={draft.scale === id}
                  onChange={() => setDraft((d) => ({ ...d, scale: id }))}
                  data-testid={`ask-scale-${id}`}
                />
                {td(`opt.scale.${id}`)}
              </label>
            ))}
          </div>
        </Question>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <ActionButton
          type="submit"
          size="md"
          loading={save.isPending}
          disabled={Object.keys(patch).length === 0 || skillLevelMissing}
          data-testid="fit-questions-save"
        >
          {t("v2.ask.save")}
        </ActionButton>
        <button
          type="button"
          className="min-h-12 px-2 text-[17px] text-sol-secondary underline underline-offset-4 hover:text-sol-ink"
          onClick={onDone}
        >
          {t("v2.ask.later")}
        </button>
      </div>
    </form>
  );
}

/** Two answers that do not usually go together: named plainly, with a way to correct them. */
export function ContradictionRow({ items }: { items: Contradiction[] }) {
  const { t, td } = useLocale();
  if (items.length === 0) return null;
  const part = (c: Contradiction): [string, string] => {
    const age = "age" in c ? t("v2.contra.age", { n: c.age }) : null;
    const status = "status" in c ? td(`opt.status.${c.status}`) : null;
    const education = "education" in c ? td(`opt.education.${c.education}`) : null;
    const [a, b] = [age, status, education].filter((x): x is string => Boolean(x));
    return [a, b];
  };
  return (
    <QuietRow className="border-0 bg-sol-pearl" data-testid="profile-contradiction">
      <div className="flex flex-[1_1_420px] flex-col gap-1">
        <p className="text-[20px] font-semibold leading-[1.4] text-sol-ink">
          {t("v2.contra.title")}
        </p>
        {items.map((c) => {
          const [a, b] = part(c);
          return (
            <p key={c.code} className="text-[18px] text-sol-secondary">
              {t("v2.contra.line", { a, b })}
            </p>
          );
        })}
      </div>
      <ActionLink to="/dashboard/settings" tone="secondary" size="md">
        {t("v2.contra.cta")}
      </ActionLink>
    </QuietRow>
  );
}
