# Part 1 — brand, SEO, Google sign-in: audit and plan

## Stack (detected)
TanStack Start + TanStack Router (file routes, SSR), React 19, Vite, Tailwind v4, Nitro `vercel`
preset → Vercel (production deploys from `main`; every pushed branch gets a preview).
Metadata: each route's `head()` (meta, links, scripts) plus `__root.tsx` defaults.
Landing `/`: server-rendered (`<h1>`, the seven scene `<h2>`s, `<nav aria-label="Primary">` with
plain `<a href>` links and the footer are in the SSR HTML before any script runs).
Google sign-in: `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo:
origin + path } })` in `src/components/solventia/GoogleSignInButton.tsx` (redirect flow through
`<project>.supabase.co/auth/v1/callback`, which is why Google names the Supabase host).

## Where the brand is rendered (before)

| Place | File | Version |
|---|---|---|
| Landing bar (film) | `cinematic-home/nav/CinematicNav.tsx` | `BrandLockup nav` — tagline hidden < 640px |
| Landing film identity | `cinematic-home/overlay/CinematicOverlay.tsx` | Mark + wordmark + tagline (animated parts) |
| Landing static fallback | `cinematic-home/fallback/StaticFallback.tsx` | Mark + wordmark + tagline |
| Public pages header | `solventia/Header.tsx` | `BrandLockup nav` — tagline hidden < 640px |
| Footer | `solventia/Footer.tsx` | `BrandLockup footer` with tagline |
| Product preview in the film | `cinematic-home/overlay/ProductPreview.tsx` | lockup, no tagline |
| Consultation | `consultation/ConsultationShell.tsx` | mark only (phone), lockup no tagline (desktop) |
| Generation visual | `consultation/GenerationVisual.tsx` | mark (decorative, centre of the animation) |
| Sign-in | `routes/sign-in.tsx` | mark only |
| Auth callback | `routes/auth/callback.tsx` | mark only |
| Dashboard | `founder/DashboardShell.tsx` | **old PNG drawing** `assets/solventia-mark.png` + text "SOLVENTIA", no tagline |
| Ask Sol header | `founder/AskSol.tsx` | mark (avatar-sized emblem) |
| Building screen | `dashboard_/roadmap/building.tsx` | lockup, no tagline |
| 404 / error | `routes/__root.tsx` | no logo |
| Emails | `lib/email/components.ts` | `icon-512.png` (old drawing) + "SOLVENTIA", no tagline |
| Favicon, apple icon, manifest icons, OG image | `public/*` | **old PNG drawing**; OG = 512 square icon |
| Old homepage sections (unused) | `solventia/{Hero,FounderSignal,FinalCTA,AdaptiveRoadmap,…}` | old PNG |

## Plan
- **A.** `Logo` in `components/brand/Brand.tsx`: master = the landing bar lockup (S mark SVG +
  SOLVENTIA + VALIDATE · BUILD · ELEVATE, gold dots), `tone="light"|"dark"`, `size`, tagline
  always shown (scaled on narrow screens). Same `data-brand-part` markup so the film's hand-over
  keeps working. Used in: landing bar, public header, footer, consultation, sign-in, auth
  callback, dashboard shell, building screen, 404/error. Old PNG removed from every rendered
  place; unused old homepage sections deleted (recoverable from `before-redesign-v2`).
- **B.** Rasterise the master SVG (Chromium) into favicon.ico 48 (PNG-in-ICO), icon.svg (square,
  padded), icon-96/192/512, apple-touch-icon 180; manifest name/short_name/colours from the landing.
- **C.** Home title "Solventia — …" under 60 chars; `WebSite` JSON-LD with
  `alternateName: ["Solventia.in"]`; `og:site_name` already site-wide; "Page | Solventia" titles,
  descriptions, one `<h1>`, canonical on every public page; 1200×630 OG image (lockup + headline).
  Host: Vercel already 308-redirects http→https and www→apex (permanent; equivalent to 301).
- **D.** Landing content already in SSR HTML; nav/footer are `<a href>`. Keep `/consultation` as
  the single start (all CTAs use it), make it indexable with its own title/description/h1/
  canonical, 301 `/find-my-business-idea` → `/consultation`. Sitemap = public pages; robots
  points to it; dashboard/auth/review/API stay `noindex` and disallowed.
- **E.** Google Identity Services button + `signInWithIdToken` (nonce), enabled when
  `VITE_GOOGLE_CLIENT_ID` is set; the redirect button stays as the fallback until tested.
  `/privacy`, `/terms` public and in the footer. `docs/google-auth-owner-checklist.md`.
- **F.** "Proof" everywhere (dashboard said "Evidence"), header buttons, `lang`, footer year,
  dead links, styled 404.
