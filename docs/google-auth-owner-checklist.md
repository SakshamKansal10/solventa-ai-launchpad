# Google sign-in branding — owner checklist

Why Google says "to continue to dcnurhuxgdzxruqsjglx.supabase.co": the app uses Supabase's
redirect flow (`signInWithOAuth`), so the OAuth redirect goes to the Supabase project domain and
Google names that domain unless the OAuth app's branding is verified. These settings are only
reachable from the Google Cloud and Supabase consoles.

## 1. Google Cloud Console → Google Auth Platform (APIs & Services → OAuth consent screen)

**Branding**
| Field | Value |
|---|---|
| App name | `Solventia` |
| User support email | `solventia.in@gmail.com` |
| App logo | a 120×120 square PNG of the S mark (master: `src/assets/brand/s-logo.svg`; `public/icon-512.png` downscaled works) |
| Application home page | `https://solventia.in` |
| Application privacy policy link | `https://solventia.in/privacy` |
| Application terms of service link | `https://solventia.in/terms` |
| Authorized domains | `solventia.in` and `supabase.co` (the redirect still passes through `dcnurhuxgdzxruqsjglx.supabase.co`) |
| Developer contact email | `solventia.in@gmail.com` |

Then **Verify branding / Submit for verification**. Until Google approves it, the chooser can
keep showing the Supabase domain.

**Clients → the Web client used by Supabase**
| Field | Value |
|---|---|
| Authorized JavaScript origins | `https://solventia.in` |
| Authorized redirect URIs | `https://dcnurhuxgdzxruqsjglx.supabase.co/auth/v1/callback` |

## 2. Supabase → Authentication → URL configuration
| Field | Value |
|---|---|
| Site URL | `https://solventia.in` |
| Redirect URLs | `https://solventia.in/auth/callback` (and `https://solventia.in/**` if other return paths are used) |

## 3. Optional: remove the Supabase domain entirely
Either is enough; both are console/plan changes, not code:
- **Supabase custom domain** (paid add-on): e.g. `auth.solventia.in`. Add
  `https://auth.solventia.in/auth/v1/callback` to the Google client's redirect URIs and set
  `VITE_SUPABASE_URL` / `SUPABASE_URL` in Vercel to the custom domain.
- **Google Identity Services button** + `supabase.auth.signInWithIdToken` (code change, not built
  in this pass by the owner's instruction): the popup then belongs to `https://solventia.in`.
  It needs `VITE_GOOGLE_CLIENT_ID` in Vercel and the same client ID listed under Supabase →
  Authentication → Providers → Google → "Authorized Client IDs".

## How to check
Sign out, open https://solventia.in/sign-in in a private window, choose "Continue with Google".
The account chooser should read "to continue to Solventia".
