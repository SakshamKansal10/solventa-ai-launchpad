import { useState } from "react";
import { Check, Plus, Search } from "lucide-react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useConsultation } from "@/lib/consultation/store";
import { toggleMulti, type SkillEntry } from "@/lib/consultation/model";
import { DOMAIN_IDS, EXECUTION_IDS, SKILL_LEVEL_IDS } from "@/lib/consultation/options";
import { SKILL_CATEGORIES, SKILL_LIBRARY } from "@/lib/onboarding-types";
import { cn } from "@/lib/utils";
import { useLabels } from "./labels";
import { ChipCloud } from "./controls";
import { Question, ScreenBody, Segmented, TextField } from "./ui";

/** Skills: searchable multi-select. Each skill states how good it really is
 * AND whether it was ever used on a real project/job — that second answer is
 * what stops a long list of beginner tick-boxes from anchoring the result. */
const LEVEL_RANK: Record<string, number> = { basic: 1, working: 2, advanced: 3, professional: 4 };
const LIBRARY = new Set(SKILL_LIBRARY);

/** Four bars that fill with the stated proficiency. */
function LevelMeter({ level }: { level: string | null }) {
  const rank = level ? (LEVEL_RANK[level] ?? 0) : 0;
  return (
    <span className="flex items-end gap-[3px]" aria-hidden="true">
      {[1, 2, 3, 4].map((b) => (
        <span
          key={b}
          style={{ height: `${8 + b * 4}px` }}
          className={cn(
            "w-1.5 rounded-sm transition-colors duration-200",
            b <= rank ? "bg-sol-cobalt" : "bg-sol-border-strong",
          )}
        />
      ))}
    </span>
  );
}

/**
 * Skills, step 1 (owner, 2026-11-17, Job J: picking several skills was painful — every pick closed
 * the picker, added a two-question card, and the list reopened at the top). Every skill is a chip
 * that toggles in place: nothing opens or closes, the list never moves (a chip's "+" and "✓" are
 * the same width, and a skill you add yourself keeps its place even when untoggled), and how good
 * you are at each is asked once, on the next step (SkillLevelsScreen).
 */
export function SkillsScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const [query, setQuery] = useState("");
  const skills = answers.skills ?? [];
  const chosen = new Set(skills.map((s) => s.name));
  // Skills the founder typed in themselves, in the order added — kept for this visit even when
  // untoggled, so removing one never shifts the chips after it.
  const [own, setOwn] = useState<string[]>(() =>
    skills.map((s) => s.name).filter((n) => !LIBRARY.has(n)),
  );

  function toggle(name: string) {
    if (chosen.has(name))
      setAnswer(
        "skills",
        skills.filter((s) => s.name !== name),
      );
    // Level starts UNSET on purpose — the founder says how good they are on the next step.
    else setAnswer("skills", [...skills, { name, level: null, usedInReal: false }]);
  }

  function addOwn() {
    const clean = query.trim();
    if (!clean) return;
    const known = SKILL_LIBRARY.find((s) => s.toLowerCase() === clean.toLowerCase());
    const name = known ?? own.find((s) => s.toLowerCase() === clean.toLowerCase()) ?? clean;
    if (!known && !own.includes(name)) setOwn([...own, name]);
    if (!chosen.has(name))
      setAnswer("skills", [...skills, { name, level: null, usedInReal: false }]);
    setQuery("");
  }

  const q = query.trim().toLowerCase();
  const matches = (name: string) =>
    !q || name.toLowerCase().includes(q) || L.skill(name).toLowerCase().includes(q);
  const exact =
    q.length > 0 &&
    [...SKILL_LIBRARY, ...own].some((s) => s.toLowerCase() === q || L.skill(s).toLowerCase() === q);
  const groups = [
    ...(own.length ? [{ label: t("q.skills.yourOwn"), skills: own }] : []),
    ...SKILL_CATEGORIES.map((c) => ({ label: L.skillCategory(c.label), skills: c.skills })),
  ]
    .map((g) => ({ ...g, skills: g.skills.filter(matches) }))
    .filter((g) => g.skills.length > 0);

  return (
    <ScreenBody title={t("q.skills.title")} helper={t("q.skills.helper")} optional>
      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">{t("q.skills.add")}</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sol-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            data-testid="skill-search"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q && !exact) {
                e.preventDefault();
                addOwn();
              }
            }}
            placeholder={t("q.skills.add")}
            className="h-12 w-full rounded-2xl border border-sol-border bg-sol-surface pl-11 pr-4 text-[1rem] text-sol-ink placeholder:text-sol-secondary/70 focus-visible:border-sol-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-cobalt/30"
          />
        </label>
        {/* Always one line tall, so the chips below never move when the count changes. */}
        <p
          aria-live="polite"
          data-testid="skill-count"
          className="min-h-[1.5rem] text-[0.9375rem] font-medium text-sol-secondary"
        >
          {skills.length === 0
            ? t("q.skills.chosenNone")
            : t("q.skills.chosen", { n: skills.length })}
        </p>
      </div>

      {q && !exact && (
        <button
          type="button"
          onClick={addOwn}
          data-testid="skill-add-own"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-dashed border-sol-cobalt/60 px-4 text-[1rem] font-medium text-sol-cobalt-deep hover:bg-sol-cobalt-soft"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("q.skills.addCustom", { name: query.trim() })}
        </button>
      )}
      {q && groups.length === 0 && (
        <p className="text-[1rem] text-sol-secondary">{t("q.skills.noMatches")}</p>
      )}

      <div className="flex flex-col gap-5" data-testid="skill-chips">
        {groups.map((g) => (
          <div key={g.label} role="group" aria-label={g.label} className="flex flex-col gap-2.5">
            <p
              aria-hidden="true"
              className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep"
            >
              {g.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.skills.map((name) => {
                const on = chosen.has(name);
                return (
                  <button
                    key={name}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    data-testid={`skill-chip-${name}`}
                    onClick={() => toggle(name)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-full border pl-3 pr-4 text-left text-[1rem] font-medium transition-colors duration-[160ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt",
                      on
                        ? "border-sol-cobalt bg-sol-cobalt text-white"
                        : "border-sol-border bg-sol-surface text-sol-ink hover:border-sol-cobalt/50",
                    )}
                  >
                    {/* The same width checked or not: the row never reflows. */}
                    <span className="flex size-4 items-center justify-center" aria-hidden="true">
                      {on ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : (
                        <Plus className="size-4 text-sol-secondary" />
                      )}
                    </span>
                    {L.skill(name)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {skills.length === 0 && !q && (
        <p className="max-w-[60ch] text-[1rem] leading-relaxed text-sol-secondary">
          {t("q.skills.empty")}
        </p>
      )}
    </ScreenBody>
  );
}

/** Skills, step 2 — only when skills were picked: how good the founder really is at each, and
 * whether it was ever used on a real project or job, in one compact list. */
export function SkillLevelsScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const skills = answers.skills ?? [];

  function update(name: string, patch: Partial<SkillEntry>) {
    setAnswer(
      "skills",
      skills.map((s) => (s.name === name ? { ...s, ...patch } : s)),
    );
  }

  const levelOptions = SKILL_LEVEL_IDS.map((id) => ({
    id,
    label: t(`q.skills.level.${id}` as const),
  }));
  const yesNo = [
    { id: "yes", label: t("common.yes") },
    { id: "no", label: t("common.no") },
  ];
  const missing = skills.some((s) => s.level === null);

  return (
    <ScreenBody title={t("q.skillLevels.title")} helper={t("q.skillLevels.helper")}>
      <ul className="flex flex-col gap-3" data-testid="skill-list">
        {skills.map((skill) => (
          <li
            key={skill.name}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border bg-sol-surface p-4",
              skill.level === null ? "border-sol-cobalt" : "border-sol-border",
            )}
          >
            <p className="flex items-center gap-3 text-[1.0625rem] font-semibold text-sol-ink">
              <LevelMeter level={skill.level} />
              {L.skill(skill.name)}
            </p>
            <Segmented
              label={`${L.skill(skill.name)} — ${t("q.skills.level")}`}
              options={levelOptions}
              value={skill.level ?? undefined}
              invalid={skill.level === null}
              onChange={(id) =>
                update(skill.name, {
                  level: id as SkillEntry["level"],
                  // A professional skill is real use by definition.
                  usedInReal: id === "professional" ? true : skill.usedInReal,
                })
              }
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="text-[0.9375rem] font-medium text-sol-secondary">
                {t("q.skills.usedInReal")}
              </p>
              <Segmented
                label={`${L.skill(skill.name)} — ${t("q.skills.usedInReal")}`}
                options={yesNo}
                value={skill.usedInReal ? "yes" : "no"}
                onChange={(id) => update(skill.name, { usedInReal: id === "yes" })}
              />
            </div>
          </li>
        ))}
      </ul>
      {missing && (
        <p role="status" className="text-[0.9375rem] text-sol-secondary">
          {t("q.skills.needLevel")}
        </p>
      )}
    </ScreenBody>
  );
}

export function DomainsScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.domains.title")} helper={t("q.domains.helper")}>
      <ChipCloud
        name="domains"
        searchPlaceholder={t("consult.search.domains")}
        emptyLabel={t("q.skills.noMatches")}
        groups={[
          {
            label: t("consult.group.domainsTech"),
            ids: ["software", "ecommerce", "data_research", "engineering", "design", "product"],
          },
          {
            label: t("consult.group.domainsBiz"),
            ids: [
              "finance",
              "consulting",
              "marketing",
              "sales",
              "operations",
              "accounting",
              "hr",
              "support",
            ],
          },
          {
            label: t("consult.group.domainsIndustry"),
            ids: [
              "healthcare",
              "education",
              "manufacturing",
              "realestate",
              "hospitality",
              "media",
              "agri_food",
              "logistics",
              "government",
              "nonprofit",
              "legal",
            ],
          },
          { label: "", ids: ["none"] },
        ]}
        options={L.opts("domains", DOMAIN_IDS)}
        value={answers.domains}
        onToggle={(id) => setAnswer("domains", toggleMulti("domains", answers.domains, id))}
      />
    </ScreenBody>
  );
}

export function ExecutionScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.execution.title")} helper={t("q.execution.helper")}>
      <ChipCloud
        name="execution"
        options={L.opts("execution", EXECUTION_IDS)}
        value={answers.executionSignals}
        onToggle={(id) =>
          setAnswer(
            "executionSignals",
            toggleMulti("executionSignals", answers.executionSignals, id),
          )
        }
      />
      <Question label={t("q.help.label")} helper={t("q.help.helper")} optional>
        <TextField
          id="q-help-asked"
          label={t("q.help.label")}
          hideLabel
          value={answers.helpAskedFor ?? ""}
          maxLength={160}
          placeholder={t("q.help.placeholder")}
          onChange={(v) => setAnswer("helpAskedFor", v)}
        />
      </Question>
    </ScreenBody>
  );
}
