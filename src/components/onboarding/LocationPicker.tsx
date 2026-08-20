import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-store";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { Input } from "@/components/ui/input";
import { countryCodeFromName, POSTAL_LOOKUP_COUNTRY_CODES } from "@/lib/location-data";
import { lookupPostalCode, searchCities, type CitySuggestion } from "@/lib/actions/location";
import { cn } from "@/lib/utils";

type Mode = "postal-entry" | "confirming" | "manual";

/**
 * Handles state+city for whichever country was picked in the previous
 * step. Postal-code-first where that's reliable (India via the official
 * PIN API, ~60 other countries via Zippopotam), falling back to a plain
 * region + searchable-city flow everywhere else — and always available as
 * an explicit "Change" path even after a successful lookup, since a
 * detected value must never silently overwrite what the user meant.
 */
export function LocationPicker({ country }: { country: string }) {
  const { answers, setAnswer, goNext } = useOnboarding();
  const countryCode = countryCodeFromName(country);
  const supportsPostal = countryCode !== null && POSTAL_LOOKUP_COUNTRY_CODES.has(countryCode);

  const [mode, setMode] = useState<Mode>(supportsPostal ? "postal-entry" : "manual");
  const [postalInput, setPostalInput] = useState(answers.postalCode ?? "");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ city: string; state: string | null } | null>(null);

  const [manualState, setManualState] = useState(answers.state ?? "");
  const [manualCity, setManualCity] = useState(answers.city ?? "");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== "manual" || manualCity.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSearchingCity(true);
      try {
        const results = await searchCities({
          data: { query: manualCity.trim(), countryName: country },
        });
        setCitySuggestions(results);
      } catch (err) {
        console.error("[location] city search failed:", err);
      } finally {
        setSearchingCity(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [manualCity, mode, country]);

  async function handleLookup() {
    if (!postalInput.trim() || !countryCode) return;
    setLooking(true);
    setLookupError(null);
    try {
      const result = await lookupPostalCode({
        data: { countryCode, countryName: country, postalCode: postalInput.trim() },
      });
      if (!result || !result.city) {
        setLookupError(
          "We couldn't find that postal code — you can enter your city manually instead.",
        );
        setMode("manual");
        return;
      }
      setDetected({ city: result.city, state: result.state });
      setMode("confirming");
    } catch (err) {
      console.error("[location] lookup failed:", err);
      setLookupError(
        "Something went wrong looking that up — you can enter your city manually instead.",
      );
      setMode("manual");
    } finally {
      setLooking(false);
    }
  }

  function confirmDetected() {
    if (!detected) return;
    setAnswer("postalCode", postalInput.trim());
    setAnswer("state", detected.state ?? "");
    setAnswer("city", detected.city);
    goNext();
  }

  function changeDetected() {
    setManualState(detected?.state ?? "");
    setManualCity(detected?.city ?? "");
    setMode("manual");
  }

  function submitManual() {
    if (!manualCity.trim()) return;
    setAnswer("postalCode", postalInput.trim() || undefined);
    setAnswer("state", manualState.trim());
    setAnswer("city", manualCity.trim());
    goNext();
  }

  if (mode === "postal-entry") {
    return (
      <div className="flex flex-col items-center gap-4">
        <Input
          autoFocus
          inputMode="numeric"
          value={postalInput}
          onChange={(e) => setPostalInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder={countryCode === "IN" ? "e.g. 411001" : "Postal / ZIP code"}
          className="h-14 w-full max-w-xs rounded-xl border-border bg-card px-5 text-center text-lg shadow-sm"
        />
        <p className="text-[0.82rem] text-muted-foreground">
          We&rsquo;ll use this to find your city and region automatically.
        </p>
        {lookupError && <p className="text-[0.82rem] text-destructive">{lookupError}</p>}
        <div className="flex items-center gap-4">
          <PremiumButton
            type="button"
            tone="solid"
            shape="rounded"
            size="lg"
            onClick={handleLookup}
            disabled={!postalInput.trim() || looking}
          >
            {looking && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Find My Location
          </PremiumButton>
        </div>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className="text-[0.82rem] text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          I&rsquo;ll enter it manually
        </button>
      </div>
    );
  }

  if (mode === "confirming" && detected) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-5 rounded-2xl border border-border/70 bg-card p-6 text-center">
        <MapPin className="size-6 text-accent" aria-hidden="true" />
        <p className="text-[0.82rem] font-semibold uppercase tracking-wide text-muted-foreground">
          We found your location
        </p>
        <div className="flex flex-col gap-1">
          <p className="font-display text-xl font-semibold text-primary">{detected.city}</p>
          {detected.state && (
            <p className="text-[0.92rem] text-muted-foreground">{detected.state}</p>
          )}
          <p className="text-[0.85rem] text-muted-foreground">{country}</p>
        </div>
        <p className="text-[0.85rem] text-foreground">Is this correct?</p>
        <div className="flex items-center gap-3">
          <PremiumButton
            type="button"
            tone="solid"
            shape="rounded"
            size="sm"
            onClick={confirmDetected}
          >
            <Check className="size-4" aria-hidden="true" />
            Yes, continue
          </PremiumButton>
          <button
            type="button"
            onClick={changeDetected}
            className="text-[0.85rem] font-medium text-muted-foreground hover:text-primary"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  // mode === "manual"
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="loc-state" className="text-[0.82rem] font-medium text-muted-foreground">
          State / region
        </label>
        <Input
          id="loc-state"
          value={manualState}
          onChange={(e) => setManualState(e.target.value)}
          placeholder="e.g. Maharashtra"
          className="h-12 rounded-xl border-border bg-card px-4"
        />
      </div>
      <div className="relative flex flex-col gap-1.5">
        <label htmlFor="loc-city" className="text-[0.82rem] font-medium text-muted-foreground">
          City
        </label>
        <div className="relative">
          <Input
            id="loc-city"
            value={manualCity}
            onChange={(e) => {
              setManualCity(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search for your city…"
            className="h-12 rounded-xl border-border bg-card px-4 pr-9"
          />
          {searchingCity ? (
            <Loader2
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <Search
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        {showSuggestions && citySuggestions.length > 0 && (
          <ul className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {citySuggestions.map((s) => (
              <li key={s.displayLabel}>
                <button
                  type="button"
                  onClick={() => {
                    setManualCity(s.name);
                    if (s.state) setManualState(s.state);
                    setShowSuggestions(false);
                  }}
                  className={cn(
                    "block w-full px-4 py-2.5 text-left text-[0.9rem] text-foreground hover:bg-secondary",
                  )}
                >
                  {s.displayLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PremiumButton
        type="button"
        tone="solid"
        shape="rounded"
        size="lg"
        className="mt-2 self-center"
        onClick={submitManual}
        disabled={!manualCity.trim()}
      >
        Continue
      </PremiumButton>
    </div>
  );
}
