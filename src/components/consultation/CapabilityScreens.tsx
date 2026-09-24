import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useConsultation } from "@/lib/consultation/store";
import { toggleMulti, type SkillEntry } from "@/lib/consultation/model";
import { DOMAIN_IDS, EXECUTION_IDS, SKILL_LEVEL_IDS } from "@/lib/consultation/options";
import { SKILL_CATEGORIES, SKILL_LIBRARY } from "@/lib/onboarding-types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useLabels } from "./labels";
import { MultiGrid, ScreenBody, Segmented } from "./ui";

/** Skills: searchable multi-select. Each skill states how good it really is
 * AND whether it was ever used on a real project/job — that second answer is
 * what stops a long list of beginner tick-boxes from anchoring the result. */
export function SkillsScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const skills = answers.skills ?? [];
  const chosen = new Set(skills.map((s) => s.name));

  function add(name: string) {
    const clean = name.trim();
    if (!clean || chosen.has(clean)) return;
    // Level starts UNSET on purpose — the founder must say how good they are.
    setAnswer("skills", [...skills, { name: clean, level: null, usedInReal: false }]);
    setQuery("");
    setOpen(false);
  }

  function update(name: string, patch: Partial<SkillEntry>) {
    setAnswer(
      "skills",
      skills.map((s) => (s.name === name ? { ...s, ...patch } : s)),
    );
  }

  function remove(name: string) {
    setAnswer(
      "skills",
      skills.filter((s) => s.name !== name),
    );
  }

  const showAddCustom =
    query.trim().length > 0 &&
    !SKILL_LIBRARY.some((s) => s.toLowerCase() === query.trim().toLowerCase()) &&
    !chosen.has(query.trim());

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
    <ScreenBody title={t("q.skills.title")} helper={t("q.skills.helper")} optional>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="skill-add"
            className="flex h-12 w-full items-center justify-between rounded-2xl border border-sol-border bg-sol-surface px-4 text-left text-[1rem] text-sol-secondary transition-colors hover:border-sol-violet/45"
          >
            {t("q.skills.add")}
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("common.search")} value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>
                {showAddCustom ? (
                  <button
                    type="button"
                    onClick={() => add(query)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[1rem] text-sol-violet-deep hover:bg-sol-violet-soft"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {t("q.skills.addCustom", { name: query.trim() })}
                  </button>
                ) : (
                  t("q.skills.noMatches")
                )}
              </CommandEmpty>
              {SKILL_CATEGORIES.map((category) => {
                const available = category.skills.filter((s) => !chosen.has(s));
                if (available.length === 0) return null;
                return (
                  <CommandGroup key={category.label} heading={L.skillCategory(category.label)}>
                    {available.map((skill) => (
                      <CommandItem
                        key={skill}
                        value={`${skill} ${L.skill(skill)}`}
                        onSelect={() => add(skill)}
                      >
                        <Plus className="size-3.5 text-sol-secondary" aria-hidden="true" />
                        {L.skill(skill)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {skills.length === 0 && (
        <p className="max-w-[60ch] text-[1rem] leading-relaxed text-sol-secondary">
          {t("q.skills.empty")}
        </p>
      )}

      {skills.length > 0 && (
        <ul className="flex flex-col gap-3" data-testid="skill-list">
          {skills.map((skill) => (
            <li
              key={skill.name}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-sol-surface p-4",
                skill.level === null ? "border-sol-violet" : "border-sol-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[1.0625rem] font-semibold text-sol-ink">{L.skill(skill.name)}</p>
                <button
                  type="button"
                  onClick={() => remove(skill.name)}
                  aria-label={t("q.skills.remove", { name: L.skill(skill.name) })}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-sol-secondary hover:bg-sol-ivory hover:text-sol-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[0.9375rem] font-medium text-sol-secondary">
                  {t("q.skills.level")}
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
              </div>
              <div className="flex flex-col gap-1.5">
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
      )}
      {missing && (
        <p role="alert" className="text-[0.9375rem] text-sol-warning">
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
      <MultiGrid
        name="domains"
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
      <MultiGrid
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
    </ScreenBody>
  );
}
