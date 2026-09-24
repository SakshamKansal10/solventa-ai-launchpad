import { useMemo } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useConsultation } from "@/lib/consultation/store";
import { toggleMulti } from "@/lib/consultation/model";
import {
  COMMITMENT_IDS,
  CONSTRAINT_IDS,
  HOPE_IDS,
  HORIZON_IDS,
  INTEREST_IDS,
  REFUSE_IDS,
  RELOCATION_IDS,
  RISK_IDS,
  ROLE_IDS,
  SCALE_IDS,
  TEAM_IDS,
} from "@/lib/consultation/options";
import { formatBracketLabel, getBrackets } from "@/lib/consultation/brackets";
import { getCurrencyForCountry } from "@/lib/country-currency";
import { useLabels } from "./labels";
import { ChoiceGrid, MultiGrid, Question, ScreenBody, TextField } from "./ui";

/** Stage 4 — Execution & risk: three high-signal questions, nothing else. */
export function RiskRolesScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.riskRoles.title")}>
      <Question label={t("q.risk.label")}>
        <ChoiceGrid
          name="risk"
          options={L.opts("risk", RISK_IDS)}
          value={answers.riskTolerance}
          onChange={(id) => setAnswer("riskTolerance", id)}
        />
      </Question>
      <Question label={t("q.roles.label")} helper={t("q.roles.helper")}>
        <MultiGrid
          name="roles"
          options={L.opts("roles", ROLE_IDS)}
          value={answers.roles}
          onToggle={(id) => setAnswer("roles", toggleMulti("roles", answers.roles, id))}
        />
      </Question>
      <Question label={t("q.team.label")}>
        <ChoiceGrid
          name="team"
          options={L.opts("team", TEAM_IDS)}
          value={answers.teamPreference}
          onChange={(id) => setAnswer("teamPreference", id)}
        />
      </Question>
    </ScreenBody>
  );
}

export function CommitmentScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.commitment.title")} helper={t("q.commitment.helper")}>
      <ChoiceGrid
        name="commitment"
        columns={1}
        options={L.opts("commitment", COMMITMENT_IDS)}
        value={answers.commitment}
        onChange={(id) => setAnswer("commitment", id)}
      />
    </ScreenBody>
  );
}

/** Soft signal only — the helper says so, and the answer never blocks Continue. */
export function InterestsScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.interests.title")} helper={t("q.interests.helper")} optional>
      <MultiGrid
        name="interests"
        options={L.opts("interests", INTEREST_IDS)}
        value={answers.interests}
        onToggle={(id) => setAnswer("interests", toggleMulti("interests", answers.interests, id))}
      />
    </ScreenBody>
  );
}

export function RefuseRelocationScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.refuseReloc.title")}>
      <Question label={t("q.refuse.label")} helper={t("q.refuse.helper")} optional>
        <MultiGrid
          name="refuse"
          options={L.opts("refuse", REFUSE_IDS)}
          value={answers.refuse}
          onToggle={(id) => setAnswer("refuse", toggleMulti("refuse", answers.refuse, id))}
        />
      </Question>
      <Question label={t("q.relocation.label")}>
        <ChoiceGrid
          name="relocation"
          options={L.opts("relocation", RELOCATION_IDS)}
          value={answers.relocation}
          onChange={(id) => setAnswer("relocation", id)}
        />
      </Question>
    </ScreenBody>
  );
}

export function ConstraintsScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.constraints.title")} helper={t("q.constraints.helper")}>
      <MultiGrid
        name="constraints"
        options={L.opts("constraints", CONSTRAINT_IDS)}
        value={answers.constraints}
        onToggle={(id) =>
          setAnswer("constraints", toggleMulti("constraints", answers.constraints, id))
        }
      />
      {/* Only when "Other" is selected. */}
      {(answers.constraints ?? []).includes("other") && (
        <TextField
          id="q-constraints-other"
          testId="input-constraints-other"
          label={t("q.constraintsOther.label")}
          value={answers.constraintsOther ?? ""}
          maxLength={200}
          placeholder={t("q.constraintsOther.placeholder")}
          onChange={(v) => setAnswer("constraintsOther", v)}
        />
      )}
    </ScreenBody>
  );
}

export function ScaleHorizonScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.scaleHorizon.title")}>
      <Question label={t("q.scale.label")}>
        <ChoiceGrid
          name="scale"
          columns={1}
          options={L.opts("scale", SCALE_IDS)}
          value={answers.scale}
          onChange={(id) => setAnswer("scale", id)}
        />
      </Question>
      <Question label={t("q.horizon.label")}>
        <ChoiceGrid
          name="horizon"
          columns={2}
          options={L.opts("horizon", HORIZON_IDS)}
          value={answers.horizon}
          onChange={(id) => setAnswer("horizon", id)}
        />
      </Question>
    </ScreenBody>
  );
}

/** The minimum-income answer is a CONSTRAINT — it must never be presented as,
 * or read like, the size of company the founder is aiming for. */
export function IncomeHopeScreen() {
  const { t, locale } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const currency = getCurrencyForCountry(answers.country);
  const minOptions = useMemo(
    () =>
      getBrackets("minIncome", currency.code).map((b, i) => ({
        id: String(i),
        label: formatBracketLabel(b, currency.code, locale),
      })),
    [currency.code, locale],
  );
  return (
    <ScreenBody title={t("q.incomeHope.title")}>
      <Question label={t("q.minIncome.label")} helper={t("q.minIncome.helper")} optional>
        <ChoiceGrid
          name="minIncome"
          options={minOptions}
          value={
            answers.minIncomeBracket === undefined ? undefined : String(answers.minIncomeBracket)
          }
          onChange={(id) => setAnswer("minIncomeBracket", Number(id))}
        />
      </Question>
      <Question label={t("q.hope.label")}>
        <ChoiceGrid
          name="hope"
          options={L.opts("hope", HOPE_IDS)}
          value={answers.hope}
          onChange={(id) => setAnswer("hope", id)}
        />
      </Question>
    </ScreenBody>
  );
}
