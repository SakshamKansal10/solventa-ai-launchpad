import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useConsultation } from "@/lib/consultation/store";
import { bracketLabelFor } from "@/lib/consultation/brackets";
import { cn } from "@/lib/utils";
import { useLabels } from "./labels";

interface Fact {
  key: string;
  label: string;
  value: string;
}

/** ONLY confirmed facts — what the founder has actually answered, worded
 * plainly. No personality commentary, no pseudo-percentages, no filler. */
export function useProfileFacts(): Fact[] {
  const { t, tp, locale } = useLocale();
  const L = useLabels();
  const { answers: a } = useConsultation();
  const facts: Fact[] = [];

  const place = [
    a.country && L.country(a.country),
    a.state ? (a.country === "India" ? L.state(a.state) : a.state) : a.city,
  ]
    .filter(Boolean)
    .join(" · ");
  if (place) facts.push({ key: "location", label: t("consult.panel.location"), value: place });

  if (a.status) {
    facts.push({
      key: "status",
      label: t("consult.panel.status"),
      value: a.status === "other" && a.statusOther ? a.statusOther : L.label("status", a.status),
    });
  }
  if (a.education) {
    const edu =
      a.education === "other" && a.educationOther
        ? a.educationOther
        : L.label("education", a.education);
    facts.push({ key: "education", label: t("consult.panel.education"), value: edu });
  }
  if (a.weeklyHours) {
    facts.push({
      key: "time",
      label: t("consult.panel.time"),
      value: `${L.label("hours", a.weeklyHours)}${locale === "hi" ? "/सप्ताह" : "/week"}`,
    });
  }
  const skills = (a.skills ?? []).filter((s) => s.level !== null);
  if (skills.length > 0) {
    facts.push({
      key: "skills",
      label: t("consult.panel.skills"),
      value: tp("consult.panel.skillsCount", skills.length),
    });
  }
  const capital = bracketLabelFor("capital", a.capitalBracket, a.country, locale);
  if (capital) facts.push({ key: "capital", label: t("consult.panel.capital"), value: capital });
  const access = (a.access ?? []).filter((x) => x !== "none");
  if (access.length > 0) {
    facts.push({
      key: "access",
      label: t("consult.panel.access"),
      value: tp("consult.panel.accessCount", access.length),
    });
  }
  const income = bracketLabelFor("income", a.annualIncomeBracket, a.country, locale);
  if (income) facts.push({ key: "income", label: t("consult.panel.income"), value: income });
  if (a.status === "business_owner" && typeof a.bizTurnoverBracket === "number") {
    const turnover = bracketLabelFor("turnover", a.bizTurnoverBracket, a.country, locale);
    if (turnover)
      facts.push({ key: "business", label: t("consult.panel.business"), value: turnover });
  }
  if (a.riskTolerance) {
    facts.push({
      key: "risk",
      label: t("consult.panel.risk"),
      value: L.label("risk", a.riskTolerance),
    });
  }
  if (a.teamPreference) {
    facts.push({
      key: "team",
      label: t("consult.panel.team"),
      value: L.label("team", a.teamPreference),
    });
  }
  if (a.scale)
    facts.push({ key: "scale", label: t("consult.panel.scale"), value: L.label("scale", a.scale) });
  if (a.horizon) {
    facts.push({
      key: "horizon",
      label: t("consult.panel.horizon"),
      value: L.label("horizon", a.horizon),
    });
  }
  return facts;
}

/** Living, not a receipt: a fact that wasn't here on the previous render
 * gets one brief violet highlight that settles back to normal — the only
 * signal that this panel is reacting to what the founder just answered,
 * not a static printout. */
function useJustArrivedKeys(facts: Fact[]): Set<string> {
  const seen = useRef<Set<string>>(new Set());
  const [justArrived, setJustArrived] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newly = new Set<string>();
    for (const f of facts) {
      if (!seen.current.has(f.key)) {
        newly.add(f.key);
        seen.current.add(f.key);
      }
    }
    if (newly.size === 0) return;
    setJustArrived(newly);
    const id = window.setTimeout(() => setJustArrived(new Set()), 1100);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts.map((f) => f.key).join(",")]);

  return justArrived;
}

export function ProfileSignals({ className }: { className?: string }) {
  const { t } = useLocale();
  const facts = useProfileFacts();
  const justArrived = useJustArrivedKeys(facts);
  const reduceMotion = useReducedMotion();

  return (
    <aside
      aria-label={t("consult.panel.title")}
      data-testid="profile-signals"
      className={cn("sol-card p-5", className)}
    >
      <h2 className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
        {t("consult.panel.title")}
      </h2>
      {facts.length === 0 ? (
        <p className="mt-3 text-[1rem] leading-relaxed text-sol-secondary">
          {t("consult.panel.empty")}
        </p>
      ) : (
        <>
          <dl className="mt-4 flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {facts.map((f) => (
                <motion.div
                  key={f.key}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="-mx-2.5 rounded-xl px-2.5 py-2.5 transition-colors duration-[700ms]"
                  style={{
                    backgroundColor:
                      justArrived.has(f.key) && !reduceMotion
                        ? "var(--sol-violet-soft)"
                        : "transparent",
                  }}
                  data-testid={`profile-fact-${f.key}`}
                  data-just-arrived={justArrived.has(f.key) || undefined}
                >
                  <dt className="text-[0.875rem] font-semibold text-sol-secondary">{f.label}</dt>
                  <dd className="mt-0.5 text-[1.0625rem] font-medium leading-snug text-sol-ink">
                    {f.value}
                  </dd>
                </motion.div>
              ))}
            </AnimatePresence>
          </dl>
          <p className="mt-4 border-t border-sol-border pt-3 text-[0.8125rem] leading-snug text-sol-secondary">
            {t("consult.panel.footerNote")}
          </p>
        </>
      )}
    </aside>
  );
}
