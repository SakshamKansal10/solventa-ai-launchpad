import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DICTIONARY, LOCALE_STORAGE_KEY, type Locale } from "./dictionary";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Falls back to the English string (never a blank/missing key) when
   * a key hasn't been translated into the current locale yet — real
   * partial-coverage safety, not a hard error, since large parts of the
   * app (dashboard, roadmap, AI-generated content) aren't in the
   * dictionary yet. */
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Read the saved preference once, client-side only — SSR always
  // renders English first (no access to localStorage on the server),
  // then hydrates to the founder's real saved choice.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === "en" || saved === "hi") setLocaleState(saved);
    } catch {
      // localStorage can throw in a private/locked-down browser — English stays the default.
    }
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Best-effort persistence only — the switch still works for this page view either way.
    }
  }

  function t(key: string): string {
    return DICTIONARY[locale][key] ?? DICTIONARY.en[key] ?? key;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
