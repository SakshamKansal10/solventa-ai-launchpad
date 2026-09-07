import { useEffect, useRef, useState } from "react";
import { Check, GraduationCap, Loader2, Search } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-store";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "./SearchableSelect";
import { searchInstitutions, type InstitutionSuggestion } from "@/lib/actions/institutions";
import { COUNTRY_NAMES } from "@/lib/location-data";
import { cn } from "@/lib/utils";

type Mode = "search" | "choose-country" | "manual";

/**
 * Country-scoped searchable university/college lookup (real data from a
 * free public source, searched server-side — see actions/institutions.ts)
 * with two fallbacks that mean a founder is never blocked: studying in a
 * different country than their main profile country, or an institution
 * that's genuinely not in the dataset (typed manually).
 */
export function InstitutionPicker({ homeCountry }: { homeCountry: string }) {
  const { answers, setAnswer, goNext } = useOnboarding();
  const [mode, setMode] = useState<Mode>("search");
  const [searchCountry, setSearchCountry] = useState(answers.institutionCountry ?? homeCountry);
  const [query, setQuery] = useState(answers.institutionName ?? "");
  const [results, setResults] = useState<InstitutionSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<InstitutionSuggestion | null>(
    answers.institutionName && !answers.institutionManual
      ? { name: answers.institutionName, country: answers.institutionCountry ?? homeCountry }
      : null,
  );
  const [manualName, setManualName] = useState(
    answers.institutionManual ? (answers.institutionName ?? "") : "",
  );
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== "search" || query.trim().length < 2 || selected) {
      setResults([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchInstitutions({
          data: { query: query.trim(), countryName: searchCountry },
        });
        setResults(found);
      } catch (err) {
        console.error("[institution] search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, mode, searchCountry, selected]);

  function commitSelection(inst: InstitutionSuggestion) {
    setAnswer("institutionName", inst.name);
    setAnswer("institutionCountry", inst.country);
    setAnswer("institutionManual", false);
    goNext();
  }

  function commitManual() {
    if (!manualName.trim()) return;
    setAnswer("institutionName", manualName.trim());
    setAnswer("institutionCountry", searchCountry);
    setAnswer("institutionManual", true);
    goNext();
  }

  if (mode === "choose-country") {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
        <p className="text-[0.85rem] text-muted-foreground">
          Which country is your institution in?
        </p>
        <SearchableSelect
          options={COUNTRY_NAMES}
          value={searchCountry}
          onChange={(v) => {
            setSearchCountry(v);
            setSelected(null);
            setQuery("");
            setMode("search");
          }}
          placeholder="Search countries…"
        />
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
        <Input
          autoFocus
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commitManual()}
          placeholder="Your institution's name"
          className="h-14 w-full rounded-xl border-border bg-card px-5 text-center text-lg shadow-sm"
        />
        <p className="text-[0.78rem] text-muted-foreground">In {searchCountry}.</p>
        <PremiumButton
          type="button"
          tone="solid"
          shape="rounded"
          size="lg"
          onClick={commitManual}
          disabled={!manualName.trim()}
        >
          Continue
        </PremiumButton>
        <button
          type="button"
          onClick={() => setMode("search")}
          className="text-[0.82rem] text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          Search instead
        </button>
      </div>
    );
  }

  // mode === "search"
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      {selected ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card p-6 text-center">
          <GraduationCap className="size-6 text-accent" aria-hidden="true" />
          <div>
            <p className="font-display text-lg font-semibold text-primary">{selected.name}</p>
            <p className="mt-0.5 text-[0.85rem] text-muted-foreground">{selected.country}</p>
          </div>
          <div className="flex items-center gap-3">
            <PremiumButton
              type="button"
              tone="solid"
              shape="rounded"
              size="sm"
              onClick={() => commitSelection(selected)}
            >
              <Check className="size-4" aria-hidden="true" />
              Continue
            </PremiumButton>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
              className="text-[0.85rem] font-medium text-muted-foreground hover:text-primary"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search colleges and universities…"
              className="h-14 rounded-xl border-border bg-card px-5 pr-10 text-lg shadow-sm"
            />
            {searching ? (
              <Loader2
                className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            {showResults && results.length > 0 && (
              <ul className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                {results.map((r) => (
                  <li key={`${r.name}-${r.country}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setShowResults(false);
                      }}
                      className={cn(
                        "block w-full px-4 py-2.5 text-left text-[0.88rem] text-foreground hover:bg-secondary",
                      )}
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-center text-[0.78rem] text-muted-foreground">
            Searching in {searchCountry}.
          </p>
          <div className="flex flex-col items-center gap-2 text-[0.82rem]">
            <button
              type="button"
              onClick={() => setMode("choose-country")}
              className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              My institution is in a different country
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              My institution isn&rsquo;t listed
            </button>
          </div>
        </>
      )}
    </div>
  );
}
