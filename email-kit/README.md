# Solventia email kit

One layout for every email. Table-based HTML with inline styles (Gmail, Outlook, Apple Mail), mobile and dark-mode rules in the `<style>` block.

## Files

- `brand/email-logo.png`: the S on a white rounded tile, 192x192 (shown at 40x40). Put it in `public/brand/` so it is served at `https://solventia.in/brand/email-logo.png`. Every template points to that URL.
- `supabase/*.html`: paste into Supabase -> Authentication -> Email Templates. They use Supabase's own variables (`{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .NewEmail }}`).
- `app/*.html`: reference markup for the emails the app sends. Placeholders are `{{snake_case}}`; the app fills them.

## Subjects

- `supabase/magic-link.html`: Your Solventia sign-in code: {{ .Token }}
- `supabase/confirm-signup.html`: Welcome to Solventia. Your code: {{ .Token }}
- `supabase/reset-password.html`: Reset your Solventia password
- `supabase/change-email.html`: Confirm your new email for Solventia
- `app/ideas-ready.html`: {{first_name}}, your three business directions are ready
- `app/weekly-reminder.html`: Week {{week_number}}: {{mission_title}}
- `app/weekly-reminder.hi.html`: हफ़्ता {{week_number}}: {{mission_title}}

## Rules of the layout

- Width 600px, one white card, 40px side padding (24px on phones). Everything sits on one left edge.
- Header: logo 40px + SOLVENTIA wordmark as live text. Under it a 2px hairline: 56px gold, the rest grey.
- Body order: small blue label, headline (28px / 24px on phones), text 16px, one panel if needed, ONE navy button.
- Footer: help line with sol@solventia.in, why they got the email, tagline, links. Reminder emails add 'Change reminders'.
- Colours: navy `#14214C`, ink `#0E1A40`, text `#3B4666`, muted `#6B7591`, blue `#2F55D4`, gold `#D8A93F`, page `#F3F5FA`, panel `#F4F7FE`.
- Logo is PNG, never SVG (Gmail does not show SVG). Always keep the alt text.
- The OTP text says the code expires in 1 hour. Make it match Supabase -> Authentication -> Email OTP expiration.
- New users who sign in with a code get the 'Confirm signup' template, returning users get 'Magic Link'. Both must contain `{{ .Token }}`.
