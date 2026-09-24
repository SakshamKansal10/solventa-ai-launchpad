import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { getInitialLocale } from "@/lib/actions/locale";
import { LocaleProvider, useTranslator } from "@/lib/i18n/LocaleProvider";
import { DEFAULT_LOCALE, readLocaleFromCookieString, type Locale } from "@/lib/i18n/locale";

/** SSR reads the language cookie on the server; client-side navigations read
 * document.cookie. Either way the very first paint is already in the reader's
 * language — no flash of English for a Hindi reader. */
async function resolveLocale(): Promise<Locale> {
  if (typeof window === "undefined") return (await getInitialLocale()) ?? DEFAULT_LOCALE;
  return readLocaleFromCookieString(document.cookie) ?? DEFAULT_LOCALE;
}

function NotFoundComponent() {
  const t = useTranslator();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sol-pearl px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl font-semibold text-sol-ink">404</p>
        <h1 className="sol-h2 mt-4">{t("common.notFoundTitle")}</h1>
        <p className="mt-2 text-[1.0625rem] text-sol-secondary">{t("common.notFoundBody")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-sol-navy px-6 text-[1rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
          >
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useTranslator();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sol-pearl px-4">
      <div className="max-w-md text-center">
        <h1 className="sol-h2">{t("common.pageDidntLoad")}</h1>
        <p className="mt-2 text-[1.0625rem] text-sol-secondary">{t("common.pageDidntLoadBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-sol-navy px-6 text-[1rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
          >
            {t("common.retry")}
          </button>
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-sol-border bg-sol-surface px-6 text-[1rem] font-semibold text-sol-ink transition-colors hover:border-sol-violet/45"
          >
            {t("common.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => ({ locale: await resolveLocale() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Solventia" },
      { name: "application-name", content: "Solventia" },
      { name: "apple-mobile-web-app-title", content: "Solventia" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Solventia" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        // Latin display + UI faces, plus Devanagari serif/sans so Hindi text
        // never falls back to an arbitrary system font.
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,600&family=Manrope:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@500;600;700&family=Dancing+Script:wght@600;700&display=swap",
      },
      // ICO first (the classic default browsers fall back to), then the
      // exact square PNG sizes Google's own favicon guidelines ask for —
      // all three derived from the same official Solventia mark, never a
      // different icon per size. No stray/duplicate favicon declaration
      // anywhere else in this app competes with these.
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { rel: "icon", href: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { locale } = Route.useRouteContext();
  return (
    <html lang={locale ?? DEFAULT_LOCALE}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, locale } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale={locale}>
        {/* Honour the OS "reduce motion" setting for every motion() animation. */}
        <MotionConfig reducedMotion="user">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster position="bottom-right" />
        </MotionConfig>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
