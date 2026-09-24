import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useConsultation } from "@/lib/consultation/store";
import { AGE_MAX, AGE_MIN, parseAge } from "@/lib/consultation/model";
import {
  DEGREE_LEVEL_EDUCATION,
  EDUCATION_IDS,
  HOURS_IDS,
  INDIA_STATES,
  LANGUAGE_CODES,
  MAJOR_IDS,
  STATUS_IDS,
  STUDY_YEAR_IDS,
} from "@/lib/consultation/options";
import {
  COUNTRY_OPTIONS,
  countryCodeFromName,
  POSTAL_LOOKUP_COUNTRY_CODES,
} from "@/lib/location-data";
import { lookupPostalCode, searchCities, type CitySuggestion } from "@/lib/actions/location";
import { searchInstitutions, type InstitutionSuggestion } from "@/lib/actions/institutions";
import { LANGUAGE_LIBRARY } from "@/lib/onboarding-types";
import { useLabels } from "./labels";
import { ChoiceGrid, Chip, ComboboxField, MultiGrid, Question, ScreenBody, TextField } from "./ui";

/** Debounced value — used by the city/institution search boxes. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function BasicsScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const [touched, setTouched] = useState(false);
  const age = answers.age ?? "";
  const invalid = touched && age !== "" && parseAge(age) === null;

  return (
    <ScreenBody title={t("q.basics.title")}>
      <TextField
        id="q-age"
        testId="input-age"
        label={t("q.age.label")}
        value={age}
        inputMode="numeric"
        maxLength={3}
        autoFocus
        placeholder={t("q.age.placeholder")}
        onChange={(v) => {
          setTouched(true);
          setAnswer("age", v.replace(/\D/g, ""));
        }}
        error={invalid ? t("q.age.invalid", { min: AGE_MIN, max: AGE_MAX }) : null}
      />
      <Question label={t("q.status.label")}>
        <ChoiceGrid
          name="status"
          options={L.opts("status", STATUS_IDS)}
          value={answers.status}
          onChange={(id) => setAnswer("status", id)}
        />
        {answers.status === "other" && (
          <div className="mt-3">
            <TextField
              id="q-status-other"
              label={t("q.statusOther.label")}
              value={answers.statusOther ?? ""}
              maxLength={80}
              placeholder={t("q.statusOther.placeholder")}
              onChange={(v) => setAnswer("statusOther", v)}
            />
          </div>
        )}
      </Question>
    </ScreenBody>
  );
}

export function LocationScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const country = answers.country;
  const countryCode = country ? countryCodeFromName(country) : null;
  const isIndia = countryCode === "IN";
  const supportsPostal = countryCode !== null && POSTAL_LOOKUP_COUNTRY_CODES.has(countryCode);

  const [cityQuery, setCityQuery] = useState(answers.city ?? "");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showList, setShowList] = useState(false);
  const debouncedCity = useDebounced(cityQuery, 400);
  const [postal, setPostal] = useState(answers.postalCode ?? "");
  const [postalBusy, setPostalBusy] = useState(false);
  const [postalError, setPostalError] = useState<string | null>(null);

  const countryOptions = useMemo(
    () => COUNTRY_OPTIONS.map((c) => ({ id: c.name, label: L.country(c.name) })),
    [L],
  );
  const stateOptions = useMemo(() => INDIA_STATES.map((s) => ({ id: s, label: L.state(s) })), [L]);

  useEffect(() => {
    // Only search once the founder has typed something that isn't already the saved city.
    if (!country || debouncedCity.trim().length < 2 || debouncedCity === answers.city) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchCities({ data: { query: debouncedCity.trim(), countryName: country } })
      .then((res) => !cancelled && setSuggestions(res))
      .catch((err) => console.error("[location] city search failed:", err))
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedCity, country, answers.city]);

  async function fillFromPostal() {
    if (!countryCode || !country || !postal.trim()) return;
    setPostalBusy(true);
    setPostalError(null);
    try {
      const res = await lookupPostalCode({
        data: { countryCode, countryName: country, postalCode: postal.trim() },
      });
      if (!res?.city) {
        setPostalError(t("q.postal.notFound"));
        return;
      }
      setAnswer("postalCode", postal.trim());
      if (res.state) setAnswer("state", res.state);
      setAnswer("city", res.city);
      setCityQuery(res.city);
    } catch (err) {
      console.error("[location] postal lookup failed:", err);
      setPostalError(t("q.postal.notFound"));
    } finally {
      setPostalBusy(false);
    }
  }

  return (
    <ScreenBody title={t("q.location.title")} helper={t("q.location.helper")}>
      <ComboboxField
        id="q-country"
        testId="combo-country"
        label={t("q.country.label")}
        options={countryOptions}
        value={country}
        placeholder={t("q.country.placeholder")}
        searchPlaceholder={t("q.country.placeholder")}
        emptyLabel={t("q.skills.noMatches")}
        onChange={(id) => {
          setAnswer("country", id);
          setCityQuery("");
        }}
      />

      {country && (
        <>
          {isIndia ? (
            <ComboboxField
              id="q-state"
              testId="combo-state"
              label={t("q.state.label")}
              options={stateOptions}
              value={answers.state}
              placeholder={t("q.state.placeholder")}
              searchPlaceholder={t("q.state.placeholder")}
              emptyLabel={t("q.skills.noMatches")}
              onChange={(id) => setAnswer("state", id)}
            />
          ) : (
            <TextField
              id="q-state"
              testId="input-state"
              label={t("q.state.label")}
              value={answers.state ?? ""}
              maxLength={80}
              placeholder={t("q.state.placeholder")}
              onChange={(v) => setAnswer("state", v)}
            />
          )}

          <div className="relative">
            <TextField
              id="q-city"
              testId="input-city"
              label={t("q.city.label")}
              value={cityQuery}
              maxLength={80}
              autoComplete="off"
              placeholder={t("q.city.placeholder")}
              onChange={(v) => {
                setCityQuery(v);
                setAnswer("city", v.trim() === "" ? undefined : v);
                setShowList(true);
              }}
            />
            <span className="pointer-events-none absolute right-4 top-[2.55rem] text-sol-secondary">
              {searching ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="size-4" aria-hidden="true" />
              )}
            </span>
            {showList && suggestions.length > 0 && (
              <ul
                role="listbox"
                aria-label={t("q.city.label")}
                className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-sol-border bg-sol-surface py-1 shadow-lg"
              >
                {suggestions.map((s) => (
                  <li key={s.displayLabel} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => {
                        setCityQuery(s.name);
                        setAnswer("city", s.name);
                        if (s.state) setAnswer("state", s.state);
                        setShowList(false);
                        setSuggestions([]);
                      }}
                      className="flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left text-[1rem] text-sol-ink hover:bg-sol-violet-soft"
                    >
                      <MapPin className="size-4 shrink-0 text-sol-secondary" aria-hidden="true" />
                      {s.displayLabel}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {supportsPostal && (
            <details className="rounded-2xl border border-sol-border bg-sol-ivory-light px-4 py-3">
              <summary className="cursor-pointer text-[0.9375rem] font-semibold text-sol-ink">
                {t("q.postal.hint")}
              </summary>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <TextField
                    id="q-postal"
                    label={t("q.postal.placeholder")}
                    value={postal}
                    inputMode="text"
                    maxLength={12}
                    placeholder={t("q.postal.placeholder")}
                    onChange={setPostal}
                  />
                </div>
                <button
                  type="button"
                  onClick={fillFromPostal}
                  disabled={postalBusy || !postal.trim()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-sol-navy bg-sol-navy px-5 text-[1rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft disabled:opacity-50"
                >
                  {postalBusy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {t("q.postal.find")}
                </button>
              </div>
              {postalError && (
                <p role="alert" className="mt-2 text-[0.9375rem] text-sol-warning">
                  {postalError}
                </p>
              )}
            </details>
          )}
        </>
      )}
    </ScreenBody>
  );
}

/** Institution search: real, country-scoped results with a typed fallback, so
 * an unlisted or foreign institution never blocks the founder. */
function InstitutionField() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const home = answers.country ?? "India";
  const searchCountry = answers.institutionCountry ?? home;
  const [query, setQuery] = useState(answers.institutionName ?? "");
  const [results, setResults] = useState<InstitutionSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [changeCountry, setChangeCountry] = useState(false);
  const debounced = useDebounced(query, 400);
  const skipSearch = useRef(true);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (debounced.trim().length < 2 || debounced === answers.institutionName) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchInstitutions({ data: { query: debounced.trim(), countryName: searchCountry } })
      .then((r) => !cancelled && setResults(r))
      .catch((err) => console.error("[institution] search failed:", err))
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, searchCountry, answers.institutionName]);

  const exact = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());
  const countryOptions = useMemo(
    () => COUNTRY_OPTIONS.map((c) => ({ id: c.name, label: L.country(c.name) })),
    [L],
  );

  return (
    <Question label={t("q.institution.label")} helper={t("q.institution.helper")} optional>
      <div className="relative flex flex-col gap-2">
        <div className="relative">
          <TextField
            id="q-institution"
            testId="input-institution"
            label={t("q.institution.label")}
            hideLabel
            value={query}
            maxLength={120}
            autoComplete="off"
            placeholder={t("q.institution.search")}
            onChange={(v) => {
              setQuery(v);
              setOpen(true);
              if (v.trim() === "") {
                setAnswer("institutionName", undefined);
                setAnswer("institutionManual", undefined);
              }
            }}
          />
          <span className="pointer-events-none absolute right-4 top-3.5 text-sol-secondary">
            {searching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
          </span>
        </div>
        {open && query.trim().length >= 2 && (results.length > 0 || !exact) && (
          <ul
            role="listbox"
            className="z-20 max-h-64 w-full overflow-y-auto rounded-2xl border border-sol-border bg-sol-surface py-1 shadow-lg"
          >
            {results.map((r) => (
              <li key={`${r.name}-${r.country}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center px-4 py-2 text-left text-[1rem] text-sol-ink hover:bg-sol-violet-soft"
                  onClick={() => {
                    setQuery(r.name);
                    setAnswer("institutionName", r.name);
                    setAnswer("institutionCountry", r.country);
                    setAnswer("institutionManual", false);
                    setOpen(false);
                    setResults([]);
                  }}
                >
                  {r.name}
                </button>
              </li>
            ))}
            {!exact && (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center px-4 py-2 text-left text-[1rem] font-semibold text-sol-violet-deep hover:bg-sol-violet-soft"
                  onClick={() => {
                    const name = query.trim();
                    setAnswer("institutionName", name);
                    setAnswer("institutionCountry", searchCountry);
                    setAnswer("institutionManual", true);
                    setOpen(false);
                  }}
                >
                  {t("q.institution.notListed")}: “{query.trim()}”
                </button>
              </li>
            )}
          </ul>
        )}
        <p className="text-[0.9375rem] text-sol-secondary">
          {t("q.institution.searchingIn", { country: L.country(searchCountry) })}{" "}
          <button
            type="button"
            className="font-semibold text-sol-violet-deep underline-offset-4 hover:underline"
            onClick={() => setChangeCountry((v) => !v)}
          >
            {t("q.institution.otherCountry")}
          </button>
        </p>
        {changeCountry && (
          <ComboboxField
            id="q-institution-country"
            label={t("q.institution.pickCountry")}
            options={countryOptions}
            value={searchCountry}
            placeholder={t("q.country.placeholder")}
            searchPlaceholder={t("q.country.placeholder")}
            emptyLabel={t("q.skills.noMatches")}
            onChange={(id) => {
              setAnswer("institutionCountry", id);
              setChangeCountry(false);
              setResults([]);
            }}
          />
        )}
      </div>
    </Question>
  );
}

export function EducationScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const degree = DEGREE_LEVEL_EDUCATION.has(answers.education ?? "");

  return (
    <ScreenBody title={t("q.education.title")}>
      <Question label={t("q.education.label")}>
        <ChoiceGrid
          name="education"
          options={L.opts("education", EDUCATION_IDS)}
          value={answers.education}
          onChange={(id) => setAnswer("education", id)}
        />
        {answers.education === "other" && (
          <div className="mt-3">
            <TextField
              id="q-education-other"
              label={t("q.educationOther.label")}
              value={answers.educationOther ?? ""}
              maxLength={100}
              placeholder={t("q.educationOther.placeholder")}
              onChange={(v) => setAnswer("educationOther", v)}
            />
          </div>
        )}
      </Question>

      {degree && (
        <>
          <div className="flex flex-col gap-3">
            <ComboboxField
              id="q-major"
              testId="combo-major"
              label={t("q.major.label")}
              options={L.opts("major", MAJOR_IDS)}
              value={answers.major}
              placeholder={t("common.chooseOne")}
              searchPlaceholder={t("common.search")}
              emptyLabel={t("q.skills.noMatches")}
              onChange={(id) => setAnswer("major", id)}
            />
            {answers.major === "other" && (
              <TextField
                id="q-major-other"
                label={t("q.majorOther.label")}
                value={answers.majorOther ?? ""}
                maxLength={100}
                placeholder={t("q.majorOther.placeholder")}
                onChange={(v) => setAnswer("majorOther", v)}
              />
            )}
          </div>
          <InstitutionField />
        </>
      )}

      {answers.status === "college_student" && (
        <Question label={t("q.studyYear.label")}>
          <ChoiceGrid
            name="studyYear"
            columns={3}
            options={L.opts("study_year", STUDY_YEAR_IDS)}
            value={answers.studyYear}
            onChange={(id) => setAnswer("studyYear", id)}
          />
        </Question>
      )}
    </ScreenBody>
  );
}

export function LanguagesTimeScreen() {
  const { t } = useLocale();
  const L = useLabels();
  const { answers, setAnswer } = useConsultation();
  const [custom, setCustom] = useState("");
  const languages = answers.languages ?? [];
  const library = LANGUAGE_LIBRARY.filter((l) => l in LANGUAGE_CODES);
  const extras = languages.filter((l) => !library.includes(l));

  function toggle(name: string) {
    setAnswer(
      "languages",
      languages.includes(name) ? languages.filter((l) => l !== name) : [...languages, name],
    );
  }

  function addCustom() {
    const name = custom.trim();
    if (!name || languages.includes(name)) return;
    setAnswer("languages", [...languages, name]);
    setCustom("");
  }

  return (
    <ScreenBody title={t("q.languagesTime.title")}>
      <Question label={t("q.languages.label")} helper={t("q.languages.helper")}>
        <MultiGrid
          name="language"
          columns={3}
          options={library.map((name) => ({ id: name, label: L.language(name) }))}
          value={languages}
          onToggle={toggle}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {extras.map((name) => (
            <Chip key={name} onRemove={() => toggle(name)} removeLabel={t("common.remove")}>
              {name}
            </Chip>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addCustom();
          }}
        >
          <div className="flex-1">
            <TextField
              id="q-language-custom"
              label={t("q.languages.search")}
              hideLabel
              value={custom}
              maxLength={40}
              placeholder={t("common.add")}
              onChange={setCustom}
            />
          </div>
          <button
            type="submit"
            disabled={!custom.trim()}
            className="h-12 rounded-2xl border border-sol-border bg-sol-surface px-5 text-[1rem] font-semibold text-sol-ink hover:border-sol-violet/45 disabled:opacity-50"
          >
            {t("common.add")}
          </button>
        </form>
      </Question>

      <Question label={t("q.hours.label")} helper={t("q.hours.helper")}>
        <ChoiceGrid
          name="hours"
          columns={3}
          options={L.opts("hours", HOURS_IDS)}
          value={answers.weeklyHours}
          onChange={(id) => setAnswer("weeklyHours", id)}
        />
      </Question>
    </ScreenBody>
  );
}
