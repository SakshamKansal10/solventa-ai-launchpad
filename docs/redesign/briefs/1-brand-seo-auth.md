# Task: one consistent Solventia brand across the site, Google Search and Google sign-in

You are working in the Solventia codebase (solventia.in).

**Branch rule:** work only on the git branch `redesign-v2`. If you are on any other branch, stop and tell me. Commit after each lettered section. Never commit to `main`, never force-push.

## What is wrong today

- The logo is different in different places. The landing header shows the S mark, "SOLVENTIA" and the tagline "VALIDATE · BUILD · ELEVATE". The dashboard shows the mark and name with no tagline. The icon Google shows beside the search result is a different drawing of the S.
- Google Search shows the site name as "solventia.in" instead of "Solventia", and shows no sub-links under the result.
- Google sign-in says "Sign in to continue to `<random-id>.supabase.co`" instead of Solventia.

## Step 1: audit, then report before editing

List every place the logo, name or tagline is rendered (landing header and footer, cinematic intro, consultation flow, sign-in, dashboard, loading and building screens, 404, emails, `<title>` tags, meta tags, manifest, favicon files, Open Graph image). For each, say which version it uses. Also report: the framework and router, how metadata is set, whether the landing page content is server-rendered or only appears after JavaScript loads, and how Google sign-in is started (which Supabase method, which redirect URL). Then continue.

## A. One logo component

- Create a single `Logo` component (mark + "SOLVENTIA" + tagline "VALIDATE · BUILD · ELEVATE" with the gold dots), drawn from one source SVG. Use the landing header version as the master. Delete or redirect every other copy.
- Use it on every page listed in the audit, at every screen width. On narrow screens scale the lockup down, but keep the tagline visible. If it cannot fit beside the navigation, move the navigation, not the tagline.
- Light and dark variants come from the same component through a prop, not from separate files.

## B. Favicon and app icons from the same mark

- Generate from the master mark: `favicon.ico` (48×48), `icon.svg` (square), `icon-96.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180×180). Square, with enough padding to read at 16px.
- Reference them with `<link rel="icon">` in the home page head. Keep the URLs stable and make sure `robots.txt` does not block them.
- Web manifest: `name` "Solventia", `short_name` "Solventia", theme and background colours from the landing page.

## C. Site name for Google

- On the home page only, add one `WebSite` JSON-LD block: `"name": "Solventia"`, `"alternateName": ["Solventia.in"]`, `"url": "https://solventia.in/"`.
- Add `<meta property="og:site_name" content="Solventia">` site-wide.
- Titles: home page title starts with "Solventia" and stays under 60 characters. Every other page uses "Page name | Solventia". Every page gets its own meta description and one `<h1>`.
- One canonical host. Redirect `http` to `https` and `www` to non-`www` (or the reverse, whichever is already primary) with 301s, and set `<link rel="canonical">` on every public page.
- Replace the Open Graph and Twitter image (currently the app icon) with a proper 1200×630 image that shows the logo lockup and the home page headline.

## D. Make sub-links possible

Google decides on its own whether to show sub-links under a result. They cannot be switched on. Make the site eligible:

- The landing page's real content (headline, section headings, navigation, footer) must be in the server-rendered HTML, not only visible after the cinematic script loads.
- Header and footer navigation must be plain `<a href>` links to real pages: How it works, For organizations, About, and the consultation start. Each of those pages needs a unique title, description and `<h1>`.
- There are two routes for starting the consultation (`/consultation` and `/find-my-business-idea`). Keep one and 301-redirect the other.
- Add `sitemap.xml` listing every public page and `robots.txt` that points to it. Mark dashboard, auth and API routes `noindex`.

## E. Google sign-in that says Solventia

The consent screen shows the Supabase project domain because the OAuth redirect goes to that domain. Check the current Supabase "Sign in with Google" documentation first, then:

1. Add Google's own sign-in button (Google Identity Services) on the sign-in page and exchange the returned ID token with `supabase.auth.signInWithIdToken({ provider: 'google', token })`. The authorised JavaScript origin is then `https://solventia.in`, not the Supabase domain. Keep the existing redirect flow working until the new one is tested, then remove the old button.
2. Tell me exactly what the Google popup shows after this change. If it still shows the Supabase domain, stop and report. The remaining fix is on my side (Google Cloud branding verification or a Supabase custom domain).
3. Make sure `/privacy` and `/terms` exist, are public and are linked in the footer. Google needs them for brand verification.
4. Write `docs/google-auth-owner-checklist.md` with the exact values I must enter in Google Cloud: app name "Solventia", support email, logo file path, home page URL, privacy and terms URLs, authorised domain `solventia.in`, authorised JavaScript origins, redirect URIs.

## F. Find and fix other inconsistencies

Look for and fix: mixed names for the same thing (the landing preview says "Proof", the dashboard says "Evidence": use "Proof" everywhere), header buttons that differ between pages ("Sign In" on some, "Dashboard" on others, without reason), old dark-theme leftovers that clash with the current light landing page, missing `lang` attributes for the Hindi version, wrong footer year, dead links, and a missing or unstyled 404 page.

## Report back

A table of every inconsistency found and what you did, the file `docs/google-auth-owner-checklist.md`, and a list of what only I can do outside the code.
