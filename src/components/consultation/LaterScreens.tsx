import { useMemo } from "react";
import {
  Building2,
  CircleHelp,
  Coins,
  Compass,
  Flag,
  Globe,
  HeartHandshake,
  House,
  Layers,
  Briefcase,
  Shuffle,
  Store,
  Target,
  User,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

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
import { ChipCloud, DirectionCards, GroupedChecklist, SegmentedScale, StepScale } from "./controls";
import { Question, ScreenBody, TextField } from "./ui";

const COMMITMENT_ICONS = {
  large_company: Building2,
  financial_independence: Wallet,
  solve_problem: Target,
  expand_family_business: House,
  autonomy: Compass,
  technical_difficulty: Wrench,
  social_impact: HeartHandshake,
  not_sure: CircleHelp,
};
const TEAM_ICONS = {
  solo: User,
  open_cofounder: UserPlus,
  small_team: Users,
  has_team: Building2,
  no_preference: Shuffle,
};
const SCALE_ICONS = {
  profitable: Coins,
  national: Flag,
  global: Globe,
  expand_existing: Store,
  not_sure: CircleHelp,
};
const HOPE_ICONS = {
  portfolio_income: Layers,
  full_time: Briefcase,
  large_company: Building2,
  social_impact: HeartHandshake,
  family_expansion: House,
  not_sure: CircleHelp,
};

/** Stage 4 — Execution & risk: three high-signal questions, nothing else. */
export function RiskRolesScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.riskRoles.title")}>
      <Question label={t("q.risk.label")}>
        <StepScale
          name="risk"
          variant="continuum"
          showStopLabels
          options={L.opts("risk", RISK_IDS)}
          value={answers.riskTolerance}
          onChange={(id) => setAnswer("riskTolerance", id)}
          startLabel={t("consult.scale.riskLow")}
          endLabel={t("consult.scale.riskHigh")}
          placeholder={t("consult.scale.pick")}
        />
      </Question>
      <Question label={t("q.roles.label")} helper={t("q.roles.helper")}>
        <ChipCloud
          name="roles"
          options={L.opts("roles", ROLE_IDS)}
          value={answers.roles}
          onToggle={(id) => setAnswer("roles", toggleMulti("roles", answers.roles, id))}
        />
      </Question>
      <Question label={t("q.team.label")}>
        <DirectionCards
          name="team"
          icons={TEAM_ICONS}
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
      <DirectionCards
        name="commitment"
        icons={COMMITMENT_ICONS}
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
      <ChipCloud
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
        <ChipCloud
          name="refuse"
          options={L.opts("refuse", REFUSE_IDS)}
          value={answers.refuse}
          onToggle={(id) => setAnswer("refuse", toggleMulti("refuse", answers.refuse, id))}
        />
      </Question>
      <Question label={t("q.relocation.label")}>
        <StepScale
          name="relocation"
          variant="continuum"
          showStopLabels
          options={L.opts("relocation", RELOCATION_IDS)}
          value={answers.relocation}
          onChange={(id) => setAnswer("relocation", id)}
          startLabel={t("consult.scale.relocLow")}
          endLabel={t("consult.scale.relocHigh")}
          placeholder={t("consult.scale.pick")}
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
      <GroupedChecklist
        name="constraints"
        groups={[
          { label: t("consult.group.conCommit"), ids: ["cannot_leave", "family"] },
          { label: t("consult.group.conPlace"), ids: ["location_bound", "limited_travel"] },
          {
            label: t("consult.group.conMoney"),
            ids: ["no_debt", "limited_capital", "no_inventory", "no_regulated"],
          },
          { label: "", ids: ["other", "none"] },
        ]}
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
        <DirectionCards
          name="scale"
          icons={SCALE_ICONS}
          options={L.opts("scale", SCALE_IDS)}
          value={answers.scale}
          onChange={(id) => setAnswer("scale", id)}
        />
      </Question>
      <Question label={t("q.horizon.label")}>
        <SegmentedScale
          name="horizon"
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
        <StepScale
          name="minIncome"
          placeholder={t("consult.scale.pick")}
          options={minOptions}
          value={
            answers.minIncomeBracket === undefined ? undefined : String(answers.minIncomeBracket)
          }
          onChange={(id) => setAnswer("minIncomeBracket", Number(id))}
        />
      </Question>
      <Question label={t("q.hope.label")}>
        <DirectionCards
          name="hope"
          icons={HOPE_ICONS}
          options={L.opts("hope", HOPE_IDS)}
          value={answers.hope}
          onChange={(id) => setAnswer("hope", id)}
        />
      </Question>
    </ScreenBody>
  );
}
