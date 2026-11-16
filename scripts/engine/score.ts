import type { OpportunityPackage } from "@/lib/ai/schemas";
import type { EngineNotes } from "@/lib/engine/pipeline.server";
import { understand, type MoneyCheck } from "@/lib/engine/stages";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { needsMoneyRegistrationOrWebsite } from "@/lib/roadmap/week-one";

/**
 * The scoring sheet (part 5, step 6): five yes/no checks per direction, computed in code so
 * the same rules judge the old and the new pipeline, and anyone can re-run them.
 *
 * 1. place     — the customer / problem / offer / first test name the founder's city or state.
 * 2. week      — there is a first test, and it needs no money, registration or website.
 * 3. money     — the numbers work for this person: start cost within what they can afford to
 *                lose (or the low end of their money), hours within theirs, and — when they
 *                gave an income target — a monthly profit computed in code that reaches it.
 *                Directions without price × volume × margin cannot show that, so with a target
 *                they fail this check.
 * 4. quoted    — every "why this fits you" reason contains something the founder actually
 *                answered (a skill, place, access, status, sector, language, thing they did).
 * 5. labelled  — no market-size or growth figure stated as fact (a number with crore / lakh /
 *                billion / % next to market words, without "about / estimated / roughly…").
 */
export interface DirectionScore {
  title: string;
  place: boolean;
  week: boolean;
  money: boolean;
  quoted: boolean;
  labelled: boolean;
  total: number;
}

const MARKET_NUMBER =
  /(\d[\d,.]*\s*(crore|lakh|billion|million|bn|%|percent)[^.]{0,60}(market|industry|demand|growth|growing|users|customers))|((market|industry|demand)[^.]{0,60}\d[\d,.]*\s*(crore|lakh|billion|million|bn|%|percent))/i;
const HEDGE =
  /\b(about|around|roughly|approximately|approx|estimate|estimated|maybe|could|may|likely|~)\b/i;

function profileTerms(profile: NormalizedProfile): string[] {
  const v2 = profile.v2;
  const terms = [
    profile.identity.city,
    profile.identity.state,
    profile.identity.currentStatus,
    ...profile.identity.languages,
    ...profile.skills.map((s) => s.name),
    ...(v2?.access ?? []),
    ...(v2?.domains ?? []),
    ...(v2?.executionSignals ?? []),
    ...(v2?.reachThisWeek ?? []),
    ...(v2?.workDays ?? []),
    v2?.lossShare ?? null,
    v2?.status ?? null,
    v2?.education.level ?? null,
    v2?.education.major ?? null,
    v2?.ambition.scale ?? null,
    v2?.helpAskedFor ?? null,
    profile.identity.age !== null ? `${profile.identity.age}` : null,
    profile.time.weeklyHours ? `${profile.time.weeklyHours}` : null,
  ];
  return terms
    .filter((t): t is string => Boolean(t && t.trim().length >= 3))
    .flatMap((t) => [t, ...t.split(/[\s,/()]+/).filter((w) => w.length >= 5)])
    .map((t) => t.toLowerCase());
}

export function scoreDirection(
  profile: NormalizedProfile,
  opp: OpportunityPackage,
  notes: EngineNotes | null,
): DirectionScore {
  const brief = understand(profile);
  const place = [profile.identity.city, profile.identity.state]
    .filter((p): p is string => Boolean(p))
    .map((p) => p.toLowerCase());
  const placeText = [
    opp.customer,
    opp.problem,
    opp.solution,
    opp.plainEnglishSummary,
    opp.firstExperiment,
  ]
    .join(" ")
    .toLowerCase();

  const firstTest = opp.firstExperiment ?? "";
  const week = firstTest.trim().length > 0 && !needsMoneyRegistrationOrWebsite(firstTest);

  const maxCost = brief.limits.maxStartCost;
  const hoursMax = brief.limits.weeklyHours?.max ?? null;
  const target = brief.limits.monthlyIncomeTarget;
  const costOk = maxCost === null || opp.fitSignals.startupCapitalAmount <= maxCost;
  const hoursOk = hoursMax === null || opp.fitSignals.weeklyHoursNeeded <= hoursMax * 1.25;
  const money: MoneyCheck | null = notes?.money ?? null;
  // Reaching the target within their hours needs price × margin × volume, which only the
  // engine's numbers carry; a direction without them cannot show it.
  const incomeOk =
    target === null || target === 0 ? true : money ? money.meetsTarget === true : false;
  const moneyOk = costOk && hoursOk && incomeOk && (money ? money.verdict !== "over_hours" : true);

  const terms = profileTerms(profile);
  const reasons = opp.whyThisFounder ?? [];
  const quoted =
    reasons.length > 0 && reasons.every((r) => terms.some((t) => r.toLowerCase().includes(t)));

  const marketText = [
    opp.plainEnglishSummary,
    opp.whyNow,
    opp.revenuePath,
    opp.moneyHeadline,
    opp.businessModelPlainEnglish,
    ...(opp.advantages ?? []),
  ].join(". ");
  const sentences = marketText.split(/(?<=[.!?])\s+/);
  const labelled = !sentences.some((s) => MARKET_NUMBER.test(s) && !HEDGE.test(s));

  const checks = {
    place: place.some((p) => placeText.includes(p)),
    week,
    money: moneyOk,
    quoted,
    labelled,
  };
  return {
    title: opp.title,
    ...checks,
    total: Object.values(checks).filter(Boolean).length,
  };
}
