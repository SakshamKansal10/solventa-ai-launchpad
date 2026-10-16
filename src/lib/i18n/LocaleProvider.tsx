import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { getCurrentUser, type CurrentUserDTO } from "@/lib/actions/auth";
import { saveLocalePreference } from "@/lib/actions/locale";
import {
  buildLocaleCookie,
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_STORAGE_KEY,
  readLocaleFromCookieString,
  type Locale,
} from "./locale";
import { translate, translatePlural, type MessageKey, type MessageParams } from "./index";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Typed lookup — the key must exist in the English catalogue. */
  t: (key: MessageKey, params?: MessageParams) => string;
  /** Dynamic lookup for keys assembled at runtime (option ids etc.). Falls
   * back to English, then to `fallback`, then to the key itself — never
   * blank. */
  td: (key: string, params?: MessageParams, fallback?: string) => string;
  /** `${key}.one` / `${key}.other`. */
  tp: (key: string, count: number, params?: MessageParams) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function persistClientSide(locale: Locale) {
  try {
    document.cookie = buildLocaleCookie(locale);
  } catch {
    // Cookies blocked: SSR language will just follow localStorage after hydration.
  }
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode / storage disabled — the switch still works for this view.
  }
  document.documentElement.lang = locale;
}

/** `initialLocale` comes from the SSR cookie (see __root.tsx) so the very
 * first paint is already in the reader's language. localStorage is only a
 * fallback for browsers that never got the cookie (existing visitors from
 * before it shipped). Once signed in, profiles.locale is the source of
 * truth and follows the user across devices. */
export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const syncedUserRef = useRef<string | null>(null);
  const userChoseRef = useRef(false);

  // Cache-only subscription: the header/shell own the actual fetch, this just
  // lets us react when the signed-in user's stored locale arrives.
  const currentUser = useQuery<CurrentUserDTO | null>({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(),
    enabled: false,
  });
  const userId = currentUser.data?.id ?? null;
  const storedLocale = currentUser.data?.locale ?? null;

  useEffect(() => {
    // Existing visitors (no cookie yet) keep their localStorage choice.
    if (initialLocale !== DEFAULT_LOCALE) return;
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(saved) && saved !== DEFAULT_LOCALE) {
        setLocaleState(saved);
        document.documentElement.lang = saved;
        document.cookie = buildLocaleCookie(saved);
      }
    } catch {
      // Storage unavailable — English stays.
    }
  }, [initialLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      userChoseRef.current = true;
      setLocaleState(next);
      persistClientSide(next);
      if (userId) {
        void saveLocalePreference({ data: { locale: next } }).catch((err) => {
          console.error("[locale] could not persist preference:", err);
        });
      }
    },
    [userId],
  );

  // Signed-in reconciliation, once per user per page load.
  useEffect(() => {
    if (!userId || syncedUserRef.current === userId) return;
    syncedUserRef.current = userId;
    if (storedLocale && storedLocale !== locale && !userChoseRef.current) {
      setLocaleState(storedLocale);
      persistClientSide(storedLocale);
    } else if (!storedLocale && locale !== DEFAULT_LOCALE) {
      // The visitor chose Hindi before creating an account — keep it.
      void saveLocalePreference({ data: { locale } }).catch(() => undefined);
    }
  }, [userId, storedLocale, locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      td: (key, params, fallback) => {
        const hit = translate(locale, key, params);
        return hit === key && fallback !== undefined ? fallback : hit;
      },
      tp: (key, count, params) => translatePlural(locale, key, count, params),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** For components that can render OUTSIDE the provider (the root error/404
 * screens replace the whole tree, provider included). Falls back to the
 * language cookie, then English — never throws. */
export function useTranslator(): (key: MessageKey, params?: MessageParams) => string {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx.t;
  const locale =
    (typeof document !== "undefined" ? readLocaleFromCookieString(document.cookie) : null) ??
    DEFAULT_LOCALE;
  return (key, params) => translate(locale, key, params);
}
