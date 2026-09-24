import { useMemo } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useConsultation } from "@/lib/consultation/store";
import { isBusinessOwner, toggleMulti } from "@/lib/consultation/model";
import { ACCESS_IDS, SECTOR_DOMAIN_IDS } from "@/lib/consultation/options";
import {
  formatBracketLabel,
  getBrackets,
  TEAM_SIZE_IDS,
  type BracketKind,
} from "@/lib/consultation/brackets";
import { getCurrencyForCountry } from "@/lib/country-currency";
import { CurrencyField } from "./CurrencyField";
import { useLabels } from "./labels";
import { ChoiceGrid, ComboboxField, MultiGrid, Question, ScreenBody } from "./ui";

/** Country-aware bracket options: index → label in the founder's currency. */
function useBracketOptions(kind: BracketKind) {
  const { locale } = useLocale();
  const { answers } = useConsultation();
  const currency = getCurrencyForCountry(answers.country);
  return useMemo(
    () =>
      getBrackets(kind, currency.code).map((b, i) => ({
        id: String(i),
        label: formatBracketLabel(b, currency.code, locale),
      })),
    [kind, currency.code, locale],
  );
}

export function CapitalScreen() {
  const { t } = useLocale();
  const { answers, setAnswer } = useConsultation();
  const options = useBracketOptions("capital");
  const currency = getCurrencyForCountry(answers.country);
  const isTop = answers.capitalBracket === options.length - 1;

  return (
    <ScreenBody title={t("q.capital.title")} helper={t("q.capital.helper")}>
      <ChoiceGrid
        name="capital"
        options={options}
        value={answers.capitalBracket === undefined ? undefined : String(answers.capitalBracket)}
        onChange={(id) => setAnswer("capitalBracket", Number(id))}
      />
      {isTop && (
        <Question label={t("q.capitalPrecise.label")} optional>
          <CurrencyField
            value={answers.capitalPrecise}
            placeholder={t("q.capitalPrecise.placeholder")}
            currencyCode={currency.code}
            currencySymbol={currency.symbol}
            onChange={(raw) => setAnswer("capitalPrecise", raw)}
          />
        </Question>
      )}
    </ScreenBody>
  );
}

export function AccessScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  return (
    <ScreenBody title={t("q.access.title")} helper={t("q.access.helper")}>
      <MultiGrid
        name="access"
        options={L.opts("access", ACCESS_IDS)}
        value={answers.access}
        onToggle={(id) => setAnswer("access", toggleMulti("access", answers.access, id))}
      />
    </ScreenBody>
  );
}

/** Adaptive: a working professional / freelancer may share an income range; a
 * business owner describes what they already run. A ₹100-crore operator must
 * never be treated like a first-time side-hustle founder. */
export function PositionScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const income = useBracketOptions("income");
  const turnover = useBracketOptions("turnover");
  const team = TEAM_SIZE_IDS.map((id) => ({ id, label: L.label("team_size", id) }));

  if (isBusinessOwner(answers)) {
    return (
      <ScreenBody title={t("q.position.title")} helper={t("q.position.bizHelper")}>
        <ComboboxField
          id="q-biz-sector"
          testId="combo-biz-sector"
          label={t("q.bizSector.label")}
          options={L.opts("domains", SECTOR_DOMAIN_IDS)}
          value={answers.bizSector}
          placeholder={t("common.chooseOne")}
          searchPlaceholder={t("common.search")}
          emptyLabel={t("q.skills.noMatches")}
          onChange={(id) => setAnswer("bizSector", id)}
        />
        <Question label={t("q.bizTurnover.label")}>
          <ChoiceGrid
            name="turnover"
            options={turnover}
            value={
              answers.bizTurnoverBracket === undefined
                ? undefined
                : String(answers.bizTurnoverBracket)
            }
            onChange={(id) => setAnswer("bizTurnoverBracket", Number(id))}
          />
        </Question>
        <Question label={t("q.bizTeam.label")}>
          <ChoiceGrid
            name="bizteam"
            columns={3}
            options={team}
            value={
              answers.bizTeamBracket === undefined
                ? undefined
                : TEAM_SIZE_IDS[answers.bizTeamBracket]
            }
            onChange={(id) =>
              setAnswer(
                "bizTeamBracket",
                TEAM_SIZE_IDS.indexOf(id as (typeof TEAM_SIZE_IDS)[number]),
              )
            }
          />
        </Question>
      </ScreenBody>
    );
  }

  return (
    <ScreenBody title={t("q.income.label")} helper={t("q.income.helper")} optional>
      <ChoiceGrid
        name="income"
        options={income}
        value={
          answers.annualIncomeBracket === undefined
            ? undefined
            : String(answers.annualIncomeBracket)
        }
        onChange={(id) => setAnswer("annualIncomeBracket", Number(id))}
      />
      {answers.annualIncomeBracket !== undefined && (
        <button
          type="button"
          className="mt-3 text-[0.9375rem] font-semibold text-sol-violet-deep underline-offset-4 hover:underline"
          onClick={() => setAnswer("annualIncomeBracket", undefined)}
        >
          {t("q.income.skip")}
        </button>
      )}
    </ScreenBody>
  );
}
